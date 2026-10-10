import { PDFDocument } from "pdf-lib";
import { pruneSources } from "./storage";
import { uid, type Workspace } from "./pdf";
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
        !/^data:image\/(png|jpeg);base64,/i.test(v)
      )
        throw new Error("Las imágenes deben estar incluidas en el proyecto.");
      check(v, depth + 1);
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
    check(w.flow.content);
    const l = w.flow.layout;
    if (
      !l ||
      !["a4", "letter", "legal"].includes(l.format) ||
      !["portrait", "landscape"].includes(l.orientation) ||
      [l.top, l.bottom, l.left, l.right].some(
        (n) => !Number.isFinite(n) || n < 0 || n > 100,
      )
    )
      throw new Error("Los márgenes del proyecto no son válidos.");
  }
  return { ...w, projectId: uid() };
}
