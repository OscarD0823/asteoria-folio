import {
  PDFDocument,
  rgb,
  PDFString,
  PDFHexString,
  PDFName,
  degrees,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import {
  createFontProvider,
  resolveFontRuns,
  finalizeFontStreams,
} from "./fonts";
import type { LocalFont } from "./local-fonts";
import { inheritedSectionLayout, type SectionInfo } from "./sections";
import {
  normalizeAcademicDocument,
  captionBlocks,
  roman,
  type AcademicStyle,
  type ReferenceRecord,
} from "./academic";

export type RichNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export type PageLayout = {
  format: "a4" | "letter" | "legal" | "a3" | "a5" | "b5" | "tabloid" | "custom";
  orientation: "portrait" | "landscape";
  top: number;
  bottom: number;
  left: number;
  right: number;
  header: string;
  footer: string;
  numbering: boolean;
  columns?: number;
  columnGap?: number;
  customWidth?: number;
  customHeight?: number;
  headerFirst?: string;
  footerFirst?: string;
  headerEven?: string;
  footerEven?: string;
  differentFirst?: boolean;
  oddEven?: boolean;
  pageNumberPosition?: "header-right" | "footer-center" | "footer-right";
  pageNumberStart?: number;
  watermark?: Watermark;
};
export type Watermark = {
  text: string;
  color: string;
  opacity: number;
  angle: number;
  size: number;
  image?: string;
};
export type FlowDocument = {
  fonts?: LocalFont[];
  content: RichNode;
  layout: PageLayout;
  academicStyle?: AcademicStyle;
  references?: ReferenceRecord[];
  pageMap?: Record<string, number>;
  pageLayouts?: PageLayout[];
  pageSections?: string[];
};
export const defaultLayout = (): PageLayout => ({
  format: "a4",
  orientation: "portrait",
  top: 20,
  bottom: 20,
  left: 22,
  right: 22,
  header: "",
  footer: "",
  numbering: false,
});
export const pageSize = (layout: PageLayout): [number, number] => {
  const sizes: Record<string, [number, number]> = {
    a3: [841.89, 1190.55],
    a5: [419.53, 595.28],
    b5: [498.9, 708.66],
    tabloid: [792, 1224],
    custom: [mm(layout.customWidth || 210), mm(layout.customHeight || 297)],
  };
  const base: [number, number] =
    sizes[layout.format] ??
    (layout.format === "letter"
      ? [612, 792]
      : layout.format === "legal"
        ? [612, 1008]
        : [595.28, 841.89]);
  return layout.orientation === "landscape" ? [base[1], base[0]] : base;
};
export const mm = (n: number) => (n * 72) / 25.4;
export const plainText = (node?: RichNode): string =>
  node?.type === "citation"
    ? String(node.attrs?.label ?? "")
    : node?.type === "equation"
      ? String(node.attrs?.latex ?? "")
      : node?.type === "text"
        ? (node.text ?? "")
        : node?.type === "hardBreak"
          ? "\n"
          : (node?.content ?? [])
              .map(plainText)
              .join(node?.type === "doc" ? "\n" : "");
export function safeColor(value: unknown, fallback = "#20273a") {
  if (typeof value !== "string") return fallback;
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  if (/^#[\da-f]{3}$/i.test(value))
    return (
      "#" +
      value
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  const c = value.match(/^rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
  return c
    ? "#" +
        c
          .slice(1)
          .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
          .join("")
    : fallback;
}
const color = (hex: string) =>
  rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
type Style = {
  family: string;
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  background?: string;
  rise: number;
  link?: string;
  comment?: { id: string; text: string; author: string };
};
export type TextDefaults = {
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  lineHeight?: number;
  align?: string;
};
type Run = { text: string; style: Style; font: PDFFont; width: number };
type Line = {
  runs: Run[];
  width: number;
  height: number;
  size: number;
  last: boolean;
};
function styleFor(node: RichNode, defaults: TextDefaults): Style {
  const style: Style = {
    family: defaults.font ?? "PrismaSans",
    size: defaults.size ?? 11,
    bold: defaults.bold ?? false,
    italic: defaults.italic ?? false,
    underline: defaults.underline ?? false,
    strike: defaults.strike ?? false,
    color: safeColor(defaults.color),
    rise: 0,
  };
  for (const mark of node.marks ?? []) {
    if (mark.type === "comment")
      style.comment = {
        id: String(mark.attrs?.id),
        text: String(mark.attrs?.text ?? ""),
        author: String(mark.attrs?.author ?? "Autor"),
      };
    if (mark.type === "bold") style.bold = true;
    if (mark.type === "italic") style.italic = true;
    if (mark.type === "underline") style.underline = true;
    if (mark.type === "strike") style.strike = true;
    if (mark.type === "code") style.family = "PrismaMono";
    if (mark.type === "superscript" || mark.type === "subscript") {
      style.rise =
        mark.type === "superscript" ? style.size * 0.35 : -style.size * 0.2;
      style.size *= 0.72;
    }
    if (mark.type === "link") {
      style.link = String(mark.attrs?.href ?? "");
      style.underline = true;
      style.color = "#5146cc";
    }
    if (mark.type === "textStyle") {
      const a = mark.attrs ?? {};
      if (a.fontFamily) style.family = String(a.fontFamily);
      if (a.fontSize)
        style.size = Math.max(
          6,
          Math.min(144, parseFloat(String(a.fontSize)) || 11),
        );
      if (a.color) style.color = safeColor(a.color);
      if (a.backgroundColor)
        style.background = safeColor(a.backgroundColor, "#ffe88b");
    }
  }
  return style;
}
async function linesFor(
  node: RichNode,
  width: number,
  getFont: ReturnType<typeof createFontProvider>,
  defaults: TextDefaults = {},
  firstWidth = width,
): Promise<Line[]> {
  const lines: Line[] = [];
  let runs: Run[] = [],
    lineWidth = 0,
    maxSize = defaults.size ?? 11;
  const spacing = Number(node.attrs?.lineHeight) || defaults.lineHeight || 1.45;
  const flush = (last = false) => {
    lines.push({
      runs,
      width: lineWidth,
      size: maxSize,
      height: Math.max(defaults.size ?? 11, maxSize) * spacing,
      last,
    });
    runs = [];
    lineWidth = 0;
    maxSize = defaults.size ?? 11;
  };
  const add = async (text: string, style: Style) => {
    const segments = await resolveFontRuns(
      getFont,
      style.family,
      style.bold,
      style.italic,
      text,
    );
    for (const segment of segments) {
      const font = segment.font;
      const measure = (s: string) => {
        try {
          return font.widthOfTextAtSize(s, style.size);
        } catch {
          throw new Error(
            "El texto contiene caracteres no compatibles con esta tipografía. Cambia a Liberation Sans.",
          );
        }
      };
      for (const token of segment.text.replace(/\t/g, "    ").split(/(\s+)/)) {
        if (!token) continue;
        for (const [j, piece] of token.split("\n").entries()) {
          if (j) flush(true);
          if (!piece) continue;
          let tw = measure(piece);
          if (
            lineWidth + tw > (lines.length ? width : firstWidth) &&
            runs.length
          ) {
            flush();
            if (/^\s+$/.test(piece)) continue;
          }
          if (
            tw > (lines.length ? width : firstWidth) &&
            !/^\s+$/.test(piece)
          ) {
            for (const char of Array.from(piece)) {
              tw = measure(char);
              if (
                lineWidth + tw > (lines.length ? width : firstWidth) &&
                runs.length
              )
                flush();
              runs.push({ text: char, style, font, width: tw });
              lineWidth += tw;
              maxSize = Math.max(maxSize, style.size);
            }
          } else {
            runs.push({ text: piece, style, font, width: tw });
            lineWidth += tw;
            maxSize = Math.max(maxSize, style.size);
          }
        }
      }
    }
  };
  const walk = async (n: RichNode): Promise<void> => {
    if (n.type === "hardBreak") {
      flush(true);
      return;
    }
    if (n.type === "citation") {
      await add(String(n.attrs?.label ?? "[?]"), {
        ...styleFor(n, defaults),
        link:
          "#" +
          String(n.attrs?.referenceAnchor ?? "reference-" + n.attrs?.refId),
      });
      return;
    }
    if (n.type === "text") {
      await add(n.text ?? "", styleFor(n, defaults));
      return;
    }
    for (const c of n.content ?? []) await walk(c);
  };
  await walk(node);
  flush(true);
  return lines;
}
const commentsDrawn = new WeakMap<PDFPage, Set<string>>();
function drawLine(
  page: PDFPage,
  line: Line,
  left: number,
  top: number,
  width: number,
  align: string,
  links = true,
) {
  let x =
    left +
    (align === "center"
      ? (width - line.width) / 2
      : align === "right"
        ? width - line.width
        : 0);
  const spaces = line.runs.filter((r) => /^\s+$/.test(r.text)).length;
  const extra =
    align === "justify" && !line.last && spaces
      ? (width - line.width) / spaces
      : 0;
  const baseline = page.getHeight() - top - line.size;
  const runs: Run[] = [];
  for (const run of line.runs) {
    const previous = runs.at(-1);
    if (
      previous &&
      align !== "justify" &&
      previous.font === run.font &&
      JSON.stringify(previous.style) === JSON.stringify(run.style)
    ) {
      previous.text += run.text;
      previous.width += run.width;
    } else runs.push({ ...run });
  }
  for (const run of runs) {
    const s = run.style;
    if (s.comment) {
      const seen = commentsDrawn.get(page) ?? new Set<string>();
      commentsDrawn.set(page, seen);
      if (!seen.has(s.comment.id)) {
        seen.add(s.comment.id);
        const annotation = page.doc.context.obj({
          Type: "Annot",
          Subtype: "Text",
          Rect: [x, baseline, x + 18, baseline + 18],
          Contents: PDFHexString.fromText(s.comment.text),
          T: PDFHexString.fromText(s.comment.author),
          Name: "Comment",
          C: [0.4, 0.35, 0.85],
          F: 4,
        });
        page.node.addAnnot(page.doc.context.register(annotation));
      }
    }
    if (s.background)
      page.drawRectangle({
        x,
        y: baseline - line.size * 0.22,
        width: run.width + extra,
        height: line.size * 1.18,
        color: color(s.background),
      });
    if (run.text.trim())
      page.drawText(run.text, {
        x,
        y: baseline + s.rise,
        size: s.size,
        font: run.font,
        color: color(s.color),
      });
    if (s.underline)
      page.drawLine({
        start: { x, y: baseline - s.size * 0.12 },
        end: { x: x + run.width, y: baseline - s.size * 0.12 },
        thickness: Math.max(0.5, s.size / 18),
        color: color(s.color),
      });
    if (s.strike)
      page.drawLine({
        start: { x, y: baseline + s.size * 0.28 },
        end: { x: x + run.width, y: baseline + s.size * 0.28 },
        thickness: Math.max(0.5, s.size / 18),
        color: color(s.color),
      });
    if (links && s.link && /^(https?:\/\/|mailto:|#)/i.test(s.link)) {
      const annotation = page.doc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x, baseline - s.size * 0.2, x + run.width, baseline + s.size],
        Border: [0, 0, 0],
        A: s.link.startsWith("#")
          ? { Type: "Action", S: "GoTo", D: PDFString.of(s.link.slice(1)) }
          : { Type: "Action", S: "URI", URI: PDFString.of(s.link) },
      });
      page.node.addAnnot(page.doc.context.register(annotation));
    }
    x += run.width + (/^\s+$/.test(run.text) ? extra : 0);
  }
}
export async function drawRichBox(
  doc: PDFDocument,
  page: PDFPage,
  node: RichNode,
  x: number,
  top: number,
  width: number,
  defaults: TextDefaults = {},
  getFont = createFontProvider(doc),
) {
  let y = top;
  for (const paragraph of node.content ?? [node]) {
    const lines = await linesFor(
      paragraph,
      Math.max(10, width),
      getFont,
      defaults,
    );
    for (const line of lines) {
      drawLine(
        page,
        line,
        x,
        y,
        width,
        String(paragraph.attrs?.textAlign ?? defaults.align ?? "left"),
        false,
      );
      y += line.height;
    }
  }
  return y - top;
}
async function buildFlowPass(
  flow: FlowDocument,
  title = "Mi documento",
): Promise<{
  bytes: Uint8Array;
  pageMap: Record<string, number>;
  pageLayouts: PageLayout[];
  pageSections: string[];
}> {
  const doc = await PDFDocument.create(),
    getFont = createFontProvider(doc, flow.fonts);
  let layout = flow.layout,
    [pw, ph] = pageSize(layout);
  const imageCache = new Map<
    string,
    Awaited<ReturnType<typeof doc.embedPng>>
  >();
  const embedImage = async (src: string) => {
    let image = imageCache.get(src);
    if (!image) {
      image = src.startsWith("data:image/png")
        ? await doc.embedPng(src)
        : await doc.embedJpg(src);
      imageCache.set(src, image);
    }
    return image;
  };
  let marginLeft = mm(layout.left),
    right = mm(layout.right),
    top = mm(layout.top),
    bottom = mm(layout.bottom),
    fullWidth = pw - marginLeft - right;
  let columns = Math.max(1, Math.min(3, layout.columns || 1)),
    gap = mm(layout.columnGap ?? 6.35),
    width = (fullWidth - gap * (columns - 1)) / columns;
  let left = marginLeft,
    column = 0;
  let sectionStart = 0,
    numberOffset = (layout.pageNumberStart ?? 1) - 1,
    maxY = top,
    columnTop = top;
  let activeSectionId = "";
  const pageSettings: {
    layout: PageLayout;
    first: number;
    number: number;
    sectionId: string;
  }[] = [];
  const settings = () => ({
    layout: { ...layout },
    first: sectionStart,
    number: doc.getPageCount() + numberOffset,
    sectionId: activeSectionId,
  });
  const pageMap: Record<string, number> = {},
    destinations = new Map<string, unknown>();
  const anchor = (n: RichNode) => {
    maxY = Math.max(maxY, y);
    if (n.attrs?.id) {
      const id = String(n.attrs.id);
      pageMap[id] = doc.getPageCount();
      destinations.set(
        id,
        doc.context.obj([page.ref, PDFName.of("XYZ"), left, ph - y, null]),
      );
    }
  };
  if (width < 80 || ph - top - bottom < 100)
    throw new Error("Reduce los márgenes para dejar espacio al contenido.");
  let page = doc.addPage([pw, ph]),
    y = top;
  pageSettings.push(settings());
  const nextPage = () => {
    page = doc.addPage([pw, ph]);
    y = top;
    maxY = top;
    columnTop = top;
    column = 0;
    left = marginLeft;
    pageSettings.push(settings());
  };
  const nextColumn = () => {
    if (column + 1 >= columns) nextPage();
    else {
      column++;
      left = marginLeft + column * (width + gap);
      y = columnTop;
    }
  };
  const room = (height: number) => {
    if (y + height > ph - bottom && y > top) nextColumn();
  };
  async function paragraph(
    n: RichNode,
    indent = 0,
    prefix = "",
    defaults: TextDefaults = {},
  ) {
    const level = Number(n.attrs?.level) || 1;
    const heading = n.type === "heading";
    const effective = {
      font: "PrismaSans",
      size: heading ? ([26, 21, 17, 14, 12, 11][level - 1] ?? 14) : 12,
      bold: heading,
      ...defaults,
      ...(n.attrs?.fontFamily ? { font: String(n.attrs.fontFamily) } : {}),
      ...(n.attrs?.fontSize ? { size: Number(n.attrs.fontSize) } : {}),
    };
    if (n.attrs?.breakBefore && (y > top || column > 0)) nextPage();
    y += Number(n.attrs?.spaceBefore || 0);
    const hanging = Number(n.attrs?.hangingIndent || 0),
      first = Number(n.attrs?.firstLineIndent || 0);
    const pad = indent + Number(n.attrs?.indent ?? 0) * 18;
    const lines = await linesFor(
      n,
      width - pad - hanging - (prefix ? 15 : 0),
      getFont,
      effective,
      width - pad - first - (prefix ? 15 : 0),
    );
    if (heading) room(lines.reduce((h, l) => h + l.height, 0) + 25);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      room(line.height);
      if (i === 0) anchor(n);
      if (i === 0 && prefix)
        page.drawText(prefix, {
          x: left + pad,
          y: ph - y - line.size,
          font: await getFont("PrismaSans", false, false, prefix),
          size: line.size,
          color: color("#5146cc"),
        });
      drawLine(
        page,
        line,
        left + pad + (i === 0 ? first : hanging) + (prefix ? 15 : 0),
        y,
        width - pad - (i === 0 ? first : hanging) - (prefix ? 15 : 0),
        String(n.attrs?.textAlign ?? "left"),
      );
      y += line.height;
      maxY = Math.max(maxY, y);
    }
    y += Number(n.attrs?.spaceAfter ?? (heading ? 10 : 7));
  }
  async function render(n: RichNode, indent = 0, prefix = ""): Promise<void> {
    if (n.type === "sectionBreak") {
      const section: SectionInfo = {
        id: String(n.attrs?.id ?? ""),
        title: String(n.attrs?.title ?? ""),
        kind: (n.attrs?.kind ?? "nextPage") as SectionInfo["kind"],
        layout: n.attrs?.layout as PageLayout,
        linkToPrevious: n.attrs?.linkToPrevious !== false,
        restartNumbering: n.attrs?.restartNumbering === true,
      };
      const next = inheritedSectionLayout(layout, section),
        size = pageSize(next),
        continuous =
          section.kind === "continuous" &&
          Math.abs(size[0] - pw) < 0.1 &&
          Math.abs(size[1] - ph) < 0.1;
      const used = maxY > top + 0.1 || y > top + 0.1 || column > 0;
      if (!continuous && used) nextPage();
      if (
        !continuous &&
        (section.kind === "oddPage" || section.kind === "evenPage")
      ) {
        const parity = section.kind === "oddPage" ? 1 : 0;
        if (doc.getPageCount() % 2 !== parity) nextPage();
      }
      layout = next;
      [pw, ph] = size;
      marginLeft = mm(layout.left);
      right = mm(layout.right);
      top = mm(layout.top);
      bottom = mm(layout.bottom);
      fullWidth = pw - marginLeft - right;
      columns = Math.max(1, Math.min(3, layout.columns || 1));
      gap = mm(layout.columnGap ?? 6.35);
      width = (fullWidth - gap * (columns - 1)) / columns;
      if (width < 80 || ph - top - bottom < 100)
        throw new Error(
          "Reduce los márgenes de la sección para dejar espacio al contenido.",
        );
      activeSectionId = section.id;
      sectionStart = doc.getPageCount() - 1;
      column = 0;
      left = marginLeft;
      if (section.restartNumbering)
        numberOffset = (layout.pageNumberStart ?? 1) - doc.getPageCount();
      if (continuous && used) {
        y = Math.max(maxY, y, top) + 7;
        columnTop = y;
        sectionStart = doc.getPageCount();
        if (y > ph - bottom - 40) nextPage();
      } else {
        page.setSize(pw, ph);
        y = top;
        maxY = top;
        columnTop = top;
        pageSettings[doc.getPageCount() - 1] = settings();
      }
      anchor(n);
      return;
    }
    if (n.type === "caption") return;
    if (n.type === "generatedIndex") {
      if (
        n.attrs?.kind === "references" &&
        flow.academicStyle === "apa" &&
        (y > top || column > 0)
      )
        nextPage();
      anchor(n);
      await paragraph({
        type: "heading",
        attrs: {
          level: 1,
          fontSize: flow.academicStyle === "apa" ? 12 : 18,
          ...(flow.academicStyle === "apa"
            ? { fontFamily: "PrismaSerif" }
            : {}),
        },
        content: [{ type: "text", text: String(n.attrs?.title || "Índice") }],
      });
      for (const child of n.content ?? []) {
        const target = child.attrs?.targetId;
        await paragraph(
          target && n.attrs?.kind !== "references"
            ? {
                ...child,
                content: (child.content ?? []).map((c) => ({
                  ...c,
                  marks: [
                    ...(c.marks ?? []),
                    { type: "link", attrs: { href: "#" + target } },
                  ],
                })),
              }
            : child,
        );
      }
      y += 10;
      return;
    }
    if (n.type === "appendix") {
      await paragraph({
        ...n,
        type: "heading",
        attrs: {
          ...n.attrs,
          level: 1,
          fontSize: flow.academicStyle === "apa" ? 12 : 20,
        },
        content: [
          {
            type: "text",
            text: [n.attrs?.label, n.attrs?.title].filter(Boolean).join(": "),
          },
        ],
      });
      return;
    }
    if (n.type === "columnBreak") {
      nextColumn();
      return;
    }
    if (
      n.type === "paragraph" ||
      n.type === "heading" ||
      n.type === "codeBlock"
    ) {
      await paragraph(
        n,
        indent,
        prefix,
        n.type === "codeBlock" ? { font: "PrismaMono", size: 10 } : {},
      );
      return;
    }
    if (n.type === "pageBreak") {
      nextPage();
      return;
    }
    if (n.type === "horizontalRule") {
      room(14);
      page.drawLine({
        start: { x: left, y: ph - y - 4 },
        end: { x: left + width, y: ph - y - 4 },
        thickness: 0.8,
        color: color("#cbd0de"),
      });
      y += 18;
      return;
    }
    if (
      ["image", "equation", "chart", "shape", "video"].includes(n.type ?? "")
    ) {
      const src = String(n.attrs?.src ?? "");
      if (!/^data:image\/(png|jpeg);base64,/i.test(src)) return;
      const image = await embedImage(src);
      const iw = Math.min(
          width,
          Math.max(
            20,
            Number(n.attrs?.width) * 0.75 ||
              Math.min(image.width * 0.75, width),
          ),
        ),
        ih = (iw * image.height) / image.width;
      const fit = Math.min(1, (ph - top - bottom - 10) / ih),
        sw = iw * fit,
        sh = ih * fit;
      room(sh + 10);
      anchor(n);
      const align = String(n.attrs?.align ?? "left"),
        x =
          left +
          (align === "center"
            ? (width - sw) / 2
            : align === "right"
              ? width - sw
              : 0);
      page.drawImage(image, { x, y: ph - y - sh, width: sw, height: sh });
      if (
        n.type === "video" &&
        /^(https?:\/\/)/i.test(String(n.attrs?.url ?? ""))
      ) {
        const annotation = doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [x, ph - y - sh, x + sw, ph - y],
          Border: [0, 0, 0],
          A: {
            Type: "Action",
            S: "URI",
            URI: PDFString.of(String(n.attrs?.url)),
          },
        });
        page.node.addAnnot(doc.context.register(annotation));
      }
      y += sh + 12;
      return;
    }
    if (n.type === "table") {
      const rows = n.content ?? [],
        columns = Math.max(
          1,
          ...rows.map((row) =>
            (row.content ?? []).reduce(
              (sum, c) => sum + (Number(c.attrs?.colspan) || 1),
              0,
            ),
          ),
        ),
        occupied: number[] = [],
        columnWidths = Array(columns).fill(width / columns);
      type Cell = {
        node: RichNode;
        row: number;
        column: number;
        span: number;
        rowspan: number;
        lines: Line[];
        width: number;
      };
      const cells: Cell[] = [];
      for (const [rowIndex, row] of rows.entries()) {
        let col = 0;
        for (const cell of row.content ?? []) {
          while ((occupied[col] ?? 0) > rowIndex) col++;
          const span = Math.max(1, Number(cell.attrs?.colspan) || 1),
            rowspan = Math.min(
              rows.length - rowIndex,
              Math.max(1, Number(cell.attrs?.rowspan) || 1),
            );
          const widths = cell.attrs?.colwidth as number[] | undefined;
          if (Array.isArray(widths))
            for (let j = 0; j < span; j++)
              if (Number(widths[j]) > 0 && col + j < columns)
                columnWidths[col + j] = Number(widths[j]) * 0.75;
          cells.push({
            node: cell,
            row: rowIndex,
            column: col,
            span,
            rowspan,
            lines: [],
            width: 0,
          });
          for (let j = 0; j < span; j++) occupied[col + j] = rowIndex + rowspan;
          col += span;
        }
      }
      const total = columnWidths.reduce((sum, v) => sum + v, 0);
      for (let j = 0; j < columns; j++) columnWidths[j] *= width / total;
      const heights = Array(rows.length).fill(28);
      for (const c of cells) {
        c.width = columnWidths
          .slice(c.column, c.column + c.span)
          .reduce((s, v) => s + v, 0);
        for (const child of c.node.content ?? [])
          c.lines.push(
            ...(await linesFor(child, Math.max(10, c.width - 16), getFont, {
              size: flow.academicStyle === "apa" ? 12 : 10,
              font: flow.academicStyle === "apa" ? "PrismaSerif" : "PrismaSans",
              bold: c.node.type === "tableHeader",
            })),
          );
        const needed = c.lines.reduce((s, l) => s + l.height, 0) + 14;
        if (c.rowspan === 1) heights[c.row] = Math.max(heights[c.row], needed);
      }
      for (const c of cells.filter((c) => c.rowspan > 1)) {
        const needed = c.lines.reduce((s, l) => s + l.height, 0) + 14,
          current = heights
            .slice(c.row, c.row + c.rowspan)
            .reduce((s, v) => s + v, 0);
        if (needed > current)
          heights[c.row + c.rowspan - 1] += needed - current;
      }
      let rowIndex = 0;
      while (rowIndex < rows.length) {
        let end = rowIndex + 1;
        for (let i = rowIndex; i < end; i++)
          for (const c of cells.filter((c) => c.row === i))
            end = Math.max(end, c.row + c.rowspan);
        const groupHeight = heights
          .slice(rowIndex, end)
          .reduce((s, v) => s + v, 0);
        if (groupHeight > ph - top - bottom)
          throw new Error(
            "La fila o las celdas unidas de la tabla son más altas que la página. Divide su contenido o reduce la letra.",
          );
        room(groupHeight);
        if (rowIndex === 0) anchor(n);
        const tops = [y];
        for (let i = rowIndex; i < end; i++)
          tops.push(tops.at(-1)! + heights[i]);
        for (const c of cells.filter((c) => c.row >= rowIndex && c.row < end)) {
          const x =
              left + columnWidths.slice(0, c.column).reduce((s, v) => s + v, 0),
            cy = tops[c.row - rowIndex],
            height = heights
              .slice(c.row, c.row + c.rowspan)
              .reduce((s, v) => s + v, 0);
          page.drawRectangle({
            x,
            y: ph - cy - height,
            width: c.width,
            height,
            color: color(
              flow.academicStyle !== "apa" && c.node.type === "tableHeader"
                ? "#eeedff"
                : "#ffffff",
            ),
            borderColor: color("#ccd0df"),
            borderWidth: flow.academicStyle === "apa" ? 0 : 0.65,
          });
          let textY = cy + 7;
          for (const line of c.lines) {
            drawLine(
              page,
              line,
              x + 8,
              textY,
              c.width - 16,
              String(c.node.content?.[0]?.attrs?.textAlign ?? "left"),
            );
            textY += line.height;
          }
        }
        if (flow.academicStyle === "apa") {
          if (rowIndex === 0)
            page.drawLine({
              start: { x: left, y: ph - y },
              end: { x: left + width, y: ph - y },
              thickness: 1,
              color: color("#20273a"),
            });
          if (end === 1 || end === rows.length)
            page.drawLine({
              start: { x: left, y: ph - y - groupHeight },
              end: { x: left + width, y: ph - y - groupHeight },
              thickness: 1,
              color: color("#20273a"),
            });
        }
        y += groupHeight;
        rowIndex = end;
      }
      y += 12;
      return;
    }
    if (n.type === "bulletList" || n.type === "orderedList") {
      let number = Number(n.attrs?.start) || 1;
      for (const item of n.content ?? []) {
        let first = true;
        for (const child of item.content ?? []) {
          await render(
            child,
            indent + 12,
            first
              ? n.type === "bulletList"
                ? { circle: "◦", square: "▪", check: "✓", arrow: "→" }[
                    String(n.attrs?.listStyle)
                  ] || "•"
                : `${(() => {
                    const style = String(n.attrs?.listStyle);
                    const label = style.includes("roman")
                      ? roman(number)
                      : style.includes("alpha")
                        ? String.fromCharCode(97 + ((number - 1) % 26))
                        : String(number);
                    return style.startsWith("upper")
                      ? label.toUpperCase()
                      : label;
                  })()}.`
              : "",
          );
          first = false;
        }
        number++;
      }
      return;
    }
    if (n.type === "blockquote") {
      const start = y;
      for (const child of n.content ?? []) await render(child, indent + 18);
      if (y >= start)
        page.drawLine({
          start: { x: left + indent + 4, y: ph - start },
          end: { x: left + indent + 4, y: ph - y },
          thickness: 2,
          color: color("#aaa2eb"),
        });
      return;
    }
    for (const child of n.content ?? []) {
      if (child.type === "caption") continue;
      const cap = (n.content ?? []).find(
        (c) => c.type === "caption" && c.attrs?.targetId === child.attrs?.id,
      );
      const blocks = cap
        ? captionBlocks(cap, flow.academicStyle ?? "free")
        : { before: [], after: [] };
      if (blocks.before.length) {
        let captionHeight = 0;
        for (const block of blocks.before) {
          const lines = await linesFor(block, width, getFont);
          captionHeight +=
            lines.reduce((sum, line) => sum + line.height, 0) +
            Number(block.attrs?.spaceBefore || 0) +
            Number(block.attrs?.spaceAfter ?? 7);
        }
        let objectHeight = 30;
        const src = String(child.attrs?.src || "");
        if (/^data:image\/(png|jpeg);base64,/i.test(src)) {
          const image = await embedImage(src);
          const iw = Math.min(
            width,
            Number(child.attrs?.width) * 0.75 || image.width * 0.75,
          );
          objectHeight =
            Math.min(
              (iw * image.height) / image.width,
              ph - top - bottom - captionHeight - 12,
            ) + 12;
        } else if (child.type === "table") {
          const cells = child.content?.[0]?.content ?? [];
          for (const cell of cells) {
            let height = 14;
            for (const block of cell.content ?? [])
              height += (
                await linesFor(
                  block,
                  Math.max(10, width / Math.max(1, cells.length) - 16),
                  getFont,
                  { size: flow.academicStyle === "apa" ? 12 : 10 },
                )
              ).reduce((sum, line) => sum + line.height, 0);
            objectHeight = Math.max(objectHeight, height);
          }
        }
        room(captionHeight + objectHeight);
      }
      for (const b of blocks.before) await render(b, indent);
      await render(child, indent, prefix);
      maxY = Math.max(maxY, y);
      for (const b of blocks.after) await render(b, indent);
    }
  }
  await render(flow.content);
  for (const [index, p] of doc.getPages().entries()) {
    const setting = pageSettings[index],
      layout = setting.layout,
      [pw, ph] = pageSize(layout),
      marginLeft = mm(layout.left),
      right = mm(layout.right),
      top = mm(layout.top),
      bottom = mm(layout.bottom),
      fullWidth = pw - marginLeft - right,
      first = index === setting.first;
    const header =
      layout.differentFirst && first
        ? (layout.headerFirst ?? "")
        : layout.oddEven && index % 2 === 1
          ? (layout.headerEven ?? layout.header)
          : layout.header;
    const footer =
      layout.differentFirst && first
        ? (layout.footerFirst ?? "")
        : layout.oddEven && index % 2 === 1
          ? (layout.footerEven ?? layout.footer)
          : layout.footer;
    if (header)
      await drawRichBox(
        doc,
        p,
        {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: header }] },
          ],
        },
        marginLeft,
        Math.max(8, top * 0.4) - 9,
        fullWidth,
        { size: 9 },
        getFont,
      );
    if (footer)
      await drawRichBox(
        doc,
        p,
        {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: footer }] },
          ],
        },
        marginLeft,
        ph - Math.max(15, bottom * 0.5),
        fullWidth,
        { size: 9 },
        getFont,
      );
    if (layout.numbering) {
      const label = layout.pageNumberPosition
          ? String(setting.number)
          : `${index + 1} / ${doc.getPageCount()}`,
        font = await getFont("PrismaSans", false, false, label),
        pos = layout.pageNumberPosition ?? "footer-right";
      p.drawText(label, {
        x:
          pos === "footer-center"
            ? (pw - font.widthOfTextAtSize(label, 10)) / 2
            : pw - right - font.widthOfTextAtSize(label, 10),
        y:
          pos === "header-right"
            ? ph - Math.max(18, top * 0.5)
            : Math.max(12, bottom * 0.4),
        font,
        size: 10,
        color: color("#20273a"),
      });
    }
    if (layout.watermark?.text || layout.watermark?.image)
      await drawWatermark(doc, p, layout.watermark, getFont);
  }
  if (destinations.size) {
    const names: unknown[] = [];
    for (const [id, dest] of [...destinations].sort((a, b) =>
      a[0].localeCompare(b[0]),
    ))
      names.push(PDFString.of(id), dest);
    doc.catalog.set(
      PDFName.of("Names"),
      doc.context.obj({
        Dests: doc.context.obj({ Names: doc.context.obj(names as never[]) }),
      }),
    );
  }
  doc.setTitle(title);
  doc.setCreator("Prisma PDF");
  doc.setProducer("Prisma PDF · documentos");
  await finalizeFontStreams(doc);
  return {
    bytes: await doc.save(),
    pageMap,
    pageLayouts: pageSettings.map((s) => s.layout),
    pageSections: pageSettings.map((s) => s.sectionId),
  };
}

export async function drawWatermark(
  doc: PDFDocument,
  page: PDFPage,
  mark: Watermark,
  getFont = createFontProvider(doc),
  dimensions = page.getSize(),
) {
  const opacity = Math.max(0, Math.min(1, mark.opacity)),
    { width: w, height: h } = dimensions;
  if (mark.image && /^data:image\/(png|jpeg);base64,/i.test(mark.image)) {
    const image = mark.image.startsWith("data:image/png")
        ? await doc.embedPng(mark.image)
        : await doc.embedJpg(mark.image),
      width = w * 0.65,
      height = (width * image.height) / image.width;
    page.drawImage(image, {
      x: (w - width) / 2,
      y: (h - height) / 2,
      width,
      height,
      opacity,
      rotate: degrees(mark.angle),
    });
  } else if (mark.text) {
    const font = await getFont("PrismaSans", false, false, mark.text),
      size = Math.max(
        10,
        Math.min(mark.size, (w * 0.8) / font.widthOfTextAtSize(mark.text, 1)),
      ),
      width = font.widthOfTextAtSize(mark.text, size);
    const a = (mark.angle * Math.PI) / 180;
    page.drawText(mark.text, {
      x: w / 2 - (width / 2) * Math.cos(a),
      y: h / 2 - (width / 2) * Math.sin(a),
      font,
      size,
      color: color(safeColor(mark.color, "#9298a5")),
      opacity,
      rotate: degrees(mark.angle),
    });
  }
}
export async function buildFlowDocument(
  flow: FlowDocument,
  title = "Mi documento",
) {
  let content = normalizeAcademicDocument(
      flow.content,
      flow.references ?? [],
      flow.academicStyle ?? "free",
    ),
    result: Awaited<ReturnType<typeof buildFlowPass>> | undefined;
  const paginate = (node: RichNode, map: Record<string, number>): RichNode => ({
    ...node,
    attrs: {
      ...node.attrs,
      ...(node.attrs?.id && map[String(node.attrs.id)]
        ? { page: map[String(node.attrs.id)] }
        : {}),
    },
    ...(node.content
      ? { content: node.content.map((n) => paginate(n, map)) }
      : {}),
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    result = await buildFlowPass({ ...flow, content }, title);
    const updated = normalizeAcademicDocument(
      paginate(content, result.pageMap),
      flow.references ?? [],
      flow.academicStyle ?? "free",
    );
    if (JSON.stringify(updated) === JSON.stringify(content)) break;
    content = updated;
  }
  return { ...result!, content };
}
export async function buildFlowPdf(
  flow: FlowDocument,
  title = "Mi documento",
): Promise<Uint8Array> {
  return (await buildFlowDocument(flow, title)).bytes;
}
