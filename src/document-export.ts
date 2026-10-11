import {proofingLanguage} from './proofing-languages';
import { PDFDocument } from "pdf-lib";
import {preserveOfficeDocx} from './office-engines';
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  ExternalHyperlink,
  InternalHyperlink,
  Bookmark,
  Header,
  Footer,
  PageNumber,
  PageOrientation,
  SectionType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  ColumnBreak,
  TableOfContents,
  TabStopType,
  LeaderType,
  SimpleField,
  type ParagraphChild,
  type ISectionOptions,
} from "docx";
import {
  academicPlainText,
  captionBlocks,
  normalizeAcademicDocument,
  roman,
  academicPresets,
} from "./academic";
import { documentSections } from "./sections";
import { fontFamilies, fontFile, readFontFile } from "./fonts";
import { decodeFont, encodeFont, type LocalFont } from "./local-fonts";
import {
  pageSize,
  mm,
  type FlowDocument,
  type RichNode,
  type PageLayout,
} from "./flow";
export type DocumentFormat = "docx" | "html" | "txt" | "md";
const escape = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const href = (value: unknown) =>
  typeof value === "string" &&
  /^(https?:\/\/|mailto:|#[a-z0-9_-]+)/i.test(value)
    ? value
    : "";
const safeFont = (family: string, fonts: LocalFont[]) =>
  fonts.find((f) => f.value === family)?.label ??
  fontFamilies.find((f) => f.value === family)?.label ??
  "Liberation Sans";
const walk = (n: RichNode, fn: (n: RichNode) => void) => {
  fn(n);
  n.content?.forEach((c) => walk(c, fn));
};
function familiesUsed(content: RichNode) {
  const names = new Set(["PrismaSans"]);
  walk(content, (n) => {
    if (n.attrs?.fontFamily) names.add(String(n.attrs.fontFamily));
    for (const m of n.marks ?? [])
      if (m.attrs?.fontFamily) names.add(String(m.attrs.fontFamily));
  });
  return names;
}
async function fontFaces(content: RichNode, fonts: LocalFont[]) {
  const result: {
    family: string;
    label: string;
    style: string;
    bytes: Uint8Array;
  }[] = [];
  for (const family of familiesUsed(content)) {
    const local = fonts.filter((f) => f.value === family);
    if (local.length) {
      for (const f of local)
        result.push({
          family,
          label: f.label,
          style: f.style,
          bytes: decodeFont(f.bytes),
        });
      continue;
    }
    const known = fontFamilies.find((f) => f.value === family);
    if (!known?.file && !known?.styles) continue;
    for (const [style, bold, italic] of [
      ["Regular", false, false],
      ["Bold", true, false],
      ["Italic", false, true],
      ["BoldItalic", true, true],
    ] as const) {
      const file = fontFile(family, bold, italic);
      if (!file) continue;
      if (known.styles && !known.styles[style]) continue;
      result.push({
        family,
        label: known.label,
        style,
        bytes: await readFontFile(file),
      });
    }
  }
  return result;
}
const bookmark = (id: unknown) =>
  "p_" +
  String(id ?? "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 37);
function withCaptions(parent: RichNode, flow: FlowDocument): RichNode[] {
  const result: RichNode[] = [];
  for (const n of parent.content ?? []) {
    if (n.type === "caption") continue;
    const cap = parent.content?.find(
        (c) => c.type === "caption" && c.attrs?.targetId === n.attrs?.id,
      ),
      blocks = cap
        ? captionBlocks(cap, flow.academicStyle ?? "free")
        : { before: [], after: [] };
    const labels = [...blocks.before, ...blocks.after];
    if (cap && labels.length) {
      const label =
        flow.academicStyle === "ieee" && cap.attrs?.kind === "figure"
          ? blocks.after[0]
          : blocks.before[0];
      if (label)
        label.attrs = {
          ...label.attrs,
          spaceAfter:
            blocks.before[1]?.attrs?.spaceAfter ?? label.attrs?.spaceAfter,
          wordCaption: cap.attrs,
        };
      if (blocks.before[1])
        blocks.before[1].attrs = {
          ...blocks.before[1].attrs,
          wordCaptionContinuation: true,
        };
    }
    result.push(...blocks.before, n, ...blocks.after);
  }
  return result;
}
async function imageData(n: RichNode) {
  const src = String(n.attrs?.src ?? "");
  if (!/^data:image\/(png|jpeg);base64,/.test(src)) return null;
  const type = src.startsWith("data:image/png") ? "png" : "jpg",
    data = decodeFont(src.split(",")[1]),
    pdf = await PDFDocument.create(),
    image =
      type === "png" ? await pdf.embedPng(data) : await pdf.embedJpg(data);
  return { type, data, width: image.width, height: image.height } as const;
}
export async function exportDocx(
  flow: FlowDocument,
  title: string,
  fonts: LocalFont[] = [],
): Promise<Uint8Array> {
  const preserved=await preserveOfficeDocx(flow);
  if(preserved)return preserved;
  const normalized = {
    ...flow,
    content: normalizeAcademicDocument(
      flow.content,
      flow.references ?? [],
      flow.academicStyle ?? "free",
    ),
  };
  const faces = await fontFaces(normalized.content, fonts),
    kit = (await import("@pdf-lib/fontkit")).default,
    wordNames = new Map<string, string>();
  for (const face of faces) {
    const name = (kit.create(face.bytes) as { familyName: string }).familyName;
    if (name) {
      face.label = name;
      wordNames.set(face.family, name);
    }
  }
  const wordFont = (family: string) =>
    wordNames.get(family) ?? safeFont(family, fonts);
  const comments: {
      id: number;
      author: string;
      date: Date;
      children: Paragraph[];
    }[] = [],
    commentIds = new Map<string, number>();
  const inline = (
    n: RichNode,
    base: Record<string, unknown> = {},
  ): ParagraphChild[] => {
    if (n.type === "hardBreak") return [new TextRun({ break: 1 })];
    if (n.type === "citation") {
      const run = new TextRun({ text: String(n.attrs?.label ?? "[?]") });
      return n.attrs?.referenceAnchor
        ? [
            new InternalHyperlink({
              anchor: bookmark(n.attrs.referenceAnchor),
              children: [run],
            }),
          ]
        : [run];
    }
    if (n.type !== "text")
      return (n.content ?? []).flatMap((c) => inline(c, base));
    const marks = n.marks ?? [],
      attrs = { ...base, ...marks.find((m) => m.type === "textStyle")?.attrs };
    const size = parseFloat(String(attrs.fontSize ?? 11)),
      run = new TextRun({
        text: n.text ?? "",
        font: wordFont(String(attrs.fontFamily ?? "PrismaSans")),
        size: Math.round(size * 2),
        bold: !!attrs.bold || marks.some((m) => m.type === "bold"),
        italics: marks.some((m) => m.type === "italic"),
        underline: marks.some((m) => m.type === "underline") ? {} : undefined,
        strike: marks.some((m) => m.type === "strike"),
        superScript: marks.some((m) => m.type === "superscript"),
        subScript: marks.some((m) => m.type === "subscript"),
        color: /^#[\da-f]{6}$/i.test(String(attrs.color))
          ? String(attrs.color).slice(1)
          : undefined,
        shading: /^#[\da-f]{6}$/i.test(String(attrs.backgroundColor))
          ? { fill: String(attrs.backgroundColor).slice(1) }
          : undefined,
      });
    const link = href(marks.find((m) => m.type === "link")?.attrs?.href),
      body: ParagraphChild[] = link
        ? [
            link.startsWith("#")
              ? new InternalHyperlink({
                  anchor: bookmark(link.slice(1)),
                  children: [run],
                })
              : new ExternalHyperlink({ link, children: [run] }),
          ]
        : [run];
    const comment = marks.find((m) => m.type === "comment");
    if (comment?.attrs) {
      const key = String(comment.attrs.id);
      let id = commentIds.get(key);
      if (id === undefined) {
        id = comments.length;
        commentIds.set(key, id);
        comments.push({
          id,
          author: String(comment.attrs.author || "Autor"),
          date: new Date(),
          children: [new Paragraph(String(comment.attrs.text ?? ""))],
        });
      }
      return [
        new CommentRangeStart(id),
        ...body,
        new CommentRangeEnd(id),
        new CommentReference(id),
      ];
    }
    return body;
  };
  const alignment = (value: unknown) =>
    ({
      left: AlignmentType.LEFT,
      right: AlignmentType.RIGHT,
      center: AlignmentType.CENTER,
      justify: AlignmentType.JUSTIFIED,
    })[String(value)] ?? AlignmentType.LEFT;
  const academicNames = new Map<
    string,
    { id: string; name: string; basedOn: string }
  >();
  const paragraphName = (node: RichNode) => {
    const a = node.attrs ?? {};
    if (a.wordCaption) return "Caption";
    const base =
      a.paragraphStyle === "title"
        ? "Title"
        : a.paragraphStyle === "subtitle"
          ? "Subtitle"
          : "Normal";
    if (node.type === "heading") return undefined;
    if (
      typeof a.academicStyle === "string" &&
      a.academicStyle !== "free" &&
      Object.hasOwn(academicPresets, a.academicStyle)
    ) {
      const id = String(a.academicStyle).toUpperCase() + base;
      academicNames.set(id, {
        id,
        name: String(a.academicStyle).toUpperCase() + " " + base,
        basedOn: base,
      });
      return id;
    }
    return base;
  };
  const blocks = async (
    parent: RichNode,
    layout: PageLayout,
    depth = 0,
    listPrefix = "",
    tableHeader = false,
  ): Promise<(Paragraph | Table | TableOfContents)[]> => {
    const children: (Paragraph | Table | TableOfContents)[] = [];
    for (const node of withCaptions(parent, normalized)) {
      const a = node.attrs ?? {};
      if (a.wordCaptionContinuation) continue;
      if (
        ["paragraph", "heading", "codeBlock", "appendix"].includes(
          node.type ?? "",
        )
      ) {
        const caption = a.wordCaption as Record<string, unknown> | undefined;
        const capKind = caption?.kind === "table" ? "Tabla" : "Figura";
        const content = caption
          ? [
              new TextRun({
                text:
                  (normalized.academicStyle === "ieee"
                    ? caption.kind === "table"
                      ? "TABLA "
                      : "Fig. "
                    : capKind + " ") + String(caption.appendixLetter || ""),
                bold: true,
              }),
              new SimpleField(
                "SEQ " +
                  capKind +
                  (caption.appendixLetter && Number(caption.number) === 1
                    ? " \\r 1"
                    : "") +
                  " \\* " +
                  (normalized.academicStyle === "ieee" &&
                  caption.kind === "table"
                    ? "ROMAN"
                    : "ARABIC"),
                normalized.academicStyle === "ieee" && caption.kind === "table"
                  ? roman(Number(caption.number))
                  : String(caption.number),
              ),
              ...(caption.title
                ? [
                    new TextRun({
                      text: String(caption.title),
                      break: 1,
                      italics: normalized.academicStyle === "apa",
                    }),
                  ]
                : []),
            ]
          : node.type === "appendix"
            ? [new TextRun([a.label, a.title].filter(Boolean).join(": "))]
            : inline(node, {...a, bold: tableHeader || node.type === "heading", color: a.color ?? "#20273a"});
        if (listPrefix) content.unshift(new TextRun(listPrefix + " "));
        const first = Number(a.firstLineIndent) || 0,
          hanging = Number(a.hangingIndent) || 0,
          left =
            (Number(a.indent) || depth) * 240 +
            (hanging > 0 ? hanging * 20 : 0);
        children.push(
          new Paragraph({
            children: a.id
              ? [new Bookmark({ id: bookmark(a.id), children: content })]
              : content,
            alignment: alignment(a.textAlign),
            style: paragraphName(node),
            keepNext: !!caption,
            heading:
              node.type === "heading"
                ? [
                    HeadingLevel.HEADING_1,
                    HeadingLevel.HEADING_2,
                    HeadingLevel.HEADING_3,
                    HeadingLevel.HEADING_4,
                    HeadingLevel.HEADING_5,
                    HeadingLevel.HEADING_6,
                  ][Math.min(5, Number(a.level || 1) - 1)]
                : undefined,
            ...(a.indexEntry
              ? {
                  tabStops: [
                    {
                      type: TabStopType.RIGHT,
                      position: Math.round(
                        (pageSize(layout)[0] - mm(layout.left + layout.right)) *
                          20,
                      ),
                      leader:
                        a.indexLeader === "none"
                          ? LeaderType.NONE
                          : a.indexLeader === "line"
                            ? LeaderType.UNDERSCORE
                            : a.indexLeader === "dashes"
                              ? LeaderType.HYPHEN
                              : LeaderType.DOT,
                    },
                  ],
                  indent: {
                    left: Math.max(0, Number(a.indexLevel || 1) - 1) * 360,
                  },
                }
              : {}),
            spacing: {
              before: Math.round(Number(a.spaceBefore || 0) * 20),
              after: Math.round(Number(a.spaceAfter ?? (node.type === "heading" ? 10 : 7)) * 20),
              line: Math.round(Number(a.lineHeight ?? 1.45) * 240),
            },
            indent: {
              left,
              firstLine: first > 0 ? Math.round(first * 20) : undefined,
              hanging:
                hanging > 0
                  ? Math.round(hanging * 20)
                  : first < 0
                    ? Math.round(-first * 20)
                    : undefined,
            },
            pageBreakBefore: a.breakBefore === true,
          }),
        );
      } else if (node.type === "table") {
        const rows: TableRow[] = [];
        const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          edge = { style: BorderStyle.SINGLE, size: 6, color: "20273A" };
        for (const row of node.content ?? []) {
          const cells: TableCell[] = [];
          for (const cell of row.content ?? []) {
            const cellFlow = {...cell, content: cell.content?.map(child=>['paragraph','heading'].includes(child.type??'')?{...child,attrs:{...child.attrs,spaceAfter:0}}:child)};
            const content = await blocks(cellFlow, layout, depth, "", cell.type === "tableHeader"),
              academic = a.tableStyle === "academic";
            cells.push(
              new TableCell({
                children: content.length
                  ? content.filter(
                      (child): child is Paragraph | Table =>
                        !(child instanceof TableOfContents),
                    )
                  : [new Paragraph("")],
                columnSpan: Number(cell.attrs?.colspan) || 1,
                rowSpan: Number(cell.attrs?.rowspan) || 1,
                ...(Array.isArray(cell.attrs?.colwidth)
                  ? {
                      width: {
                        size:
                          (cell.attrs.colwidth as number[]).reduce(
                            (sum, w) => sum + Number(w || 0),
                            0,
                          ) * 15,
                        type: "dxa" as const,
                      },
                    }
                  : {}),
                margins: { top: 140, bottom: 140, left: 160, right: 160 },
                shading: cell.type === "tableHeader" && !academic ? {fill:"EEEDFF"} : undefined,
                borders: academic
                  ? { left: none, right: none, top: edge, bottom: edge }
                  : {left:{...edge,size:5,color:"CCD0DF"},right:{...edge,size:5,color:"CCD0DF"},top:{...edge,size:5,color:"CCD0DF"},bottom:{...edge,size:5,color:"CCD0DF"}},
              }),
            );
          }
          rows.push(
            new TableRow({
              children: cells,
              tableHeader: (row.content ?? []).some(
                (c) => c.type === "tableHeader",
              ),
            }),
          );
        }
        const columnWidths = (node.content?.[0]?.content ?? []).flatMap((c) =>
          Array.isArray(c.attrs?.colwidth)
            ? (c.attrs.colwidth as number[]).map((w) =>
                Math.round(Number(w) * 15),
              )
            : [],
        );
        children.push(
          new Table({
            rows,
            width: { size: 100, type: "pct" },
            ...(columnWidths.length ? { columnWidths } : {}),
          }),
        );
      } else if (
        ["image", "equation", "chart", "shape", "video"].includes(
          node.type ?? "",
        )
      ) {
        const image = await imageData(node);
        if (!image) continue;
        const maxWidth =
          (((pageSize(layout)[0] -
            mm(layout.left + layout.right) -
            mm(layout.columnGap ?? 6.35) * ((layout.columns || 1) - 1)) /
            (layout.columns || 1)) *
            4) /
          3;
        const w = Math.min(maxWidth, Number(a.width) || image.width),
          h = (w * image.height) / image.width;
        const run = new ImageRun({
          type: image.type,
          data: image.data,
          transformation: { width: w, height: h },
          altText: {
            title: String(a.title ?? node.type),
            description: String(a.alt ?? a.latex ?? ""),
            name: String(a.id ?? node.type),
          },
        });
        children.push(
          new Paragraph({
            children: a.id
              ? [new Bookmark({ id: bookmark(a.id), children: [run] })]
              : [run],
            alignment: alignment(a.align),
          }),
        );
        if (node.type === "video" && href(a.url))
          children.push(
            new Paragraph({
              children: [
                new ExternalHyperlink({
                  link: String(a.url),
                  children: [new TextRun("Abrir video")],
                }),
              ],
            }),
          );
      } else if (node.type === "pageBreak")
        children.push(
          new Paragraph({
            children: [new TextRun({ break: 1 })],
            pageBreakBefore: true,
          }),
        );
      else if (node.type === "columnBreak")
        children.push(new Paragraph({ children: [new ColumnBreak()] }));
      else if (node.type === "horizontalRule")
        children.push(
          new Paragraph({
            border: {
              bottom: { color: "CBD0DE", size: 6, style: BorderStyle.SINGLE },
            },
          }),
        );
      else if (node.type === "generatedIndex") {
        children.push(
          new Paragraph({
            text: String(a.title || "Índice"),
            alignment:
              normalized.academicStyle === "apa"
                ? AlignmentType.CENTER
                : AlignmentType.LEFT,
          }),
        );
        if (["contents", "tables", "figures"].includes(String(a.kind)))
          children.push(
            new TableOfContents(String(a.title || "Tabla de contenido"), {
              hyperlink: true,
              ...(a.kind === "contents"
                ? {
                    headingStyleRange:
                      "1-" + Math.max(1, Math.min(6, Number(a.levels) || 3)),
                  }
                : {
                    captionLabelIncludingNumbers:
                      a.kind === "tables" ? "Tabla" : "Figura",
                  }),
              beginDirty: true,
              cachedEntries: (
                (a.entries as {
                  label: string;
                  level?: number;
                  page?: number;
                  targetId: string;
                }[]) || []
              ).map((entry) => ({
                title: entry.label,
                level: entry.level || 1,
                ...(a.pageNumbers !== false && entry.page
                  ? { page: entry.page }
                  : {}),
                href: bookmark(entry.targetId),
              })),
            }),
          );
        else children.push(...(await blocks(node, layout, depth)));
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        let i = Number(a.start) || 1;
        for (const item of node.content ?? []) {
          children.push(
            ...(await blocks(
              item,
              layout,
              depth + 1,
              node.type === "orderedList" ? String(i++) + "." : "•",
            )),
          );
        }
      } else children.push(...(await blocks(node, layout, depth)));
    }
    return children;
  };
  const infos = documentSections(normalized.content, flow.layout),
    sections: ISectionOptions[] = [];
  let group: RichNode[] = [];
  const groups: RichNode[][] = [];
  for (const n of normalized.content.content ?? []) {
    if (n.type === "sectionBreak") {
      groups.push(group);
      group = [];
    } else group.push(n);
  }
  groups.push(group);
  for (const [i, info] of infos.entries()) {
    const layout = info.layout,
      [pw, ph] = pageSize({ ...layout, orientation: "portrait" }),
      where = layout.pageNumberPosition ?? "footer-right";
    const header = (text: string, number: boolean) =>
      new Paragraph({
        children: [
          new TextRun(text),
          ...(number
            ? [new TextRun({ children: [" ", PageNumber.CURRENT] })]
            : []),
        ],
        alignment: AlignmentType.RIGHT,
      });
    const footer = (text: string, number: boolean) =>
      new Paragraph({
        children: [
          new TextRun(text),
          ...(number
            ? [new TextRun({ children: [" ", PageNumber.CURRENT] })]
            : []),
        ],
        alignment:
          where === "footer-center"
            ? AlignmentType.CENTER
            : AlignmentType.RIGHT,
      });
    sections.push({
      properties: {
        type: {
          nextPage: SectionType.NEXT_PAGE,
          continuous: SectionType.CONTINUOUS,
          oddPage: SectionType.ODD_PAGE,
          evenPage: SectionType.EVEN_PAGE,
        }[info.kind],
        page: {
          size: {
            width: Math.round(pw * 20),
            height: Math.round(ph * 20),
            orientation:
              layout.orientation === "landscape"
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
          },
          margin: {
            top: Math.round(mm(layout.top) * 20),
            bottom: Math.round(mm(layout.bottom) * 20),
            left: Math.round(mm(layout.left) * 20),
            right: Math.round(mm(layout.right) * 20),
          },
          pageNumbers:
            info.restartNumbering || i === 0
              ? { start: layout.pageNumberStart ?? 1 }
              : undefined,
        },
        column: {
          count: layout.columns || 1,
          space: Math.round(mm(layout.columnGap ?? 6.35) * 20),
        },
        titlePage: !!layout.differentFirst,
      },
      headers: {
        default: new Header({
          children: [
            header(layout.header, layout.numbering && where === "header-right"),
          ],
        }),
        ...(layout.differentFirst
          ? {
              first: new Header({
                children: [
                  header(
                    layout.headerFirst ?? "",
                    layout.numbering && where === "header-right",
                  ),
                ],
              }),
            }
          : {}),
        ...(layout.oddEven
          ? {
              even: new Header({
                children: [
                  header(
                    layout.headerEven ?? layout.header,
                    layout.numbering && where === "header-right",
                  ),
                ],
              }),
            }
          : {}),
      },
      footers: {
        default: new Footer({
          children: [
            footer(layout.footer, layout.numbering && where !== "header-right"),
          ],
        }),
        ...(layout.differentFirst
          ? {
              first: new Footer({
                children: [
                  footer(
                    layout.footerFirst ?? "",
                    layout.numbering && where !== "header-right",
                  ),
                ],
              }),
            }
          : {}),
        ...(layout.oddEven
          ? {
              even: new Footer({
                children: [
                  footer(
                    layout.footerEven ?? layout.footer,
                    layout.numbering && where !== "header-right",
                  ),
                ],
              }),
            }
          : {}),
      },
      children: await blocks({ type: "doc", content: groups[i] }, layout),
    });
  }
  const document = new Document({
    title,
    creator: "Prisma",
    customProperties: [
      { name: "PrismaAcademicStyle", value: flow.academicStyle ?? "free" },
    ],
    sections,
    comments: { children: comments },
    evenAndOddHeaderAndFooters: infos.some((s) => s.layout.oddEven),
    features: { updateFields: true },
    styles: {
      paragraphStyles: [
        ...academicNames.values(),
        { id: "Caption", name: "Caption", basedOn: "Normal" },
        ...Array.from({ length: 6 }, (_, i) => ({
          id: "TOC" + (i + 1),
          name: "toc " + (i + 1),
          basedOn: "Normal",
          paragraph: {
            indent: { left: i * 360 },
            spacing: {
              before: 0,
              after: 0,
              line: normalized.academicStyle === "apa" ? 480 : 280,
            },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: Math.round(
                  (pageSize(flow.layout)[0] -
                    mm(flow.layout.left + flow.layout.right)) *
                    20,
                ),
                leader: LeaderType.DOT,
              },
            ],
          },
        })),
      ],
      default: {
        document: {
          run: {
            font: "Liberation Sans",
            size: 22,
            language: { value: proofingLanguage(flow.language).locale },
          },
        },
      },
    },
  });
  const bytes = new Uint8Array(await Packer.toArrayBuffer(document));
  return embedDocxFonts(bytes, faces);
}
function embedDocxFonts(
  bytes: Uint8Array,
  faces: Awaited<ReturnType<typeof fontFaces>>,
): Uint8Array {
  if (!faces.length) return bytes;
  const files = unzipSync(bytes),
    families = new Map<string, string[]>(),
    rels: string[] = [];
  for (const [i, face] of faces.entries()) {
    const id = "prismaFont" + i,
      key = crypto.randomUUID(),
      guid = key
        .replaceAll("-", "")
        .match(/../g)!
        .map((h) => parseInt(h, 16))
        .reverse(),
      data = new Uint8Array(face.bytes);
    for (let j = 0; j < Math.min(32, data.length); j++) data[j] ^= guid[j % 16];
    const name = "fonts/prisma-" + i + ".odttf";
    files["word/" + name] = data;
    rels.push(
      '<Relationship Id="' +
        id +
        '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="' +
        name +
        '"/>',
    );
    const tag =
      {
        Regular: "embedRegular",
        Bold: "embedBold",
        Italic: "embedItalic",
        BoldItalic: "embedBoldItalic",
      }[face.style as "Regular"] ?? "embedRegular";
    const group = families.get(face.label) ?? [];
    group.push(
      "<w:" +
        tag +
        ' r:id="' +
        id +
        '" w:fontKey="{' +
        key.toUpperCase() +
        '}"/>',
    );
    families.set(face.label, group);
  }
  files["word/fontTable.xml"] = strToU8(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      [...families]
        .map(
          ([name, tags]) =>
            '<w:font w:name="' +
            escape(name) +
            '">' +
            tags.join("") +
            "</w:font>",
        )
        .join("") +
      "</w:fonts>",
  );
  files["word/_rels/fontTable.xml.rels"] = strToU8(
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      rels.join("") +
      "</Relationships>",
  );
  const types = strFromU8(files["[Content_Types].xml"]);
  files["[Content_Types].xml"] = strToU8(
    types.includes('Extension="odttf"')
      ? types
      : types.replace(
          "</Types>",
          '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/></Types>',
        ),
  );
  return zipSync(files, { level: 6 });
}
export async function exportHtml(
  flow: FlowDocument,
  title: string,
  fonts: LocalFont[] = [],
): Promise<Uint8Array> {
  const normalized = {
    ...flow,
    content: normalizeAcademicDocument(
      flow.content,
      flow.references ?? [],
      flow.academicStyle ?? "free",
    ),
  };
  const render = (n: RichNode): string => {
    const a = n.attrs ?? {};
    if (n.type === "text") {
      let text = escape(n.text);
      for (const mark of n.marks ?? []) {
        const tag = {
          bold: "strong",
          italic: "em",
          underline: "u",
          strike: "s",
          superscript: "sup",
          subscript: "sub",
          code: "code",
        }[mark.type];
        if (tag) text = "<" + tag + ">" + text + "</" + tag + ">";
        else if (mark.type === "link" && href(mark.attrs?.href))
          text = '<a href="' + escape(mark.attrs?.href) + '">' + text + "</a>";
        else if (mark.type === "textStyle") {
          const m = mark.attrs ?? {},
            styles = [
              "font-family:" +
                escape(safeFont(String(m.fontFamily ?? "PrismaSans"), fonts)),
              "font-size:" +
                Math.max(
                  1,
                  Math.min(200, parseFloat(String(m.fontSize)) || 11),
                ) +
                "pt",
              /^#[\da-f]{6}$/i.test(String(m.color)) ? "color:" + m.color : "",
              /^#[\da-f]{6}$/i.test(String(m.backgroundColor))
                ? "background-color:" + m.backgroundColor
                : "",
            ].filter(Boolean);
          text = '<span style="' + styles.join(";") + '">' + text + "</span>";
        }
      }
      return text;
    }
    if (n.type === "citation")
      return (
        '<a href="#' +
        escape(a.referenceAnchor) +
        '">' +
        escape(a.label) +
        "</a>"
      );
    if (n.type === "hardBreak") return "<br>";
    if (n.type === "pageBreak") return '<hr class="page-break">';
    if (n.type === "columnBreak") return '<hr class="column-break">';
    if (n.type === "sectionBreak")
      return '<hr class="page-break" data-section="' + escape(a.title) + '">';
    const inner = withCaptions(n, normalized).map(render).join("");
    if (
      ["image", "equation", "chart", "shape", "video"].includes(n.type ?? "")
    ) {
      const src = String(a.src ?? "");
      if (!/^data:image\/(png|jpeg);base64,/.test(src)) return "";
      return (
        '<figure id="' +
        escape(a.id) +
        '"><img alt="' +
        escape(a.alt ?? a.latex ?? a.title ?? "") +
        '" src="' +
        escape(src) +
        '" style="width:' +
        Math.max(20, Math.min(2000, Number(a.width) || 400)) +
        'px;max-width:100%;height:auto">' +
        (n.type === "video" && href(a.url)
          ? '<a href="' + escape(a.url) + '">Abrir video</a>'
          : "") +
        "</figure>"
      );
    }
    if (n.type === "generatedIndex")
      return (
        '<section id="' +
        escape(a.id) +
        '"><h2>' +
        escape(a.title) +
        "</h2>" +
        inner +
        "</section>"
      );
    if (n.type === "appendix")
      return (
        '<h1 id="' +
        escape(a.id) +
        '">' +
        escape([a.label, a.title].filter(Boolean).join(": ")) +
        "</h1>"
      );
    const tag =
      (
        {
          doc: "main",
          paragraph: "p",
          heading: "h" + Math.max(1, Math.min(6, Number(a.level) || 1)),
          table: "table",
          tableRow: "tr",
          tableCell: "td",
          tableHeader: "th",
          bulletList: "ul",
          orderedList: "ol",
          listItem: "li",
          blockquote: "blockquote",
          codeBlock: "pre",
          horizontalRule: "hr",
        } as Record<string, string>
      )[n.type ?? ""] ?? "div";
    const styles = [
      "font-family:" +
        escape(safeFont(String(a.fontFamily ?? "PrismaSans"), fonts)),
      a.fontSize ? "font-size:" + Number(a.fontSize) + "pt" : "",
      a.textAlign &&
      ["left", "center", "right", "justify"].includes(String(a.textAlign))
        ? "text-align:" + a.textAlign
        : "",
      a.lineHeight ? "line-height:" + Number(a.lineHeight) : "",
      a.firstLineIndent
        ? "text-indent:" + Number(a.firstLineIndent) + "pt"
        : "",
    ]
      .filter(Boolean)
      .join(";");
    return (
      "<" +
      tag +
      (a.id ? ' id="' + escape(a.id) + '"' : "") +
      ' style="' +
      styles +
      '"' +
      (["td", "th"].includes(tag)
        ? ' colspan="' +
          (Number(a.colspan) || 1) +
          '" rowspan="' +
          (Number(a.rowspan) || 1) +
          '"'
        : "") +
      ">" +
      inner +
      "</" +
      tag +
      ">"
    );
  };
  const faces = await fontFaces(normalized.content, fonts),
    css = faces
      .map(
        (f) =>
          '@font-face{font-family:"' +
          escape(f.label) +
          '";src:url(data:font/' +
          (f.bytes[0] === 79 ? "otf" : "ttf") +
          ";base64," +
          encodeFont(f.bytes) +
          ");font-weight:" +
          (f.style.includes("Bold") ? 700 : 400) +
          ";font-style:" +
          (f.style.includes("Italic") ? "italic" : "normal") +
          "}",
      )
      .join("\n");
  const layout = flow.layout,
    html =
      '<!doctype html><html lang="'+proofingLanguage(flow.language).locale+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\';style-src \'unsafe-inline\';img-src data:;font-src data:"><title>' +
      escape(title) +
      "</title><style>" +
      css +
      '\nbody{background:#edf0f7;color:#20273a;font-family:"Liberation Sans",sans-serif;margin:0}main{max-width:850px;background:white;margin:30px auto;padding:40px}p{white-space:pre-wrap}table{border-collapse:collapse;width:100%}td,th{border:1px solid #c1c9d8;padding:8px}img{max-width:100%}figure{margin:15px 0}.page-break{break-after:page;border:none}.column-break{break-after:column;border:none}@page{size:' +
      layout.format +
      " " +
      layout.orientation +
      ";margin:" +
      layout.top +
      "mm " +
      layout.right +
      "mm " +
      layout.bottom +
      "mm " +
      layout.left +
      "mm}@media(max-width:600px){main{margin:0;padding:20px}}@media print{body{background:white}main{margin:0;padding:0}}</style></head><body>" +
      render(normalized.content) +
      "</body></html>";
  return strToU8(html);
}
export function exportMarkdown(flow: FlowDocument): Uint8Array {
  const render = (n: RichNode): string => {
    if (n.type === "text") {
      let s = n.text ?? "";
      for (const m of n.marks ?? []) {
        if (m.type === "bold") s = "**" + s + "**";
        if (m.type === "italic") s = "*" + s + "*";
        if (m.type === "link" && href(m.attrs?.href))
          s = "[" + s + "](" + String(m.attrs?.href) + ")";
      }
      return s;
    }
    if (n.type === "citation") return String(n.attrs?.label ?? "");
    if (n.type === "hardBreak") return "  \n";
    if (n.type === "pageBreak" || n.type === "sectionBreak")
      return "\n\n---\n\n";
    if (n.type === "caption" || n.type === "appendix")
      return "\n\n" + academicPlainText(n) + "\n\n";
    if (["image", "equation", "chart", "shape", "video"].includes(n.type ?? ""))
      return (
        "\n\n![" +
        String(n.attrs?.alt ?? n.attrs?.latex ?? n.type).replace(/[[\]]/g, "") +
        "](" +
        String(n.attrs?.src ?? "") +
        ")\n\n"
      );
    if (n.type === "table")
      return (
        "\n\n" +
        (n.content ?? [])
          .map(
            (row, i) =>
              "| " +
              (row.content ?? [])
                .map((c) =>
                  academicPlainText(c)
                    .replace(/\|/g, "\\|")
                    .replace(/\n/g, "<br>"),
                )
                .join(" | ") +
              " |" +
              (i === 0
                ? "\n| " +
                  (row.content ?? []).map(() => "---").join(" | ") +
                  " |"
                : ""),
          )
          .join("\n") +
        "\n\n"
      );
    const body = (n.content ?? [])
      .map(render)
      .join(n.type === "doc" ? "\n" : "");
    return n.type === "heading"
      ? "\n\n" + "#".repeat(Number(n.attrs?.level) || 1) + " " + body + "\n\n"
      : n.type === "paragraph"
        ? body + "\n\n"
        : n.type === "listItem"
          ? "- " + body
          : body;
  };
  return strToU8(
    render(
      normalizeAcademicDocument(
        flow.content,
        flow.references ?? [],
        flow.academicStyle ?? "free",
      ),
    ),
  );
}
