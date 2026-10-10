import CSL from "citeproc";
import { cslData } from "./csl-data";
const {
  mla,
  chicago,
  harvard,
  vancouver,
  acs,
  abnt,
  acm,
  ama,
  cse,
  nature,
  science,
} = cslData;
const en = cslData["en-US"],
  es = cslData["es-ES"],
  pt = cslData["pt-BR"];
import type { ReferenceRecord, ReferencePart } from "./academic";
export const cslStyles = {
  mla,
  chicago,
  harvard,
  vancouver,
  acs,
  abnt,
  acm,
  ama,
  cse,
  nature,
  science,
};
export type CslStyle = keyof typeof cslStyles;
export const isCslStyle = (style: string): style is CslStyle =>
  Object.hasOwn(cslStyles, style);
export const numberedStyle = (style: string) =>
  [
    "ieee",
    "iso690",
    "vancouver",
    "acs",
    "acm",
    "ama",
    "nature",
    "science",
  ].includes(style);
const date = (value?: string) => {
  const m = value?.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  return m
    ? { "date-parts": [m.slice(1).filter(Boolean).map(Number)] }
    : undefined;
};
export function cslItem(ref: ReferenceRecord): Record<string, unknown> {
  const type = {
    web: "webpage",
    book: "book",
    article: "article-journal",
    report: "report",
    thesis: "thesis",
    video: "motion_picture",
    dataset: "dataset",
    other: "document",
  }[ref.type];
  const authors = ref.author
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      const i = a.indexOf(",");
      return i < 0
        ? { literal: a }
        : { family: a.slice(0, i).trim(), given: a.slice(i + 1).trim() };
    });
  return {
    id: ref.id,
    type,
    title: ref.title || "[Obra sin título]",
    language: ref.language || "es-ES",
    author: authors,
    issued: date(ref.date || ref.year),
    accessed: date(ref.accessed),
    URL: ref.url,
    DOI: ref.doi?.replace(/^https?:\/\/doi\.org\//, ""),
    publisher: ref.publisher,
    "publisher-place": ref.place,
    "container-title": ref.journal || ref.site,
    volume: ref.volume,
    issue: ref.issue,
    page: ref.pages,
    edition: ref.edition,
  };
}
const decode = (s: string) =>
  s.replace(
    /&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi,
    (_, num: string, name: string) =>
      num
        ? String.fromCodePoint(Number(num.startsWith("x") ? "0" + num : num))
        : ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[
            name.toLowerCase()
          ] ?? ""),
  );
export function cslParts(html: string): ReferencePart[] {
  const parts: ReferencePart[] = [],
    stack: { italic: boolean; href?: string }[] = [{ italic: false }];
  for (const token of html.split(/(<[^>]*>)/g)) {
    if (!token) continue;
    if (token.startsWith("<")) {
      if (/^<\//.test(token)) {
        if (stack.length > 1) stack.pop();
      } else if (!/^<(?:br|hr)\b/.test(token)) {
        const prev = stack.at(-1)!,
          href = token.match(/href="([^"]+)"/)?.[1];
        stack.push({
          italic:
            prev.italic ||
            /^<(?:i|em)\b/.test(token) ||
            /font-style:\s*italic/.test(token),
          href:
            href && /^(https?:\/\/)/.test(decode(href))
              ? decode(href)
              : prev.href,
        });
      }
      continue;
    }
    const text = decode(token);
    if (text) parts.push({ text, ...stack.at(-1) });
  }
  if (parts[0]) parts[0].text = parts[0].text.trimStart();
  if (parts.at(-1)) parts.at(-1)!.text = parts.at(-1)!.text.trimEnd();
  return parts.filter((p) => p.text);
}
type Formatted = {
  ordered: string[];
  citations: Map<string, string>;
  references: Map<string, ReferencePart[]>;
  hanging: boolean;
  cite: (id: string, locator?: string) => string;
};
const cache = new Map<string, Formatted>();
export function formatCsl(refs: ReferenceRecord[], style: CslStyle): Formatted {
  const key = style + "|" + JSON.stringify(refs),
    cached = cache.get(key);
  if (cached) return cached;
  const items = new Map(refs.map((ref) => [ref.id, cslItem(ref)]));
  const engine = new CSL.Engine(
    {
      retrieveLocale: (lang) =>
        lang.startsWith("pt") ? pt : lang.startsWith("es") ? es : en,
      retrieveItem: (id) => items.get(id)!,
    },
    cslStyles[style],
    style === "abnt" ? "pt-BR" : "en-US",
  );
  engine.updateItems(refs.map((r) => r.id));
  engine.setOutputFormat("text");
  const citations = new Map(
    refs.map((r) => [r.id, engine.makeCitationCluster([{ id: r.id }])]),
  );
  engine.setOutputFormat("html");
  const bib = engine.makeBibliography(),
    references = new Map<string, ReferencePart[]>(),
    ordered: string[] = [];
  if (bib)
    for (const [i, ids] of bib[0].entry_ids.entries()) {
      for (const id of ids) {
        ordered.push(id);
        references.set(id, cslParts(bib[1][i]));
      }
    }
  const cite = (id: string, locator?: string) => {
    if (!items.has(id)) return "[Referencia no encontrada]";
    engine.setOutputFormat("text");
    return engine.makeCitationCluster([
      { id, ...(locator ? { locator, label: "page" } : {}) },
    ]);
  };
  const result = {
    citations,
    references,
    ordered,
    hanging: !!(bib && bib[0].hangingindent),
    cite,
  };
  if (cache.size >= 4) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
