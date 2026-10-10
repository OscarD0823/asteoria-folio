import { PDFDocument } from "pdf-lib";
import { pruneSources } from "./storage";
import { uid, type Workspace } from "./pdf";
import { pageSize, type PageLayout } from "./flow";
import { validateLocalFonts } from "./local-fonts";
import { academicPresets } from "./academic";
export function validateLayout(l: PageLayout): void {
  const formats = [
    "a4",
    "letter",
    "legal",
    "a3",
    "a5",
    "b5",
    "tabloid",
    "custom",
  ];
  const bounded = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (
    !l ||
    !formats.includes(l.format) ||
    !["portrait", "landscape"].includes(l.orientation) ||
    [l.top, l.bottom, l.left, l.right].some((v) => !bounded(v, 0, 100))
  )
    throw new Error("Los márgenes del proyecto no son válidos.");
  if (
    l.columns !== undefined &&
    (!Number.isInteger(l.columns) || !bounded(l.columns, 1, 3))
  )
    throw new Error("El número de columnas no es válido.");
  if (l.columnGap !== undefined && !bounded(l.columnGap, 0, 50))
    throw new Error("La separación de columnas no es válida.");
  if (
    l.format === "custom" &&
    (!bounded(l.customWidth, 50, 1000) || !bounded(l.customHeight, 50, 1000))
  )
    throw new Error("El tamaño de papel no es válido.");
  if (
    l.pageNumberStart !== undefined &&
    (!Number.isInteger(l.pageNumberStart) ||
      !bounded(l.pageNumberStart, 1, 100000))
  )
    throw new Error("La numeración no es válida.");
  if (
    l.pageNumberPosition !== undefined &&
    !["header-right", "footer-center", "footer-right"].includes(
      l.pageNumberPosition,
    )
  )
    throw new Error("La posición de numeración no es válida.");
  for (const text of [
    l.header,
    l.footer,
    l.headerFirst,
    l.headerEven,
    l.footerFirst,
    l.footerEven,
  ])
    if (text !== undefined && (typeof text !== "string" || text.length > 5000))
      throw new Error("El encabezado o pie de página no es válido.");
  if (
    l.watermark &&
    (!bounded(l.watermark.opacity, 0, 1) ||
      !bounded(l.watermark.size, 6, 200) ||
      !bounded(l.watermark.angle, -360, 360) ||
      typeof l.watermark.text !== "string" ||
      l.watermark.text.length > 500)
  )
    throw new Error("La marca de agua no es válida.");
  const [w, h] = pageSize(l),
    columns = l.columns || 1;
  if (
    (w -
      ((l.left + l.right) * 72) / 25.4 -
      (((l.columnGap ?? 6.35) * 72) / 25.4) * (columns - 1)) /
      columns <
      80 ||
    h - ((l.top + l.bottom) * 72) / 25.4 < 100
  )
    throw new Error("Reduce los márgenes para dejar espacio al contenido.");
}
const encode = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768)
    s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(s);
};
export function projectBytes(workspace: Workspace): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      format: "prisma-pdf",
      version: 3,
      workspace: {
        ...pruneSources(workspace),
        sources: pruneSources(workspace).sources.map((s) => ({
          ...s,
          bytes: encode(s.bytes),
        })),
      },
    }),
  );
}
export async function readProject(bytes: Uint8Array): Promise<Workspace> {
  if (bytes.length > 160 * 1024 * 1024)
    throw new Error("El proyecto supera 160 MB.");
  let input;
  try {
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("El archivo de proyecto no es válido.");
  }
  if (input?.format !== "prisma-pdf" || input?.version !== 3)
    throw new Error("Selecciona un proyecto .prisma de Prisma PDF.");
  const w = input.workspace as Workspace;
  if (
    !w ||
    typeof w.name !== "string" ||
    !Array.isArray(w.sources) ||
    !Array.isArray(w.pages) ||
    w.pages.length > 2000 ||
    w.sources.length > 2000
  )
    throw new Error("El proyecto está incompleto.");
  const docs = new Map<string, number>();
  if (w.fonts) await validateLocalFonts(w.fonts);
  if (w.flow?.fonts) {
    await validateLocalFonts(w.flow.fonts);
    if (!w.fonts) w.fonts = w.flow.fonts;
    delete w.flow.fonts;
  }
  let total = 0;
  for (const source of w.sources) {
    if (
      typeof source.id !== "string" ||
      typeof source.name !== "string" ||
      typeof source.bytes !== "string" ||
      docs.has(source.id)
    )
      throw new Error("Documento original no válido.");
    const raw = atob(source.bytes);
    total += raw.length;
    if (total > 100 * 1024 * 1024)
      throw new Error("Los PDF del proyecto superan 100 MB.");
    source.bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    docs.set(source.id, (await PDFDocument.load(source.bytes)).getPageCount());
  }
  const ids = new Set<string>();
  let nodes = 0;
  const check = (value: unknown, depth = 0): void => {
    if (depth > 40 || ++nodes > 250000)
      throw new Error("El proyecto tiene demasiados elementos.");
    if (typeof value === "number" && !Number.isFinite(value))
      throw new Error("Un valor del proyecto no es válido.");
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const v of value) check(v, depth + 1);
      return;
    }
    for (const [key, v] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw new Error("Propiedad de proyecto no válida.");
      if (
        (key === "src" || key === "data") &&
        typeof v === "string" &&
        v !== "" &&
        !/^data:(?:image\/(?:png|jpeg)|video\/(?:mp4|webm));base64,/i.test(v)
      )
        throw new Error("Las imágenes deben estar incluidas en el proyecto.");
      check(v, depth + 1);
    }
    const node = value as {
      type?: string;
      attrs?: { layout?: PageLayout; kind?: string };
    };
    if (node.type === "sectionBreak") {
      if (
        !["continuous", "nextPage", "oddPage", "evenPage"].includes(
          node.attrs?.kind ?? "",
        )
      )
        throw new Error("El salto de sección no es válido.");
      validateLayout(node.attrs?.layout as PageLayout);
    }
  };
  for (const p of w.pages) {
    if (
      typeof p.id !== "string" ||
      ids.has(p.id) ||
      !Number.isInteger(p.index) ||
      p.index < 0 ||
      p.index >= (docs.get(p.sourceId) ?? 0) ||
      !Array.isArray(p.marks)
    )
      throw new Error("Una página del proyecto no es válida.");
    ids.add(p.id);
    for (const m of p.marks) {
      for (const n of [m.x, m.y, m.width, m.height, m.size, m.viewRotation])
        if (!Number.isFinite(n))
          throw new Error("Una posición del proyecto no es válida.");
      check(m);
    }
  }
  if (w.flow) {
    check(w.flow);
    validateLayout(w.flow.layout);
    if (
      w.flow.academicStyle &&
      !Object.hasOwn(academicPresets, w.flow.academicStyle)
    )
      throw new Error("El estilo académico no es válido.");
    if (
      w.flow.references &&
      (!Array.isArray(w.flow.references) ||
        w.flow.references.length > 10000 ||
        w.flow.references.some(
          (r) => !r || typeof r.id !== "string" || typeof r.title !== "string",
        ))
    )
      throw new Error("Las referencias no son válidas.");
  }
  if (w.layout) {
    check(w.layout);
    validateLayout(w.layout);
  }
  return { ...w, projectId: uid() };
}
