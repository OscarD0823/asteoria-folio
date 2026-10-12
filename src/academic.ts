import type { PageLayout, RichNode } from "./flow";
import { extraAcademicPresets } from "./academic-catalog";
import {
  formatCsl,
  isCslStyle,
  numberedStyle,
  type CslStyle,
} from "./csl-format";

export type AcademicStyle = "free" | "apa" | "ieee" | "iso690" | CslStyle;
export type ReferenceType =
  | "web"
  | "book"
  | "article"
  | "report"
  | "thesis"
  | "video"
  | "dataset"
  | "other";
/** Enter personal names as `Surname, Initials`; separate authors with semicolons.
 * A corporate author can be entered as its complete name. Never inferred from a URL. */
export type ReferenceRecord = {
  id: string;
  type: ReferenceType;
  author: string;
  title: string;
  year: string;
  url?: string;
  site?: string;
  publisher?: string;
  doi?: string;
  accessed?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  edition?: string;
  place?: string;
  /** Date (as entered), used in the reference; year remains the citation year. */
  date?: string;
  /** Optional explicit short author, for an organization or ambiguous name. */
  shortAuthor?: string;
  /** A continuously changing web page needs a retrieval date in APA. */
  dynamic?: boolean;
  language?: string;
};
export type AcademicPreset = {
  label: string;
  description: string;
  layout?: PageLayout & { columns: number; columnGap: number };
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  pageNumberPosition?: "header-right" | "footer-center";
  firstLineIndent?: number;
  source?: string;
};
export const academicPresets: Record<AcademicStyle, AcademicPreset> = {
  free: { label: "Libre", description: "Formato personalizado." },
  apa: {
    label: "APA 7 · trabajo estudiantil",
    description:
      "Carta, márgenes de 2,54 cm, doble espacio, sangría de 1,27 cm y citas autor–año. Revisa las instrucciones de tu institución.",
    layout: {
      format: "letter",
      orientation: "portrait",
      top: 25.4,
      bottom: 25.4,
      left: 25.4,
      right: 25.4,
      header: "",
      footer: "",
      numbering: true,
      columns: 1,
      columnGap: 0,
    },
    fontFamily: "PrismaSerif",
    fontSize: 12,
    lineHeight: 2,
    pageNumberPosition: "header-right",
  },
  ieee: {
    label: "IEEE · conferencia",
    description:
      "Base orientativa de dos columnas con citas numeradas. Los márgenes y requisitos finales dependen de la conferencia o revista.",
    layout: {
      format: "letter",
      orientation: "portrait",
      top: 19.05,
      bottom: 25.4,
      left: 15.875,
      right: 15.875,
      header: "",
      footer: "",
      numbering: false,
      columns: 2,
      columnGap: 6.35,
    },
    fontFamily: "PrismaSerif",
    fontSize: 10,
    lineHeight: 1,
  },
  iso690: {
    label: "ISO 690 · bibliografía",
    description:
      "Referencias y citas numéricas configuradas según los elementos de ISO 690. Esta norma no fija una maquetación universal del trabajo.",
  },
  ...extraAcademicPresets,
};
export type DocumentEntry = {
  id: string;
  targetId: string;
  label: string;
  title: string;
  kind: "heading" | "figure" | "table" | "appendix" | "reference";
  path: number[];
  level?: number;
  number?: number;
  page?: number;
};
export type DocumentEntries = {
  contents: DocumentEntry[];
  figures: DocumentEntry[];
  tables: DocumentEntry[];
  appendices: DocumentEntry[];
};
export type CitationOccurrence = {
  id: string;
  refId: string;
  label: string;
  path: number[];
  blockId: string;
  context: string;
};
export type IndexKind =
  | "contents"
  | "figures"
  | "tables"
  | "appendices"
  | "references";

const clean = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const punctuation = (value: string) =>
  /[.!?]$/.test(value) ? value : value + ".";
const authors = (ref: ReferenceRecord) =>
  clean(ref.author).split(";").map(clean).filter(Boolean);
const authorText = (ref: ReferenceRecord) => {
  const names = authors(ref);
  return names.length < 2
    ? (names[0] ?? "")
    : names.slice(0, -1).join(", ") + ", & " + names[names.length - 1];
};
const ieeeAuthorText = (ref: ReferenceRecord) => {
  const names = authors(ref).map((name) => {
    const comma = name.indexOf(",");
    return comma >= 0
      ? name.slice(comma + 1).trim() + " " + name.slice(0, comma).trim()
      : name;
  });
  return names.length < 2
    ? names[0] || ""
    : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
};
const shortAuthor = (ref: ReferenceRecord) => {
  if (clean(ref.shortAuthor)) return clean(ref.shortAuthor);
  const names = authors(ref).map((name) => name.split(",")[0].trim());
  if (names.length >= 3) return names[0] + " et al.";
  if (names.length === 2) return names.join(" & ");
  return (
    names[0] ||
    clean(ref.title) ||
    `[${ref.type === "web" ? "Página web" : "Obra sin título"}]`
  );
};
const year = (ref: ReferenceRecord) => clean(ref.year) || "s. f.";
const title = (ref: ReferenceRecord) =>
  clean(ref.title) ||
  `[${ref.type === "web" ? "Página web" : "Obra sin título"}]`;

/** Accept only an explicitly entered HTTP(S) address. No fetch or metadata guessing. */
export function safeReferenceUrl(input: string): string {
  const value = input.trim();
  if (!value || /[\u0000-\u0020]/.test(value))
    throw new Error("Introduce una dirección web válida.");
  let url: URL;
  try {
    url = new URL(
      /^[a-z][a-z\d+.-]*:/i.test(value) ? value : "https://" + value,
    );
  } catch {
    throw new Error("Introduce una dirección web válida.");
  }
  if (
    !/^https?:$/.test(url.protocol) ||
    !url.hostname.includes(".") ||
    url.username ||
    url.password
  )
    throw new Error(
      "La referencia debe ser una dirección HTTP o HTTPS sin credenciales.",
    );
  return url.href;
}
function stableHash(text: string) {
  let hash = 2166136261;
  for (const letter of text)
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
export function referenceFromUrl(input: string, id?: string): ReferenceRecord {
  const url = safeReferenceUrl(input);
  return {
    id: id || "ref-" + stableHash(url),
    type: "web",
    author: "",
    title: "",
    year: "",
    url,
    site: new URL(url).hostname.replace(/^www\./, ""),
  };
}
export function missingReferenceFields(ref: ReferenceRecord): string[] {
  const fields: string[] = [];
  if (!clean(ref.author)) fields.push("autor");
  if (!clean(ref.title)) fields.push("título");
  if (!clean(ref.year)) fields.push("fecha");
  if (ref.type === "article" && !clean(ref.journal)) fields.push("revista");
  if (ref.type === "book" && !clean(ref.publisher)) fields.push("editorial");
  return fields;
}
const doiUrl = (value?: string) => {
  const doi = clean(value)
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
  return /^10\.\d{4,9}\/\S+$/i.test(doi) ? "https://doi.org/" + doi : "";
};
const resourceUrl = (ref: ReferenceRecord) => {
  if (doiUrl(ref.doi)) return doiUrl(ref.doi);
  try {
    return ref.url ? safeReferenceUrl(ref.url) : "";
  } catch {
    return "";
  }
};
export type ReferencePart = { text: string; italic?: boolean; href?: string };

/** Formats editable metadata; missing author/date/title are explicitly represented.
 * This is a common-source formatter, not a replacement for publisher validation. */
export function formatReferenceParts(
  ref: ReferenceRecord,
  style: AcademicStyle,
  number = 1,
  yearSuffix = "",
): ReferencePart[] {
  if (isCslStyle(style))
    return formatCsl([ref], style).references.get(ref.id) ?? [];
  const parts: ReferencePart[] = [];
  const add = (text: string, italic = false, href?: string) => {
    if (text)
      parts.push({
        text,
        ...(italic ? { italic: true } : {}),
        ...(href ? { href } : {}),
      });
  };
  const author = authorText(ref),
    source = resourceUrl(ref),
    date = (clean(ref.date) || year(ref)) + yearSuffix;
  if (style === "apa" || style === "free") {
    const bookEdition = ref.type === "book" && clean(ref.edition);
    if (author) {
      add(punctuation(author) + " (" + date + "). ");
      add(
        bookEdition ? title(ref).replace(/\.$/, "") : punctuation(title(ref)),
        ref.type !== "article",
      );
    } else {
      add(punctuation(title(ref)), ref.type !== "article");
      add(" (" + date + ").");
    }
    if (bookEdition) add(" (" + clean(ref.edition) + " ed.).");
    if (ref.type === "article") {
      if (clean(ref.journal)) add(" " + clean(ref.journal), true);
      if (clean(ref.volume)) add(", " + clean(ref.volume), true);
      if (clean(ref.issue)) add("(" + clean(ref.issue) + ")");
      if (clean(ref.pages)) add(", " + clean(ref.pages));
      if (ref.journal || ref.volume || ref.pages) add(".");
    } else {
      const publisher = clean(ref.publisher) || clean(ref.site);
      // APA omits the site/publisher when identical to the author.
      if (
        publisher &&
        publisher.toLocaleLowerCase("es") !== author.toLocaleLowerCase("es")
      )
        add(" " + punctuation(publisher));
    }
    if (ref.dynamic && clean(ref.accessed))
      add(" Recuperado el " + clean(ref.accessed) + ", de");
    if (source) add(" " + source, false, source);
  } else if (style === "ieee") {
    add("[" + number + "] ");
    if (author) add(ieeeAuthorText(ref).replace(/[,.]$/, "") + ", ");
    add(
      ref.type === "article" || ref.type === "web"
        ? `“${title(ref)},”`
        : punctuation(title(ref)),
      ref.type === "book",
    );
    const publication =
      clean(ref.journal) || clean(ref.publisher) || clean(ref.site);
    if (publication) add(" " + publication, ref.type === "article");
    if (ref.volume) add(", vol. " + clean(ref.volume));
    if (ref.issue) add(", no. " + clean(ref.issue));
    if (ref.pages) add(", pp. " + clean(ref.pages));
    add(", " + date + ".");
    if (clean(ref.accessed)) add(" Consultado: " + clean(ref.accessed) + ".");
    if (source) {
      add(" [En línea]. Disponible: ");
      add(source, false, source);
    }
  } else {
    add("[" + number + "] ");
    if (author) add(punctuation(author) + " ");
    add(punctuation(title(ref)), true);
    if (ref.type === "web" || ref.type === "video" || ref.type === "dataset")
      add(" [en línea].");
    const publication =
      clean(ref.journal) || clean(ref.publisher) || clean(ref.site);
    if (publication) add(" " + punctuation(publication));
    add(" " + date + ".");
    if (ref.volume) add(" Vol. " + clean(ref.volume) + ".");
    if (ref.issue) add(" Núm. " + clean(ref.issue) + ".");
    if (ref.pages) add(" pp. " + clean(ref.pages) + ".");
    if (source) {
      add(" Disponible en: ");
      add(source, false, source);
    }
    if (clean(ref.accessed)) add(" [consulta: " + clean(ref.accessed) + "].");
  }
  return parts;
}
export function formatReference(
  ref: ReferenceRecord,
  style: AcademicStyle,
  number = 1,
  yearSuffix = "",
): string {
  return formatReferenceParts(ref, style, number, yearSuffix)
    .map((part) => part.text)
    .join("");
}
export function citationLabel(
  ref: ReferenceRecord | undefined,
  style: AcademicStyle,
  number = 1,
  yearSuffix = "",
): string {
  if (!ref) return "[Referencia no encontrada]";
  if (isCslStyle(style))
    return formatCsl([ref], style).citations.get(ref.id) ?? "[?]";
  return style === "ieee" || style === "iso690"
    ? `[${number}]`
    : `(${shortAuthor(ref)}, ${year(ref)}${yearSuffix})`;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function academicPlainText(node: RichNode): string {
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "citation") return clean(node.attrs?.label);
  if (node.type === "caption" || node.type === "appendix")
    return [
      clean(node.attrs?.label),
      clean(node.attrs?.title),
      ...(node.type === "caption" && clean(node.attrs?.note)
        ? ["Nota. " + clean(node.attrs?.note).replace(/^Nota\.\s*/i, "")]
        : []),
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    (node.type === "generatedIndex" ? clean(node.attrs?.title) + "\n" : "") +
    (node.content || [])
      .map(academicPlainText)
      .join(
        [
          "doc",
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
          "bulletList",
          "orderedList",
          "listItem",
          "generatedIndex",
        ].includes(node.type ?? "")
          ? "\n"
          : "",
      )
  );
}
function walk(
  node: RichNode,
  visit: (node: RichNode, path: number[], parent?: RichNode) => void,
  path: number[] = [],
  parent?: RichNode,
) {
  visit(node, path, parent);
  // Generated index bodies are output, never input to counters or citation order.
  if (node.type !== "generatedIndex")
    node.content?.forEach((child, i) => walk(child, visit, [...path, i], node));
}
function paragraph(
  text: string,
  attrs: Record<string, unknown> = {},
  marks?: RichNode["marks"],
): RichNode {
  const fontMark =
    attrs.fontFamily && attrs.fontSize
      ? [
          {
            type: "textStyle",
            attrs: {
              fontFamily: attrs.fontFamily,
              fontSize: attrs.fontSize + "pt",
            },
          },
        ]
      : [];
  const textMarks = [...(marks || []), ...fontMark];
  return {
    type: "paragraph",
    attrs,
    content: text
      ? [
          {
            type: "text",
            text,
            ...(textMarks.length ? { marks: textMarks } : {}),
          },
        ]
      : [],
  };
}
function styleText(
  node: RichNode,
  family: string,
  size: number,
  bold?: boolean,
  italic?: boolean,
) {
  if (node.type === "text") {
    const marks = (node.marks || []).filter(
      (mark) =>
        mark.type !== "textStyle" &&
        (bold === undefined || mark.type !== "bold") &&
        (italic === undefined || mark.type !== "italic"),
    );
    const previous =
      node.marks?.find((mark) => mark.type === "textStyle")?.attrs || {};
    marks.push({
      type: "textStyle",
      attrs: { ...previous, fontFamily: family, fontSize: size + "pt" },
    });
    if (bold) marks.push({ type: "bold" });
    if (italic) marks.push({ type: "italic" });
    node.marks = marks;
  }
  node.content?.forEach((child) =>
    styleText(child, family, size, bold, italic),
  );
}
/** Explicit style application, never called on every keystroke. ISO only styles references. */
export function applyAcademicStyle(
  content: RichNode,
  style: AcademicStyle,
): RichNode {
  const next = clone(content),
    preset = academicPresets[style];
  if (!preset.fontFamily || !preset.fontSize) return next;
  function apply(node: RichNode, inTable = false) {
    if (node.type === "sectionBreak" && preset.layout)
      node.attrs = {
        ...node.attrs,
        layout: {
          ...(node.attrs?.layout as PageLayout),
          ...preset.layout,
          pageNumberPosition: preset.pageNumberPosition,
        },
      };
    const table = inTable || node.type === "table";
    if (node.type === "paragraph" || node.type === "heading") {
      const attrs = node.attrs || {},
        level = Number(attrs.level) || 1,
        heading = node.type === "heading";
      node.attrs = {
        ...attrs,
        academicStyle: style,
        fontFamily: preset.fontFamily,
        fontSize: preset.fontSize,
        lineHeight: table ? 1 : preset.lineHeight,
        indent: 0,
        hangingIndent: 0,
        firstLineIndent:
          heading || table
            ? 0
            : (preset.firstLineIndent ?? (style === "apa" ? 36 : 10)),
        spaceBefore: 0,
        spaceAfter: 0,
        textAlign: heading
          ? level === 1
            ? "center"
            : "left"
          : style === "apa"
            ? "left"
            : "justify",
      };
      if (style === "apa" && heading && level >= 4)
        node.attrs.firstLineIndent = 36;
      styleText(
        node,
        preset.fontFamily!,
        preset.fontSize!,
        heading ? style === "apa" : undefined,
        heading
          ? style === "apa"
            ? level === 3 || level === 5
            : level > 1
          : undefined,
      );
    }
    if (node.type === "table")
      node.attrs = {
        ...node.attrs,
        academicStyle: style,
        tableStyle: style === "apa" ? "academic" : "grid",
      };
    node.content?.forEach((child) => apply(child, table));
  }
  apply(next);
  return next;
}
function alphabetical(refs: ReferenceRecord[]) {
  return [...refs].sort(
    (a, b) =>
      (authorText(a) || title(a)).localeCompare(
        authorText(b) || title(b),
        "es",
        { sensitivity: "base" },
      ) ||
      year(a).localeCompare(year(b)) ||
      title(a).localeCompare(title(b), "es", { sensitivity: "base" }) ||
      a.id.localeCompare(b.id),
  );
}
function referenceOrder(
  content: RichNode,
  refs: ReferenceRecord[],
  style: AcademicStyle,
) {
  const unique = refs.filter(
    (ref, i) => refs.findIndex((other) => other.id === ref.id) === i,
  );
  if (!numberedStyle(style)) return alphabetical(unique);
  const ids = collectCitationOccurrences(content).map(
    (citation) => citation.refId,
  );
  const ordered = [...new Set(ids)]
    .map((id) => unique.find((ref) => ref.id === id))
    .filter((ref): ref is ReferenceRecord => !!ref);
  return [
    ...ordered,
    ...unique.filter((ref) => !ordered.some((item) => item.id === ref.id)),
  ];
}
function suffixes(refs: ReferenceRecord[]) {
  const result = new Map<string, string>(),
    groups = new Map<string, ReferenceRecord[]>();
  for (const ref of alphabetical(refs)) {
    const key = authorText(ref).toLocaleLowerCase("es") + "|" + year(ref);
    const group = groups.get(key) || [];
    // No author: different titles already distinguish citations without letters.
    if (authorText(ref)) {
      group.push(ref);
      groups.set(key, group);
    }
  }
  for (const group of groups.values())
    if (group.length > 1)
      group.forEach((ref, i) =>
        result.set(ref.id, alphabetic(i).toLowerCase()),
      );
  return result;
}
function alphabetic(index: number): string {
  let output = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    output = String.fromCharCode(65 + ((n - 1) % 26)) + output;
  return output;
}
export function roman(number: number): string {
  if (!Number.isInteger(number) || number <= 0 || number >= 4000)
    return String(number);
  let result = "",
    remainder = number;
  for (const [value, label] of [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as [number, string][])
    while (remainder >= value) {
      result += label;
      remainder -= value;
    }
  return result;
}
/** Actual page numbers are optional. Never guesses pagination. */
export function collectDocumentEntries(content: RichNode): DocumentEntries {
  const result: DocumentEntries = {
    contents: [],
    figures: [],
    tables: [],
    appendices: [],
  };
  const objects = new Map<string, { path: number[]; page?: number }>();
  walk(content, (node, path) => {
    const id = clean(node.attrs?.id);
    if (
      id &&
      (["image", "chart", "shape", "video"].includes(node.type ?? "") ||
        node.type === "table")
    )
      objects.set(id, {
        path,
        ...(Number.isInteger(node.attrs?.page)
          ? { page: Number(node.attrs?.page) }
          : {}),
      });
  });
  walk(content, (node, path) => {
    const attrs = node.attrs || {},
      id = clean(attrs.id) || `${node.type}-${path.join("-")}`,
      titleText =
        node.type === "heading" ? academicPlainText(node) : clean(attrs.title);
    const page =
      Number.isInteger(attrs.page) && Number(attrs.page) > 0
        ? Number(attrs.page)
        : undefined;
    if (node.type === "heading")
      result.contents.push({
        id,
        targetId: id,
        kind: "heading",
        label: titleText,
        title: titleText,
        level: Number(attrs.level) || 1,
        path,
        ...(page ? { page } : {}),
      });
    if (
      node.type === "caption" &&
      (attrs.kind === "table" || attrs.kind === "figure")
    ) {
      const targetId = clean(attrs.targetId),
        object = objects.get(targetId);
      if (!object) return;
      const kind = attrs.kind;
      result[kind === "table" ? "tables" : "figures"].push({
        id,
        targetId,
        kind,
        label: [clean(attrs.label), titleText].filter(Boolean).join(" · "),
        title: titleText,
        number: Number(attrs.number) || 1,
        path: object.path,
        ...(object.page ? { page: object.page } : {}),
      });
    }
    if (node.type === "appendix")
      result.appendices.push({
        id,
        targetId: id,
        kind: "appendix",
        label: [clean(attrs.label), titleText].filter(Boolean).join(" · "),
        title: titleText,
        path,
      });
    if (node.type === "heading" && attrs.appendix)
      result.appendices.push({
        id,
        targetId: id,
        kind: "appendix",
        label: [clean(attrs.appendixLabel), clean(attrs.appendixTitle)]
          .filter(Boolean)
          .join(" · "),
        title: clean(attrs.appendixTitle),
        path,
        ...(page ? { page } : {}),
      });
  });
  const comparePaths = (a: DocumentEntry, b: DocumentEntry) => {
    for (let i = 0; i < Math.min(a.path.length, b.path.length); i++)
      if (a.path[i] !== b.path[i]) return a.path[i] - b.path[i];
    return a.path.length - b.path.length;
  };
  result.figures.sort(comparePaths);
  result.tables.sort(comparePaths);
  return result;
}
export function collectCitationOccurrences(
  content: RichNode,
  refId?: string,
): CitationOccurrence[] {
  const result: CitationOccurrence[] = [];
  walk(content, (node, path, parent) => {
    if (node.type !== "citation" || (refId && node.attrs?.refId !== refId))
      return;
    result.push({
      id: clean(node.attrs?.id) || "citation-" + path.join("-"),
      refId: clean(node.attrs?.refId),
      label: clean(node.attrs?.label),
      path,
      blockId: clean(parent?.attrs?.id),
      context: (parent
        ? academicPlainText(parent)
        : clean(node.attrs?.label)
      ).slice(0, 240),
    });
  });
  return result;
}
export function captionBlocks(
  caption: RichNode,
  style: AcademicStyle,
): { before: RichNode[]; after: RichNode[] } {
  const attrs = caption.attrs || {},
    label = clean(attrs.label),
    titleText = clean(attrs.title),
    note = clean(attrs.note);
  const spacing = style === "apa" ? 2 : 1;
  const base = {
    textAlign: "left",
    firstLineIndent: 0,
    lineHeight: spacing,
    spaceBefore: 0,
    spaceAfter: 0,
    ...(academicPresets[style].fontFamily
      ? {
          fontFamily: academicPresets[style].fontFamily,
          fontSize: academicPresets[style].fontSize,
        }
      : {}),
  };
  const noteBlock: RichNode[] = note
    ? [
        {
          type: "paragraph",
          attrs: { ...base, spaceAfter: style === "apa" ? 0 : 8 },
          content: [
            { type: "text", text: "Nota. ", marks: [{ type: "italic" }] },
            { type: "text", text: note.replace(/^Nota\.\s*/i, "") },
          ],
        },
      ]
    : [];
  if (style === "ieee" && attrs.kind === "figure")
    return {
      before: [],
      after: [
        paragraph([label, titleText].filter(Boolean).join(". "), base),
        ...noteBlock,
      ],
    };
  return {
    before: [
      paragraph(label, base, [{ type: "bold" }]),
      ...(titleText
        ? [
            paragraph(
              titleText,
              { ...base, spaceAfter: style === "apa" ? 0 : 6 },
              style === "apa" ? [{ type: "italic" }] : undefined,
            ),
          ]
        : []),
    ],
    after: noteBlock,
  };
}
const indexTitles: Record<IndexKind, string> = {
  contents: "Tabla de contenido",
  figures: "Lista de figuras",
  tables: "Lista de tablas",
  appendices: "Lista de apéndices",
  references: "Referencias",
};
/** Stable pure normalization: IDs survive reordering; numbers and links follow document order. */
export function normalizeAcademicDocument(
  content: RichNode,
  references: ReferenceRecord[],
  style: AcademicStyle,
): RichNode {
  const next = clone(content),
    reserved = new Set<string>(),
    used = new Set<string>();
  // Initialize newly inserted blocks once. Later manual formatting remains editable.
  function inheritStyle(node: RichNode, inTable = false) {
    if (node.type === "generatedIndex" || node.type === "caption") return;
    const table = inTable || node.type === "table";
    if (
      academicPresets[style].fontFamily &&
      (node.type === "paragraph" || node.type === "heading") &&
      node.attrs?.academicStyle !== style
    ) {
      const formatted = applyAcademicStyle(node, style);
      if (table) {
        formatted.attrs = {
          ...formatted.attrs,
          firstLineIndent: 0,
          lineHeight: 1,
        };
      }
      Object.assign(node, formatted);
    }
    node.content?.forEach((child) => inheritStyle(child, table));
  }
  inheritStyle(next);
  const originalIds = new WeakMap<RichNode, string>();
  walk(next, (node) => {
    if (clean(node.attrs?.id)) {
      reserved.add(clean(node.attrs?.id));
      originalIds.set(node, clean(node.attrs?.id));
    }
  });
  let serial = 1;
  function idFor(prefix: string) {
    let id: string;
    do {
      id = `prisma-${prefix}-${serial++}`;
    } while (reserved.has(id) || used.has(id));
    reserved.add(id);
    used.add(id);
    return id;
  }
  const identifiable = new Set([
    "paragraph",
    "heading",
    "image",
    "chart",
    "shape",
    "video",
    "equation",
    "table",
    "caption",
    "citation",
    "appendix",
    "generatedIndex",
    "sectionBreak",
  ]);
  walk(next, (node) => {
    if (!identifiable.has(node.type || "")) return;
    const id = clean(node.attrs?.id);
    node.attrs = {
      ...node.attrs,
      id: id && !used.has(id) ? id : idFor(node.type!),
    };
    used.add(String(node.attrs.id));
  });
  // Pasting an object together with its caption duplicates both IDs. Keep the
  // adjacent caption attached to that copy, including its editable title/note.
  walk(next, (parent) => {
    const children = parent.content || [];
    for (let i = 0; i < children.length - 1; i++) {
      const caption = children[i],
        object = children[i + 1];
      if (
        caption.type === "caption" &&
        (object.type === "table" ||
          ["image", "chart", "shape", "video"].includes(object.type ?? "")) &&
        caption.attrs?.targetId === originalIds.get(object) &&
        originalIds.get(object) !== object.attrs?.id
      )
        caption.attrs = { ...caption.attrs, targetId: object.attrs?.id };
    }
  });
  const captions = new Map<string, RichNode>();
  walk(next, (node) => {
    if (
      node.type === "caption" &&
      clean(node.attrs?.targetId) &&
      !captions.has(clean(node.attrs?.targetId))
    )
      captions.set(clean(node.attrs?.targetId), node);
  });
  function addCaptions(parent: RichNode) {
    if (parent.type === "generatedIndex" || !parent.content) return;
    const children: RichNode[] = [];
    for (const node of parent.content) {
      if (
        parent.type !== "paragraph" &&
        parent.type !== "heading" &&
        (node.type === "table" ||
          ["image", "chart", "shape", "video"].includes(node.type ?? "")) &&
        style !== "free" &&
        !captions.has(clean(node.attrs?.id))
      ) {
        const caption: RichNode = {
          type: "caption",
          attrs: {
            id: idFor("caption"),
            kind: node.type === "table" ? "table" : "figure",
            targetId: node.attrs?.id,
            title:
              clean(node.attrs?.title) ||
              (node.type === "image" ? clean(node.attrs?.alt) : ""),
            note: clean(node.attrs?.note),
          },
        };
        children.push(caption);
        captions.set(clean(node.attrs?.id), caption);
      }
      children.push(node);
      addCaptions(node);
    }
    parent.content = children;
  }
  addCaptions(next);
  const appendixHeading = (node: RichNode) =>
    node.type === "heading"
      ? academicPlainText(node).match(
          /^\s*(?:ap[ée]ndice|appendix)\b(?:\s+[A-Z](?=\s*[:.\-—]|\s|$))?\s*[:.\-—]?\s*(.*)$/iu,
        )
      : null;
  let appendixTotal = 0;
  walk(next, (node) => {
    if (
      node.type === "appendix" ||
      appendixHeading(node) ||
      (node.type === "heading" && node.attrs?.appendix)
    )
      appendixTotal++;
  });
  let tables = 0,
    figures = 0,
    appendixCount = 0,
    appendixLetter = "",
    appendixTables = 0,
    appendixFigures = 0;
  const objects = new Map<
    string,
    { kind: "table" | "figure"; number: number; appendixLetter?: string }
  >();
  walk(next, (node) => {
    const match = appendixHeading(node);
    if (
      node.type === "appendix" ||
      match ||
      (node.type === "heading" && node.attrs?.appendix)
    ) {
      appendixLetter = alphabetic(appendixCount++);
      appendixTables = 0;
      appendixFigures = 0;
      const label =
        style === "apa" && appendixTotal === 1
          ? "Apéndice"
          : "Apéndice " + appendixLetter;
      if (node.type === "appendix")
        node.attrs = {
          ...node.attrs,
          academicStyle: style,
          number: appendixCount,
          label,
          ...(style === "apa" ? { breakBefore: true } : { breakBefore: false }),
        };
      else
        node.attrs = {
          ...node.attrs,
          appendix: true,
          appendixLabel: label,
          appendixTitle:
            match?.[1] ||
            clean(node.attrs?.appendixTitle) ||
            academicPlainText(node),
          ...(style === "apa" ? { breakBefore: true } : { breakBefore: false }),
        };
    }
    if (
      node.type === "table" ||
      ["image", "chart", "shape", "video"].includes(node.type ?? "")
    ) {
      const kind: "table" | "figure" =
        node.type === "table" ? "table" : "figure";
      const inAppendix =
        !!appendixLetter &&
        (style === "apa" ||
          (style === "free" &&
            captions.get(clean(node.attrs?.id))?.attrs?.appendixNumbered ===
              true));
      const number = inAppendix
        ? kind === "table"
          ? ++appendixTables
          : ++appendixFigures
        : kind === "table"
          ? ++tables
          : ++figures;
      const item = {
        kind,
        number,
        ...(inAppendix ? { appendixLetter } : {}),
      };
      objects.set(clean(node.attrs?.id), item);
      node.attrs = {
        ...node.attrs,
        academicStyle: style,
        number,
        appendixLetter: item.appendixLetter || "",
      };
    }
  });
  walk(next, (node) => {
    if (node.type !== "caption") return;
    const item = objects.get(clean(node.attrs?.targetId));
    if (!item) return;
    const label =
      item.kind === "table"
        ? style === "ieee"
          ? "TABLA " + roman(item.number)
          : "Tabla " + (item.appendixLetter || "") + item.number
        : style === "ieee"
          ? "Fig. " + item.number
          : "Figura " + (item.appendixLetter || "") + item.number;
    node.attrs = {
      ...node.attrs,
      ...item,
      appendixLetter: item.appendixLetter || "",
      academicStyle: style,
      label,
    };
    node.content = captionBlocks(node, style).before;
  });
  let ordered = referenceOrder(next, references, style);
  const csl = isCslStyle(style) ? formatCsl(ordered, style) : null;
  if (csl)
    ordered = csl.ordered
      .map((id) => ordered.find((ref) => ref.id === id)!)
      .filter(Boolean);
  const disambiguation = suffixes(ordered);
  const byId = new Map(
    ordered.map((ref, i) => [ref.id, { ref, number: i + 1 }]),
  );
  walk(next, (node) => {
    if (node.type !== "citation") return;
    const match = byId.get(clean(node.attrs?.refId));
    node.attrs = {
      ...node.attrs,
      label:
        csl?.cite(match?.ref.id ?? "", clean(node.attrs?.locator)) ??
        citationLabel(
          match?.ref,
          style,
          match?.number,
          style === "apa" || style === "free"
            ? disambiguation.get(match?.ref.id || "")
            : "",
        ) +
          (node.attrs?.locator
            ? " (p. " + String(node.attrs.locator) + ")"
            : ""),
      referenceAnchor: match ? "reference-" + match.ref.id : "",
      ...(match ? { number: match.number } : { number: null }),
    };
  });
  const entries = collectDocumentEntries(next);
  walk(next, (node) => {
    if (node.type !== "generatedIndex") return;
    const kind = (node.attrs?.kind || "contents") as IndexKind;
    if (!(kind in indexTitles)) return;
    const list: DocumentEntry[] =
      kind === "references"
        ? ordered.map((ref, i) => ({
            id: ref.id,
            targetId: "reference-" + ref.id,
            label:
              csl?.references
                .get(ref.id)
                ?.map((p) => p.text)
                .join("") ??
              formatReference(
                ref,
                style,
                i + 1,
                style === "apa" || style === "free"
                  ? disambiguation.get(ref.id)
                  : "",
              ),
            kind: "reference" as const,
            title: ref.title,
            path: [],
          }))
        : entries[kind].filter(
            (entry) =>
              kind !== "contents" ||
              ((entry.level ?? 1)>=Math.max(1,Number(node.attrs?.minLevel)||1)&&(entry.level ?? 1) <=
                Math.max(1, Math.min(6, Number(node.attrs?.levels) || 3))),
          );
    node.attrs = {
      ...node.attrs,
      kind,
      title: indexTitles[kind],
      academicStyle: style,
      entries: list.map(({ path: _path, ...entry }) => entry),
    };
    node.content = list.map((entry) => {
      const attrs: Record<string, unknown> = {
        ...(kind === "references" ? { id: entry.targetId } : {}),
        targetId: entry.targetId,
        textAlign: "left",
        firstLineIndent: 0,
        lineHeight: style === "apa" ? 2 : kind === "references" ? 1 : 1.45,
        spaceBefore: 0,
        spaceAfter: 0,
        ...(academicPresets[style].fontFamily
          ? {
              fontFamily: academicPresets[style].fontFamily,
              fontSize: academicPresets[style].fontSize,
            }
          : {}),
        ...(kind === "references" && (style === "apa" || csl?.hanging)
          ? { hangingIndent: 36 }
          : { hangingIndent: 0 }),
      };
      if (kind !== "references")
        return paragraph(
          entry.label +
            (node.attrs?.pageNumbers !== false && entry.page
              ? `\t${entry.page}`
              : ""),
          {
            ...attrs,
            indexEntry: true,
            indexLevel: entry.level || 1,
            indexLeader: node.attrs?.leader ?? "dots",
            indexPage:
              node.attrs?.pageNumbers !== false ? (entry.page ?? null) : null,
            indexLabel: entry.label,
          },
        );
      const match = byId.get(entry.id)!;
      return {
        type: "paragraph",
        attrs,
        content: (
          csl?.references.get(match.ref.id) ??
          formatReferenceParts(
            match.ref,
            style,
            match.number,
            style === "apa" || style === "free"
              ? disambiguation.get(match.ref.id)
              : "",
          )
        ).map((part) => ({
          type: "text",
          text: part.text,
          ...(part.italic || part.href || academicPresets[style].fontFamily
            ? {
                marks: [
                  ...(academicPresets[style].fontFamily
                    ? [
                        {
                          type: "textStyle",
                          attrs: {
                            fontFamily: academicPresets[style].fontFamily,
                            fontSize: academicPresets[style].fontSize + "pt",
                          },
                        },
                      ]
                    : []),
                  ...(part.italic ? [{ type: "italic" }] : []),
                  ...(part.href
                    ? [{ type: "link", attrs: { href: part.href } }]
                    : []),
                ],
              }
            : {}),
        })),
      };
    });
  });
  return next;
}
