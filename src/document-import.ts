import {proofingLanguages} from './proofing-languages';
import { unzipSync, strFromU8 } from "fflate";
import {
  defaultLayout,
  plainText,
  type FlowDocument,
  type RichNode,
  type PageLayout,
} from "./flow";
import { fontFamilies } from "./fonts";
import { encodeFont } from "./local-fonts";
import {attachOfficeOriginal} from './office-engines';
import {
  normalizeAcademicDocument,
  academicPresets,
  collectDocumentEntries,
  type AcademicStyle,
} from "./academic";
import {
  declaredAcademicStyle,
  type OfficeImportReport,
} from "./office-compatibility";
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const children = (el?: Element | null) =>
  el
    ? Array.from(el.childNodes).filter((n): n is Element => n.nodeType === 1)
    : [];
const direct = (el: Element | null | undefined, tag: string) =>
  children(el).find((n) => n.localName === tag);
const all = (el: Element | Document, tag: string) =>
  Array.from(el.getElementsByTagNameNS("*", tag));
const val = (el?: Element | null, name = "val") =>
  el?.getAttributeNS(W, name) ?? el?.getAttribute("w:" + name) ?? "";
const yes = (el?: Element) => !!el && !["0", "false", "off"].includes(val(el));
function parseXml(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text))
    throw new Error("El DOCX contiene una definición XML no admitida.");
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.getElementsByTagName("parsererror").length)
    throw new Error("No se pudo leer la estructura del DOCX.");
  return xml;
}
function partPath(source: string, target: string) {
  if (/^[a-z]+:/i.test(target)) return "";
  const parts = (
      target.startsWith("/")
        ? target.slice(1)
        : source.slice(0, source.lastIndexOf("/") + 1) + target
    ).split("/"),
    clean: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      if (!clean.length) return "";
      clean.pop();
    } else if (part && part !== ".") clean.push(part);
  }
  return clean.join("/");
}
export function importText(text: string): FlowDocument {
  if (text.length > 5_000_000)
    throw new Error(
      "El documento de texto supera el límite de 5 millones de caracteres.",
    );
  return {
    layout: defaultLayout(),
    academicStyle: "free",
    references: [],
    content: normalizeAcademicDocument(
      {
        type: "doc",
        content: text
          .replace(/\r\n?/g, "\n")
          .split("\n")
          .map((line) => ({
            type: "paragraph",
            ...(line ? { content: [{ type: "text", text: line }] } : {}),
          })),
      },
      [],
      "free",
    ),
  };
}
export async function importOfficeDocx(bytes:Uint8Array){
 const result=importDocx(bytes);
 await attachOfficeOriginal(result.flow,bytes);
 result.warnings=result.warnings.filter(w=>!/historial de cambios|notas al pie o finales/.test(w));
 result.warnings.push('El original de Word se conserva. Los cambios de texto y notas mantienen sus partes; cambios de diseño o estructura requieren reconstrucción.');
 if(result.flow.importReport)result.flow.importReport.warnings=result.warnings;
 return result;
}
/** Parse OOXML locally. No remote relationships, embedded programs or macros are executed. */
export function importDocx(bytes: Uint8Array): {
  flow: FlowDocument;
  warnings: string[];
} {
  if (bytes.length > 100 * 1024 * 1024)
    throw new Error("Elige un DOCX de hasta 100 MB.");
  let expanded = 0, containsVba = false;
  const parts = unzipSync(bytes, {
    filter(file) {
      if(file.name==="word/vbaProject.bin")containsVba=true;
      expanded += file.originalSize;
      if (expanded > 160 * 1024 * 1024)
        throw new Error("El DOCX descomprimido supera los 160 MB.");
      return /^(docProps\/custom\.xml|word\/(?:document|styles|numbering|comments|footnotes|endnotes|header\d+|footer\d+)\.xml|word\/_rels\/document\.xml\.rels|word\/media\/.+)$/.test(
        file.name,
      );
    },
  });
  if (!parts["word/document.xml"])
    throw new Error("El archivo no es un documento DOCX válido.");
  const xml = (path: string) =>
    parts[path] ? parseXml(strFromU8(parts[path])) : null;
  const document = xml("word/document.xml")!,
    body = all(document, "body")[0];
  if (!body) throw new Error("No se encontró el contenido del DOCX.");
  const warnings = new Set<string>(),
    substitutions = new Set<string>();
  const detected = new Map<
    AcademicStyle,
    { paragraphs: number; evidence: Set<string> }
  >();
  const sourceParagraphs = new WeakMap<
    RichNode,
    { caption: boolean; field: string }
  >();
  const relationships = new Map<
    string,
    { target: string; external: boolean }
  >();
  const relDoc = xml("word/_rels/document.xml.rels");
  if (relDoc)
    for (const rel of all(relDoc, "Relationship"))
      relationships.set(rel.getAttribute("Id")!, {
        target: rel.getAttribute("Target")!,
        external: rel.getAttribute("TargetMode") === "External",
      });
  const styles = new Map<string, Element>(),
    styleDoc = xml("word/styles.xml");
  if (styleDoc)
    for (const style of all(styleDoc, "style"))
      styles.set(val(style, "styleId"), style);
  const defaults = styleDoc && all(styleDoc, "docDefaults")[0];
  function styleChain(
    id: string,
    type: "pPr" | "rPr",
    visited = new Set<string>(),
  ): Element[] {
    if (visited.has(id) || visited.size > 20) return [];
    visited.add(id);
    const style = styles.get(id);
    if (!style) return [];
    const inherited = styleChain(val(direct(style, "basedOn")), type, visited),
      current = direct(style, type);
    return current ? [...inherited, current] : inherited;
  }
  const defaultParagraph = styles.size
    ? [...styles.values()].find(
        (s) => val(s, "type") === "paragraph" && val(s, "default") === "1",
      )
    : undefined;
  function fontValue(label: string) {
    const known = fontFamilies.find(
      (f) =>
        f.label.toLowerCase() === label.toLowerCase() ||
        f.value.toLowerCase() === label.toLowerCase(),
    );
    if (known) return known.value;
    const replacements: Record<string, string> = {
      arial: "Arimo",
      calibri: "Carlito",
      aptos: "Carlito",
      "times new roman": "PrismaSerif",
      georgia: "Gelasio",
      "courier new": "PrismaMono",
      cambria: "PrismaSerif",
      "cambria math": "STIXTwoText",
    };
    if (label) substitutions.add(label);
    return replacements[label.toLowerCase()] ?? "PrismaSans";
  }
  function runFormat(elements: Element[]): NonNullable<RichNode["marks"]> {
    const flags = new Map<string, boolean>(),
      attrs: Record<string, unknown> = {};
    for (const props of elements)
      for (const item of children(props)) {
        if (["b", "i", "strike", "u"].includes(item.localName))
          flags.set(
            item.localName,
            item.localName === "u" ? val(item) !== "none" : yes(item),
          );
        if (item.localName === "rFonts")
          attrs.fontFamily = fontValue(
            val(item, "ascii") || val(item, "hAnsi") || "Calibri",
          );
        if (item.localName === "sz")
          attrs.fontSize = Number(val(item)) / 2 + "pt";
        if (item.localName === "color" && /^[a-f0-9]{6}$/i.test(val(item)))
          attrs.color = "#" + val(item);
        if (item.localName === "highlight") {
          const colors: Record<string, string> = {
            yellow: "#fff070",
            green: "#9dedaa",
            cyan: "#83e7f1",
            magenta: "#f2a3ee",
            blue: "#90b5ff",
            red: "#ff9999",
          };
          if (colors[val(item)]) attrs.backgroundColor = colors[val(item)];
        }
        if (
          item.localName === "shd" &&
          /^[a-f0-9]{6}$/i.test(val(item, "fill"))
        )
          attrs.backgroundColor = "#" + val(item, "fill");
        if (item.localName === "vertAlign")
          flags.set(
            val(item) === "superscript" ? "superscript" : "subscript",
            true,
          );
      }
    const types: Record<string, string> = {
      b: "bold",
      i: "italic",
      strike: "strike",
      u: "underline",
      superscript: "superscript",
      subscript: "subscript",
    };
    return [
      ...[...flags]
        .filter(([, enabled]) => enabled)
        .map(([flag]) => ({ type: types[flag] })),
      ...(Object.keys(attrs).length ? [{ type: "textStyle", attrs }] : []),
    ];
  }
  const commentDoc = xml("word/comments.xml"),
    comments = new Map<string, Record<string, unknown>>();
  if (commentDoc)
    for (const c of all(commentDoc, "comment"))
      comments.set(val(c, "id"), {
        id: crypto.randomUUID(),
        author: val(c, "author"),
        date: val(c, "date"),
        text: all(c, "t")
          .map((t) => t.textContent)
          .join(" "),
      });
  const defaultRuns = defaults ? all(defaults, "rPr") : [];
  const numbering = new Map<
    string,
    { kind: string; start: number; style: string }
  >();
  const numDoc = xml("word/numbering.xml");
  if (numDoc) {
    const abstract = new Map(
      all(numDoc, "abstractNum").map((n) => [val(n, "abstractNumId"), n]),
    );
    for (const num of all(numDoc, "num")) {
      const source = abstract.get(val(direct(num, "abstractNumId")));
      if (!source) continue;
      for (const level of children(source).filter((n) => n.localName === "lvl"))
        numbering.set(val(num, "numId") + ":" + val(level, "ilvl"), {
          kind:
            val(direct(level, "numFmt")) === "bullet"
              ? "bulletList"
              : "orderedList",
          start: Number(val(direct(level, "start"))) || 1,
          style: val(direct(level, "numFmt")),
        });
    }
  }
  const lists = new WeakMap<
    RichNode,
    { key: string; level: number; kind: string; start: number; style: string }
  >();
  function inline(
    parent: Element,
    inherited: ReturnType<typeof runFormat>,
    activeComments: string[] = [],
  ): { content: RichNode[]; images: RichNode[]; pageBreak: boolean } {
    const content: RichNode[] = [],
      images: RichNode[] = [];
    let pageBreak = false;
    for (const child of children(parent)) {
      if (child.localName === "commentRangeStart") {
        activeComments.push(val(child, "id"));
        continue;
      }
      if (child.localName === "commentRangeEnd") {
        const i = activeComments.indexOf(val(child, "id"));
        if (i >= 0) activeComments.splice(i, 1);
        continue;
      }
      if (child.localName === "hyperlink") {
        const rel = relationships.get(child.getAttributeNS(R, "id") || ""),
          link =
            rel?.external && /^(https?:\/\/|mailto:)/i.test(rel.target)
              ? rel.target
              : "";
        const result = inline(
          child,
          [
            ...inherited,
            ...(link ? [{ type: "link", attrs: { href: link } }] : []),
          ],
          activeComments,
        );
        content.push(...result.content);
        images.push(...result.images);
        continue;
      }
      if (["ins", "smartTag", "sdtContent"].includes(child.localName)) {
        const result = inline(child, inherited, activeComments);
        content.push(...result.content);
        images.push(...result.images);
        pageBreak ||= result.pageBreak;
        continue;
      }
      if (child.localName === "fldSimple") {
        const result = inline(child, inherited, activeComments);
        content.push(...result.content);
        images.push(...result.images);
        pageBreak ||= result.pageBreak;
        continue;
      }
      if (child.localName !== "r") continue;
      const props = direct(child, "rPr"),
        style = val(direct(props, "rStyle"));
      const own = runFormat([
        ...styleChain(style, "rPr"),
        ...(props ? [props] : []),
      ]);
      const markMap = new Map([...inherited, ...own].map((m) => [m.type, m]));
      const inheritedText = inherited.find(
          (m) => m.type === "textStyle",
        )?.attrs,
        ownText = own.find((m) => m.type === "textStyle")?.attrs;
      if (inheritedText || ownText)
        markMap.set("textStyle", {
          type: "textStyle",
          attrs: { ...inheritedText, ...ownText },
        });
      for (const id of activeComments) {
        const attrs = comments.get(id);
        if (attrs) markMap.set("comment", { type: "comment", attrs });
      }
      const marks = [...markMap.values()];
      for (const prop of children(props)) {
        const type = (
          {
            b: "bold",
            i: "italic",
            strike: "strike",
            u: "underline",
          } as Record<string, string>
        )[prop.localName];
        if (
          type &&
          (!yes(prop) || (prop.localName === "u" && val(prop) === "none"))
        ) {
          const index = marks.findIndex((mark) => mark.type === type);
          if (index >= 0) marks.splice(index, 1);
        }
      }
      for (const item of children(child)) {
        if (item.localName === "t" && item.textContent)
          content.push({
            type: "text",
            text: item.textContent,
            ...(marks.length ? { marks } : {}),
          });
        if (item.localName === "tab")
          content.push({
            type: "text",
            text: "\t",
            ...(marks.length ? { marks } : {}),
          });
        if (item.localName === "br" || item.localName === "cr") {
          if (val(item, "type") === "page") pageBreak = true;
          else content.push({ type: "hardBreak" });
        }
        if (item.localName === "drawing" || item.localName === "pict") {
          const blip = all(item, "blip")[0],
            rel = relationships.get(blip?.getAttributeNS(R, "embed") || ""),
            path =
              rel && !rel.external
                ? partPath("word/document.xml", rel.target)
                : "",
            data = parts[path];
          if (data && /\.(png|jpe?g)$/i.test(path)) {
            const extent = all(item, "extent")[0],
              width = Number(extent?.getAttribute("cx")) / 9525;
            images.push({
              type: "image",
              attrs: {
                id: crypto.randomUUID(),
                src:
                  "data:image/" +
                  (/\.png$/i.test(path) ? "png" : "jpeg") +
                  ";base64," +
                  encodeFont(data),
                width: Math.max(24, Math.min(1600, width || 400)),
                alt: all(item, "docPr")[0]?.getAttribute("descr") || "",
              },
            });
          } else
            warnings.add(
              "Algunas formas, gráficos o imágenes de formatos especiales necesitan revisión después de importar.",
            );
        }
      }
    }
    return { content, images, pageBreak };
  }
  function paragraph(el: Element): RichNode[] {
    const directProps = direct(el, "pPr"),
      styleId =
        val(direct(directProps, "pStyle")) || val(defaultParagraph, "styleId"),
      props = [
        ...styleChain(styleId, "pPr"),
        ...(directProps ? [directProps] : []),
      ];
    const runs = [...defaultRuns, ...styleChain(styleId, "rPr")],
      attrs: Record<string, unknown> = { id: crypto.randomUUID() };
    let level = /(?:heading|t[íi]tulo)([1-6])/i.exec(styleId)?.[1],
      list:
        | {
            key: string;
            level: number;
            kind: string;
            start: number;
            style: string;
          }
        | undefined;
    for (const p of props)
      for (const item of children(p)) {
        if (item.localName === "outlineLvl" && Number(val(item)) < 6)
          level = String(Number(val(item)) + 1);
        if (item.localName === "jc")
          attrs.textAlign = val(item) === "both" ? "justify" : val(item);
        if (item.localName === "spacing") {
          if (val(item, "before"))
            attrs.spaceBefore = Number(val(item, "before")) / 20;
          if (val(item, "after"))
            attrs.spaceAfter = Number(val(item, "after")) / 20;
          if (
            val(item, "line") &&
            (!val(item, "lineRule") || val(item, "lineRule") === "auto")
          )
            attrs.lineHeight = Number(val(item, "line")) / 240;
        }
        if (item.localName === "ind") {
          attrs.indent = Number(val(item, "left") || val(item, "start")) / 360;
          attrs.firstLineIndent = Number(val(item, "firstLine")) / 20;
          attrs.hangingIndent = Number(val(item, "hanging")) / 20;
        }
        if (item.localName === "pageBreakBefore") attrs.breakBefore = yes(item);
        if (item.localName === "numPr") {
          const key = val(direct(item, "numId")),
            depth = Number(val(direct(item, "ilvl"))) || 0,
            info = numbering.get(key + ":" + depth);
          if (info) list = { key, level: depth, ...info };
        }
      }
    const declaration =
      declaredAcademicStyle(val(direct(styles.get(styleId), "name"))) ??
      declaredAcademicStyle(styleId);
    if (declaration) {
      attrs.academicStyle = declaration;
      const hit = detected.get(declaration) ?? {
        paragraphs: 0,
        evidence: new Set<string>(),
      };
      hit.paragraphs++;
      hit.evidence.add(val(direct(styles.get(styleId), "name")) || styleId);
      detected.set(declaration, hit);
    }
    let semantic = styleId;
    for (let i = 0; i < 20 && semantic; i++) {
      if (/^(?:title|titulo)$/i.test(semantic)) {
        attrs.paragraphStyle = "title";
        break;
      }
      if (/^(?:subtitle|subtitulo)$/i.test(semantic)) {
        attrs.paragraphStyle = "subtitle";
        break;
      }
      semantic = val(direct(styles.get(semantic), "basedOn"));
    }
    const inherited = runFormat(runs),
      textStyle = inherited.find((m) => m.type === "textStyle")?.attrs;
    if (textStyle?.fontFamily) attrs.fontFamily = textStyle.fontFamily;
    if (textStyle?.fontSize)
      attrs.fontSize = parseFloat(String(textStyle.fontSize));
    const result = inline(el, inherited),
      node: RichNode = {
        type: level ? "heading" : "paragraph",
        attrs: { ...attrs, ...(level ? { level: Number(level) } : {}) },
        content: result.content,
      };
    if (list) lists.set(node, list);
    sourceParagraphs.set(node, {
      caption:
        /(?:caption|epigrafe|leyenda)/i.test(styleId) ||
        /\bSEQ\b/i.test(
          all(el, "instrText")
            .map((n) => n.textContent)
            .join(" ") +
            all(el, "fldSimple")
              .map((n) => val(n, "instr"))
              .join(" "),
        ),
      field:
        all(el, "instrText")
          .map((n) => n.textContent)
          .join(" ") +
        all(el, "fldSimple")
          .map((n) => val(n, "instr"))
          .join(" "),
    });
    // A drawing-only paragraph is a container in Word, not an extra visible blank line.
    const visible = result.content.some((n) => n.type !== "text" || !!n.text);
    return [
      ...(visible || (!result.images.length && !result.pageBreak)
        ? [node]
        : []),
      ...result.images,
      ...(result.pageBreak ? [{ type: "pageBreak" }] : []),
    ];
  }
  function table(el: Element): RichNode {
    const active = new Map<number, RichNode>(),
      grid = all(direct(el, "tblGrid") || el, "gridCol").map((c) =>
        Math.round(Number(val(c, "w")) / 15),
      );
    const rows: RichNode[] = [];
    for (const row of children(el).filter((n) => n.localName === "tr")) {
      const cells: RichNode[] = [];
      let column = 0;
      for (const cell of children(row).filter((n) => n.localName === "tc")) {
        const props = direct(cell, "tcPr"),
          colspan = Number(val(direct(props, "gridSpan"))) || 1,
          merge = direct(props, "vMerge");
        if (merge && val(merge) !== "restart" && active.has(column)) {
          const prior = active.get(column)!;
          prior.attrs!.rowspan = Number(prior.attrs!.rowspan) + 1;
          column += colspan;
          continue;
        }
        const content = blocks(cell);
        const node: RichNode = {
          type: direct(direct(row, "trPr"), "tblHeader")
            ? "tableHeader"
            : "tableCell",
          attrs: {
            colspan,
            rowspan: 1,
            ...(grid.length
              ? { colwidth: grid.slice(column, column + colspan) }
              : {}),
          },
          content: content.length ? content : [{ type: "paragraph" }],
        };
        if (merge) active.set(column, node);
        else active.delete(column);
        cells.push(node);
        column += colspan;
      }
      rows.push({ type: "tableRow", content: cells });
    }
    return { type: "table", attrs: { id: crypto.randomUUID() }, content: rows };
  }
  function blocks(el: Element): RichNode[] {
    const result: RichNode[] = [];
    let lastList: RichNode | undefined,
      lastKey = "";
    for (const child of children(el)) {
      let nodes: RichNode[] = [];
      if (child.localName === "p") nodes = paragraph(child);
      else if (child.localName === "tbl") nodes = [table(child)];
      else if (child.localName === "sdt") {
        const instruction = all(child, "instrText")
          .map((n) => n.textContent)
          .join("");
        if (/\bTOC\b/i.test(instruction)) {
          const caption = instruction.match(/\\c\s+"([^"]+)"/i)?.[1] ?? "";
          const kind = /^(?:tabla|table)/i.test(caption)
            ? "tables"
            : /^(?:figura|figure|ilustraci[oó]n)/i.test(caption)
              ? "figures"
              : "contents";
          nodes = [
            {
              type: "generatedIndex",
              attrs: {
                id: crypto.randomUUID(),
                kind,
                levels: Number(instruction.match(/\\o\s+"1-(\d)"/)?.[1]) || 3,
                leader: "dots",
                pageNumbers: true,
              },
              content: [],
            },
          ];
        } else {
          const content = direct(child, "sdtContent");
          if (content) nodes = blocks(content);
        }
      }
      for (const node of nodes) {
        const list = lists.get(node);
        if (list) {
          if (
            !lastList ||
            lastKey !== list.key ||
            lastList.type !== list.kind
          ) {
            lastList = {
              type: list.kind,
              attrs: {
                start: list.start,
                listStyle:
                  list.style === "lowerLetter"
                    ? "lower-alpha"
                    : list.style === "upperRoman"
                      ? "upper-roman"
                      : list.kind === "bulletList"
                        ? "disc"
                        : "decimal",
              },
              content: [],
            };
            result.push(lastList);
            lastKey = list.key;
          }
          lastList.content!.push({ type: "listItem", content: [node] });
        } else {
          lastList = undefined;
          result.push(node);
        }
      }
    }
    return result;
  }
  function layoutFor(el?: Element): PageLayout {
    const layout = defaultLayout();
    if (!el) return layout;
    const size = direct(el, "pgSz"),
      width = Number(val(size, "w")) / 20,
      height = Number(val(size, "h")) / 20;
    if (width && height) {
      layout.format = "custom";
      layout.orientation =
        val(size, "orient") === "landscape" ? "landscape" : "portrait";
      layout.customWidth =
        ((layout.orientation === "landscape" ? height : width) * 25.4) / 72;
      layout.customHeight =
        ((layout.orientation === "landscape" ? width : height) * 25.4) / 72;
    }
    const margins = direct(el, "pgMar");
    for (const side of ["top", "bottom", "left", "right"] as const)
      if (val(margins, side))
        layout[side] = Math.max(
          0,
          Math.min(100, ((Number(val(margins, side)) / 20) * 25.4) / 72),
        );
    layout.columns = Math.max(
      1,
      Math.min(3, Number(val(direct(el, "cols"), "num")) || 1),
    );
    const columnSpace = val(direct(el, "cols"), "space");
    if (columnSpace) layout.columnGap = (Number(columnSpace) * 25.4) / 1440;
    const start = Number(val(direct(el, "pgNumType"), "start"));
    if (start > 0) layout.pageNumberStart = start;
    layout.differentFirst = !!direct(el, "titlePg");
    for (const ref of children(el).filter(
      (n) =>
        n.localName === "headerReference" || n.localName === "footerReference",
    )) {
      const rel = relationships.get(ref.getAttributeNS(R, "id") || ""),
        part =
          rel && !rel.external
            ? xml(partPath("word/document.xml", rel.target))
            : null;
      const text = part ? headerText(part.documentElement) : "",
        kind = ref.localName === "headerReference" ? "header" : "footer",
        type = val(ref, "type");
      if (
        part &&
        /\bPAGE\b/.test(
          all(part, "instrText")
            .map((n) => n.textContent)
            .join(" ") +
            all(part, "fldSimple")
              .map((n) => val(n, "instr"))
              .join(" "),
        )
      ) {
        layout.numbering = true;
        layout.pageNumberPosition =
          kind === "header" ? "header-right" : "footer-right";
      }
      if (type === "first")
        layout[kind === "header" ? "headerFirst" : "footerFirst"] = text;
      else if (type === "even") {
        layout.oddEven = true;
        layout[kind === "header" ? "headerEven" : "footerEven"] = text;
      } else layout[kind] = text;
    }
    return layout;
  }
  function headerText(root: Element): string {
    const fields: { code: string; result: boolean }[] = [];
    const text: string[] = [];
    function visit(el: Element) {
      if (
        el.localName === "fldSimple" &&
        /^\s*PAGE(?:\s|$)/i.test(val(el, "instr"))
      )
        return;
      if (el.localName === "fldChar") {
        const kind = val(el, "fldCharType");
        if (kind === "begin") fields.push({ code: "", result: false });
        if (kind === "separate" && fields.at(-1)) fields.at(-1)!.result = true;
        if (kind === "end") fields.pop();
      } else if (el.localName === "instrText" && fields.at(-1))
        fields.at(-1)!.code += el.textContent;
      else if (
        el.localName === "t" &&
        !fields.some((f) => f.result && /^\s*PAGE(?:\s|$)/i.test(f.code))
      )
        text.push(el.textContent ?? "");
      for (const child of children(el)) visit(child);
    }
    visit(root);
    return text.join(" ");
  }
  const sections = children(body).flatMap((el) =>
      el.localName === "p"
        ? [direct(direct(el, "pPr"), "sectPr")].filter((n): n is Element => !!n)
        : el.localName === "sectPr"
          ? [el]
          : [],
    ),
    layouts = sections.map(layoutFor);
  const content: RichNode[] = [];
  let section = 0;
  for (const el of children(body)) {
    if (el.localName === "sectPr") continue;
    const converted = blocks({ childNodes: [el] } as unknown as Element);
    // Word stores the TOC heading beside its field; the index view supplies it.
    const previous = content.at(-1);
    if (
      converted[0]?.type === "generatedIndex" &&
      previous?.type === "paragraph" &&
      /^(tabla de contenido|table of contents|contenido|contents|índice|(?:lista|tabla|índice) de (?:tablas|figuras|ilustraciones)|list of (?:tables|figures))$/i.test(
        plainText(previous).trim(),
      )
    ) {
      converted[0].attrs = {
        ...converted[0].attrs,
        title: plainText(previous).trim(),
      };
      content.pop();
    }
    content.push(...converted);
    if (el.localName === "p" && direct(direct(el, "pPr"), "sectPr")) {
      section++;
      content.push({
        type: "sectionBreak",
        attrs: {
          id: crypto.randomUUID(),
          title: "Sección " + (section + 1),
          kind:
            val(direct(sections[section], "type")) === "continuous"
              ? "continuous"
              : "nextPage",
          layout: layouts[section] ?? defaultLayout(),
          linkToPrevious: true,
          restartNumbering: false,
        },
      });
    }
  }
  // Rebuild adjacent lists across top-level paragraphs.
  const merged: RichNode[] = [];
  for (const node of content) {
    const prior = merged.at(-1);
    if (
      prior &&
      ["bulletList", "orderedList"].includes(node.type || "") &&
      prior.type === node.type &&
      prior.attrs?.listStyle === node.attrs?.listStyle
    )
      prior.content!.push(...node.content!);
    else merged.push(node);
  }
  // Link Word Caption/SEQ paragraphs to their adjacent objects. Never infer captions from body prose alone.
  for (let i = 0; i < merged.length; i++) {
    const labelNode = merged[i];
    if (!sourceParagraphs.get(labelNode)?.caption) continue;
    const match = plainText(labelNode)
      .trim()
      .match(
        /^(Tabla|Table|Figura|Figure|Fig\.|Ilustraci[oó]n)\s+([A-Z]?\d+|[IVXLCDM]+)[.\s:–—-]*([\s\S]*)$/i,
      );
    if (!match) continue;
    const kind = /^(tabla|table)$/i.test(match[1]) ? "table" : "figure";
    const objectType = kind === "table" ? "table" : "image";
    let objectIndex = i + 1,
      title = match[3].trim();
    let titleNode: RichNode | undefined;
    if (
      !title &&
      merged[objectIndex]?.type === "paragraph" &&
      plainText(merged[objectIndex]).trim() &&
      merged[objectIndex + 1]?.type === objectType
    ) {
      titleNode = merged[objectIndex++];
      title = plainText(titleNode).trim();
    }
    while (
      merged[objectIndex]?.type === "paragraph" &&
      !plainText(merged[objectIndex]).trim()
    )
      objectIndex++;
    const after = merged[objectIndex]?.type === objectType;
    if (!after && merged[i - 1]?.type !== objectType) continue;
    const object = merged[after ? objectIndex : i - 1];
    const noteIndex = after ? objectIndex + 1 : i + 1;
    const noteNode = merged[noteIndex];
    const note =
      noteNode?.type === "paragraph" &&
      /^Nota\.\s|^Note\.\s/i.test(plainText(noteNode))
        ? plainText(noteNode).replace(/^(?:Nota|Note)\.\s*/i, "")
        : "";
    const caption: RichNode = {
      type: "caption",
      attrs: {
        id: crypto.randomUUID(),
        kind,
        targetId: object.attrs?.id,
        title,
        note,
        label: match[1] + " " + match[2],
        appendixNumbered: /^[A-Z]\d+/i.test(match[2]),
      },
    };
    const remove = new Set([
      labelNode,
      ...(titleNode && after ? [titleNode] : []),
      ...(note ? [noteNode] : []),
    ]);
    if (after)
      for (let k = i + 1; k < objectIndex; k++)
        if (!plainText(merged[k]).trim()) remove.add(merged[k]);
    merged.splice(i, 1, caption);
    for (let k = merged.length - 1; k >= 0; k--)
      if (remove.has(merged[k])) merged.splice(k, 1);
  }
  if (substitutions.size)
    warnings.add(
      "Fuentes sustituidas por alternativas locales: " +
        [...substitutions].join(", ") +
        ". Puedes importar los archivos TTF/OTF originales.",
    );
  if (
    all(document, "footnoteReference").length ||
    all(document, "endnoteReference").length
  )
    warnings.add(
      "Las notas al pie o finales requieren revisión; conserva el DOCX original como referencia.",
    );
  if (all(document, "del").length || all(document, "ins").length)
    warnings.add(
      "Se importó la versión visible del texto con cambios aceptados; el historial de cambios de Word no se conserva.",
    );
  const custom = xml("docProps/custom.xml");
  const declared =
    custom &&
    all(custom, "property").find(
      (p) => p.getAttribute("name") === "PrismaAcademicStyle",
    )?.textContent;
  const ownStyle =
    declared && Object.hasOwn(academicPresets, declared)
      ? (declared as AcademicStyle)
      : undefined;
  if (ownStyle && ownStyle !== "free" && !detected.size)
    detected.set(ownStyle, {
      paragraphs: 0,
      evidence: new Set(["Propiedad PrismaAcademicStyle"]),
    });
  const style: AcademicStyle =
    detected.size === 1 ? [...detected.keys()][0] : "free";
  if (detected.size > 1)
    warnings.add(
      "Se detectaron varios estilos declarados. Se conserva el formato de cada sección; el estilo general permanece Libre.",
    );
  if (!detected.size)
    warnings.add(
      "Word no declara una norma académica reconocida. No se deduce APA, IEEE u otra norma solo por la fuente o los márgenes.",
    );
  const declaredLanguage = (parts["word/styles.xml"] ? strFromU8(parts["word/styles.xml"]) : "").match(/<(?:\w+:)?lang\b[^>]*(?:\w+:)?val=["']([^"']+)/)?.[1];
  if(containsVba)warnings.add("El documento contiene VBA. Sus macros no se ejecutan; se conservan con el original y las ediciones de texto compatibles. La reconstrucción DOCX crea una copia sin VBA.");
  const flow: FlowDocument = {
    language: proofingLanguages.find(language=>language.locale.toLowerCase()===declaredLanguage?.toLowerCase())?.id ?? "es",
    layout: layouts[0] ?? defaultLayout(),
    academicStyle: style,
    references: [],
    content: normalizeAcademicDocument(
      {
        type: "doc",
        content: merged.length ? merged : [{ type: "paragraph" }],
      },
      [],
      style,
    ),
  };
  const entries = collectDocumentEntries(flow.content);
  const count = (type: string, n: RichNode = flow.content): number =>
    Number(n.type === type) +
    (n.content ?? []).reduce((sum, c) => sum + count(type, c), 0);
  const report: OfficeImportReport = {
    academicStyles: [...detected].map(([style, hit]) => ({
      style,
      label: academicPresets[style].label,
      paragraphs: hit.paragraphs,
      evidence: [...hit.evidence],
    })),
    fontSubstitutions: [...substitutions].map((original) => ({
      original,
      replacement:
        fontFamilies.find((f) => f.value === fontValue(original))?.label ??
        "Liberation Sans",
    })),
    tables: count("table"),
    images: count("image"),
    captions: count("caption"),
    appendices: entries.appendices.length,
    indices: count("generatedIndex"),
    sections: layouts.length || 1,
    warnings: [...warnings],
  };
  flow.importReport = report;
  return { flow, warnings: [...warnings] };
}
