import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
} from "pdf-lib";
import {
  buildFlowPdf,
  drawRichBox,
  type FlowDocument,
  type RichNode,
  type PageLayout,
  pageSize,
  mm,
  drawWatermark,
} from "./flow";
import { createFontProvider, finalizeFontStreams } from "./fonts";
import type { LocalFont } from "./local-fonts";
import { preparedTextChanged } from "./pdf-text";

export type MarkType =
  | "text"
  | "highlight"
  | "draw"
  | "image"
  | "signature"
  | "rectangle"
  | "ellipse"
  | "underline"
  | "strikeout"
  | "arrow"
  | "redact";
export type Tool = "select" | "edit" | "objects" | MarkType;
export type Mark = {
  id: string;
  type: MarkType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  size: number;
  text?: string;
  data?: string;
  points?: [number, number][];
  viewRotation: number;
  font?: string;
  bold?: boolean;
  italic?: boolean;
  opacity?: number;
  richText?: RichNode;
  underline?: boolean;
  strike?: boolean;
  align?: string;
  lineHeight?: number;
};
export type Source = { id: string; name: string; bytes: Uint8Array };
export type Page = {
  id: string;
  sourceId: string;
  index: number;
  rotation: number;
  marks: Mark[];
  textReady?: boolean;
  originalText?: { mark: Mark; rect: [number, number, number, number] }[];
};
export type Workspace = {
  fonts?: LocalFont[];
  sources: Source[];
  pages: Page[];
  name: string;
  flow?: FlowDocument;
  projectId?: string;
  layout?: PageLayout;
};
export const uid = () => crypto.randomUUID();
export const emptyWorkspace = (): Workspace => ({
  sources: [],
  pages: [],
  name: "Mi documento",
});
export const rotation = (n: number) => ((n % 360) + 360) % 360;
export function turnPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  angle: number,
): [number, number] {
  switch (rotation(angle)) {
    case 90:
      return [height - y, x];
    case 180:
      return [width - x, height - y];
    case 270:
      return [y, width - x];
    default:
      return [x, y];
  }
}
export function hexColor(hex: string) {
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
}
export async function appendPdf(
  state: Workspace,
  bytes: Uint8Array,
  name: string,
): Promise<Workspace> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
  } catch (error) {
    if (error instanceof Error && /encrypted|password/i.test(error.message))
      throw new Error(
        "Este PDF está protegido. Abre una copia sin contraseña.",
      );
    throw new Error(
      "No pudimos leer este archivo PDF. Comprueba que no esté dañado.",
    );
  }
  if (doc.isEncrypted)
    throw new Error("Este PDF está protegido. Abre una copia sin contraseña.");
  const source: Source = { id: uid(), name, bytes };
  return {
    name: state.pages.length ? state.name : name.replace(/\.pdf$/i, ""),
    fonts: state.fonts,
    sources: [...state.sources, source],
    pages: [
      ...state.pages,
      ...doc.getPages().map((_, index) => ({
        id: uid(),
        sourceId: source.id,
        index,
        rotation: 0,
        marks: [],
      })),
    ],
  };
}
export async function buildPdf(
  state: Workspace,
  onlyIds?: string[],
): Promise<Uint8Array> {
  if (state.flow) {
    const bytes = await (
      typeof window === "undefined"
        ? buildFlowPdf
        : async (flow: FlowDocument, title: string) =>
            (
              await (
                await import("./flow-renderer")
              ).renderFlow(flow, title, "export")
            ).bytes
    )({ ...state.flow, fonts: state.fonts ?? state.flow.fonts }, state.name);
    if (!onlyIds) return bytes;
    const doc = await PDFDocument.load(bytes),
      out = await PDFDocument.create();
    const indices = state.pages
      .filter((p) => onlyIds.includes(p.id))
      .map((p) => p.index)
      .filter((i) => i < doc.getPageCount());
    if (!indices.length) throw new Error("Selecciona al menos una página.");
    for (const p of await out.copyPages(doc, indices)) out.addPage(p);
    return out.save();
  }
  const chosen = onlyIds
    ? state.pages.filter((p) => onlyIds.includes(p.id))
    : state.pages;
  if (!chosen.length) throw new Error("Añade al menos una página.");
  const output = await PDFDocument.create();
  const getFont = createFontProvider(output, state.fonts);
  const docs = new Map<string, PDFDocument>();
  for (const source of state.sources)
    docs.set(source.id, await PDFDocument.load(source.bytes));
  for (const model of chosen) {
    const source = docs.get(model.sourceId);
    if (!source) throw new Error("No se encontró el documento original.");
    const changedText =
      model.originalText?.filter((o) =>
        preparedTextChanged(
          o.mark,
          model.marks.find((m) => m.id === o.mark.id),
        ),
      ) ?? [];
    const originalIds = new Set(model.originalText?.map((o) => o.mark.id));
    let pageSource = source,
      pageIndex = model.index;
    if (changedText.length) {
      const request = {
        action: "redactText" as const,
        bytes: state.sources.find((s) => s.id === model.sourceId)!.bytes,
        index: model.index,
        rects: changedText.map((o) => o.rect),
      };
      const bytes = (await (typeof window === "undefined"
        ? (await import("./native-core")).nativeOperation(request)
        : (await import("./native")).runNative(request))) as Uint8Array;
      pageSource = await PDFDocument.load(bytes);
      pageIndex = 0;
    }
    const [page] = await output.copyPages(pageSource, [pageIndex]);
    output.addPage(page);
    const baseRotation = rotation(page.getRotation().angle);
    const crop = page.getCropBox();
    page.setRotation(degrees(rotation(baseRotation + model.rotation)));
    for (const mark of model.marks) {
      if (
        originalIds.has(mark.id) &&
        !changedText.some((o) => o.mark.id === mark.id)
      )
        continue;
      const r = rotation(baseRotation + mark.viewRotation);
      const h = r % 180 === 0 ? crop.height : crop.width;
      const matrices: Record<
        number,
        [number, number, number, number, number, number]
      > = {
        0: [1, 0, 0, 1, crop.x, crop.y],
        90: [0, 1, -1, 0, crop.x + crop.width, crop.y],
        180: [-1, 0, 0, -1, crop.x + crop.width, crop.y + crop.height],
        270: [0, -1, 1, 0, crop.x, crop.y + crop.height],
      };
      page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(...matrices[r]),
      );
      const color = hexColor(mark.color);
      if (mark.type === "text") {
        if (mark.richText)
          await drawRichBox(
            output,
            page,
            mark.richText,
            mark.x,
            mark.y + page.getHeight() - h,
            mark.width,
            {
              font: mark.font ?? "Helvetica",
              size: mark.size,
              color: mark.color,
              align: mark.align,
              lineHeight: mark.lineHeight ?? 1.25,
              noWrap: originalIds.has(mark.id),
            },
            getFont,
          );
        else {
          const font = await getFont(
            mark.font ?? "Helvetica",
            mark.bold,
            mark.italic,
          );
          try {
            font.encodeText(mark.text ?? "");
          } catch {
            throw new Error(
              "El texto contiene caracteres no compatibles con esta tipografía.",
            );
          }
          page.drawText(mark.text ?? "", {
            x: mark.x,
            y: h - mark.y - mark.size,
            font,
            size: mark.size,
            color,
            lineHeight: mark.size * (mark.lineHeight ?? 1.25),
            opacity: mark.opacity ?? 1,
          });
        }
      } else if (mark.type === "highlight")
        page.drawRectangle({
          x: mark.x,
          y: h - mark.y - mark.height,
          width: mark.width,
          height: mark.height,
          color,
          opacity: 0.3,
        });
      else if (mark.type === "rectangle")
        page.drawRectangle({
          x: mark.x,
          y: h - mark.y - mark.height,
          width: mark.width,
          height: mark.height,
          borderColor: color,
          borderWidth: mark.size,
          opacity: mark.opacity ?? 1,
        });
      else if (mark.type === "ellipse")
        page.drawEllipse({
          x: mark.x + mark.width / 2,
          y: h - mark.y - mark.height / 2,
          xScale: mark.width / 2,
          yScale: mark.height / 2,
          borderColor: color,
          borderWidth: mark.size,
        });
      else if (
        mark.type === "underline" ||
        mark.type === "strikeout" ||
        mark.type === "arrow"
      ) {
        const start = {
            x: mark.x,
            y:
              h -
              mark.y -
              (mark.type === "underline"
                ? mark.height
                : mark.type === "strikeout"
                  ? mark.height / 2
                  : 0),
          },
          end = {
            x: mark.x + mark.width,
            y: mark.type === "arrow" ? h - mark.y - mark.height : start.y,
          };
        page.drawLine({ start, end, thickness: mark.size, color });
        if (mark.type === "arrow") {
          const angle = Math.atan2(end.y - start.y, end.x - start.x),
            length = Math.max(7, mark.size * 4);
          for (const offset of [-0.5, 0.5])
            page.drawLine({
              start: end,
              end: {
                x: end.x - length * Math.cos(angle + offset),
                y: end.y - length * Math.sin(angle + offset),
              },
              thickness: mark.size,
              color,
            });
        }
      } else if (mark.type === "draw") {
        const points = mark.points ?? [];
        for (let i = 1; i < points.length; i++)
          page.drawLine({
            start: {
              x: mark.x + points[i - 1][0],
              y: h - mark.y - points[i - 1][1],
            },
            end: { x: mark.x + points[i][0], y: h - mark.y - points[i][1] },
            thickness: mark.size,
            color,
          });
      } else if (mark.data) {
        const img = await output.embedPng(mark.data);
        page.drawImage(img, {
          x: mark.x,
          y: h - mark.y - mark.height,
          width: mark.width,
          height: mark.height,
          opacity: mark.opacity ?? 1,
        });
      }
      page.pushOperators(popGraphicsState());
    }
  }
  output.setTitle(state.name);
  output.setCreator("Prisma PDF");
  output.setProducer("Prisma PDF · pdf-lib");
  if (state.layout) {
    const layout = state.layout;
    for (const [index, page] of output.getPages().entries()) {
      const crop = page.getCropBox(),
        r = rotation(page.getRotation().angle),
        w = r % 180 ? crop.height : crop.width,
        h = r % 180 ? crop.width : crop.height;
      const matrix: Record<
        number,
        [number, number, number, number, number, number]
      > = {
        0: [1, 0, 0, 1, crop.x, crop.y],
        90: [0, 1, -1, 0, crop.x + crop.width, crop.y],
        180: [-1, 0, 0, -1, crop.x + crop.width, crop.y + crop.height],
        270: [0, -1, 1, 0, crop.x, crop.y + crop.height],
      };
      page.pushOperators(
        pushGraphicsState(),
        concatTransformationMatrix(...matrix[r]),
      );
      const left = mm(layout.left),
        right = mm(layout.right),
        top = mm(layout.top),
        bottom = mm(layout.bottom),
        offset = page.getHeight() - h;
      const header =
        layout.differentFirst && index === 0
          ? (layout.headerFirst ?? "")
          : layout.oddEven && index % 2 === 1
            ? (layout.headerEven ?? layout.header)
            : layout.header;
      const footer =
        layout.differentFirst && index === 0
          ? (layout.footerFirst ?? "")
          : layout.oddEven && index % 2 === 1
            ? (layout.footerEven ?? layout.footer)
            : layout.footer;
      for (const [text, y] of [
        [header, Math.max(8, top * 0.4) - 9],
        [footer, h - Math.max(15, bottom * 0.5)],
      ] as const)
        if (text)
          await drawRichBox(
            output,
            page,
            {
              type: "doc",
              content: [
                { type: "paragraph", content: [{ type: "text", text }] },
              ],
            },
            left,
            y + offset,
            w - left - right,
            { size: 9 },
            getFont,
          );
      if (layout.numbering) {
        const label = String(index + (layout.pageNumberStart ?? 1)),
          font = await getFont("PrismaSans", false, false, label),
          position = layout.pageNumberPosition ?? "footer-right";
        page.drawText(label, {
          x:
            position === "footer-center"
              ? (w - font.widthOfTextAtSize(label, 10)) / 2
              : w - right - font.widthOfTextAtSize(label, 10),
          y:
            position === "header-right"
              ? h - Math.max(18, top * 0.5)
              : Math.max(12, bottom * 0.4),
          font,
          size: 10,
          color: hexColor("#20273a"),
        });
      }
      if (layout.watermark)
        await drawWatermark(output, page, layout.watermark, getFont, {
          width: w,
          height: h,
        });
      page.pushOperators(popGraphicsState());
    }
  }
  await finalizeFontStreams(output);
  return output.save();
}
export function pageRange(value: string, count: number): number[] {
  if (!value.trim())
    throw new Error("Escribe las páginas, por ejemplo: 1-3, 5.");
  const result = new Set<number>();
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Usa un rango como 1-3, 5.");
    const start = Number(match[1]),
      end = Number(match[2] ?? start);
    if (start < 1 || end < start || end > count)
      throw new Error(`El rango debe estar entre 1 y ${count}.`);
    for (let i = start; i <= end; i++) result.add(i - 1);
  }
  return [...result].sort((a, b) => a - b);
}
export async function fitPdfToLayout(
  state: Workspace,
  layout: PageLayout,
): Promise<Workspace> {
  const source = await PDFDocument.load(
      await buildPdf({ ...state, layout: undefined }),
    ),
    out = await PDFDocument.create(),
    [w, h] = pageSize(layout);
  const left = mm(layout.left),
    right = mm(layout.right),
    top = mm(layout.top),
    bottom = mm(layout.bottom);
  if (w - left - right < 80 || h - top - bottom < 100)
    throw new Error("Reduce los márgenes.");
  for (const original of source.getPages()) {
    const crop = original.getCropBox(),
      angle = rotation(original.getRotation().angle),
      embed = await out.embedPage(original, {
        left: crop.x,
        bottom: crop.y,
        right: crop.x + crop.width,
        top: crop.y + crop.height,
      });
    const dw = angle % 180 ? crop.height : crop.width,
      dh = angle % 180 ? crop.width : crop.height,
      s = Math.min((w - left - right) / dw, (h - top - bottom) / dh);
    const x = left + (w - left - right - dw * s) / 2,
      y = bottom + (h - top - bottom - dh * s) / 2;
    out.addPage([w, h]).drawPage(embed, {
      x:
        x +
        (angle === 180 ? crop.width * s : angle === 270 ? crop.height * s : 0),
      y:
        y +
        (angle === 90 ? crop.width * s : angle === 180 ? crop.height * s : 0),
      width: crop.width * s,
      height: crop.height * s,
      rotate: degrees(-angle),
    });
  }
  const result = await appendPdf(
    emptyWorkspace(),
    await out.save(),
    state.name + ".pdf",
  );
  return { ...result, name: state.name, projectId: state.projectId };
}
export async function demoWorkspace(): Promise<Workspace> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([595.28, 841.89]);
    const text = (
      t: string,
      x: number,
      y: number,
      size = 11,
      color = "#475569",
      strong = false,
    ) =>
      page.drawText(t, {
        x,
        y,
        size,
        font: strong ? bold : regular,
        color: hexColor(color),
      });
    page.drawRectangle({
      x: 48,
      y: 752,
      width: 28,
      height: 28,
      color: hexColor("#207e75"),
    });
    text("P", 57, 759, 16, "#ffffff", true);
    text("PRISMA STUDIO", 88, 768, 11, "#1c4341", true);
    text("DOCUMENTO DE EJEMPLO", 390, 768, 8, "#78908e");
    page.drawLine({
      start: { x: 48, y: 736 },
      end: { x: 547, y: 736 },
      thickness: 0.8,
      color: hexColor("#dfe9e7"),
    });
    if (i === 0) {
      text("Las buenas ideas", 48, 678, 32, "#173c38", true);
      text("merecen claridad.", 48, 637, 32, "#173c38", true);
      text("Propuesta de proyecto / Octubre 2026", 48, 604, 11, "#78908e");
      page.drawRectangle({
        x: 48,
        y: 479,
        width: 499,
        height: 86,
        color: hexColor("#eff7f5"),
      });
      text("01   UNA NUEVA PERSPECTIVA", 66, 540, 10, "#207e75", true);
      text(
        "Cada documento es una oportunidad para comunicar mejor.",
        66,
        515,
        11,
      );
      text("Organiza tus ideas. Dale forma a lo que viene.", 66, 496, 11);
      text("El proyecto", 48, 431, 17, "#173c38", true);
      [
        "Creamos experiencias simples que convierten ideas en resultados.",
        "Este documento reúne el alcance, los tiempos y los próximos pasos.",
        "Puedes añadir notas, resaltar lo importante y colocar tu firma.",
      ].forEach((t, k) => text(t, 48, 403 - k * 20));
      text("Objetivos principales", 48, 309, 17, "#173c38", true);
      [
        "Definir una dirección clara y compartida.",
        "Simplificar las tareas de todos los días.",
        "Entregar una experiencia útil, cuidada y accesible.",
      ].forEach((t, k) => {
        text("0" + (k + 1), 48, 274 - k * 37, 10, "#207e75", true);
        text(t, 80, 274 - k * 37);
      });
      page.drawLine({
        start: { x: 48, y: 110 },
        end: { x: 235, y: 110 },
        thickness: 1,
        color: hexColor("#c5d7d2"),
      });
      text("Firma de aprobación", 48, 91, 9, "#78908e");
    } else if (i === 1) {
      text("Un plan con dirección.", 48, 678, 29, "#173c38", true);
      text("02   ALCANCE Y CRONOGRAMA", 48, 626, 11, "#207e75", true);
      [
        "Explorar · Escuchar y entender lo que necesitas.",
        "Diseñar · Convertir los objetivos en una propuesta.",
        "Crear · Dar forma al proyecto y revisar los detalles.",
        "Entregar · Compartir el resultado y seguir mejorando.",
      ].forEach((t, k) => {
        page.drawRectangle({
          x: 48,
          y: 530 - k * 95,
          width: 499,
          height: 65,
          color: hexColor(k % 2 ? "#f4f6f8" : "#eff7f5"),
        });
        text(t, 66, 554 - k * 95, 12, "#304f4b");
      });
    } else {
      text("Listos para empezar.", 48, 678, 29, "#173c38", true);
      text("03   PRÓXIMOS PASOS", 48, 626, 11, "#207e75", true);
      [
        "Revisar y aprobar la propuesta.",
        "Acordar las fechas y responsables.",
        "Compartir los recursos iniciales.",
      ].forEach((t, k) => text(t, 48, 570 - k * 40, 13));
      text("Tus notas", 48, 366, 17, "#173c38", true);
      for (let n = 0; n < 7; n++)
        page.drawLine({
          start: { x: 48, y: 328 - n * 27 },
          end: { x: 547, y: 328 - n * 27 },
          thickness: 0.6,
          color: hexColor("#e0e8e5"),
        });
    }
    text("PRISMA STUDIO  /  TU DOCUMENTO, A TU MANERA", 48, 45, 8, "#78908e");
    text(`${i + 1} / 3`, 518, 45, 8, "#78908e");
  }
  return appendPdf(
    emptyWorkspace(),
    await doc.save(),
    "Propuesta de proyecto.pdf",
  );
}
