import type { FontFamily, FontStyle } from "./fonts";
export type LocalFont = {
  value: string;
  label: string;
  style: FontStyle;
  bytes: string;
  hash: string;
  subset: boolean;
};
export const decodeFont = (bytes: string) =>
  Uint8Array.from(atob(bytes), (c) => c.charCodeAt(0));
export function encodeFont(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 32768)
    text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
/** OpenType embedding flags apply to both exported PDFs and editable projects. */
export function fontEmbeddingPolicy(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes.length > 8 * 1024 * 1024)
    throw new Error("Elige una fuente TTF u OTF de hasta 8 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    signature = view.getUint32(0);
  if (signature !== 0x00010000 && signature !== 0x4f54544f)
    throw new Error("El archivo no es una fuente TTF u OTF compatible.");
  const count = view.getUint16(4);
  if (12 + count * 16 > bytes.length)
    throw new Error("La fuente está incompleta.");
  let flags: number | undefined,
    version = 0;
  for (let i = 0; i < count; i++) {
    const entry = 12 + i * 16,
      tag = view.getUint32(entry),
      offset = view.getUint32(entry + 8),
      length = view.getUint32(entry + 12);
    if (offset + length > bytes.length)
      throw new Error("La fuente está incompleta.");
    if (tag === 0x66766172)
      throw new Error(
        "Para importar esta familia, elige sus archivos estáticos TTF u OTF.",
      );
    if (tag === 0x4f532f32 && length >= 10) {
      flags = view.getUint16(offset + 8);
      version = view.getUint16(offset);
    }
  }
  if (flags === undefined)
    throw new Error(
      "La fuente no declara los permisos de incrustación requeridos.",
    );
  if (version >= 3 && [2, 4, 8].filter((bit) => flags! & bit).length > 1)
    throw new Error(
      "La fuente declara permisos de incrustación contradictorios.",
    );
  if (version < 2) flags &= 0x000f;
  const editable = (flags & 0x000e) === 0 || !!(flags & 0x0008);
  if (!editable || flags & 0x0200)
    throw new Error(
      "Los permisos de esta fuente no permiten incluirla en un proyecto editable. Elige otra fuente.",
    );
  return { subset: !(flags & 0x0100) };
}
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      ),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
export async function importLocalFont(bytes: Uint8Array): Promise<LocalFont> {
  const policy = fontEmbeddingPolicy(bytes);
  const fontkit = await import("@pdf-lib/fontkit");
  const font = fontkit.default.create(bytes) as {
    familyName?: string;
    subfamilyName?: string;
    characterSet?: number[];
  };
  if (!font.characterSet?.length)
    throw new Error("No se pudieron leer los caracteres de la fuente.");
  const label = String(font.familyName || "Fuente personal")
      .replace(/[\x00-\x1f]/g, "")
      .slice(0, 100),
    face = font.subfamilyName ?? "";
  const bold = /bold|black|heavy|semibold/i.test(face),
    italic = /italic|oblique/i.test(face);
  return {
    value:
      "local-" +
      (await hash(new TextEncoder().encode(label.toLowerCase()))).slice(0, 20),
    label,
    style: bold
      ? italic
        ? "BoldItalic"
        : "Bold"
      : italic
        ? "Italic"
        : "Regular",
    bytes: encodeFont(bytes),
    hash: await hash(bytes),
    ...policy,
  };
}
export function localFontFamilies(fonts: LocalFont[] = []): FontFamily[] {
  return [
    ...new Map(
      fonts.map((font) => [
        font.value,
        {
          value: font.value,
          label: font.label,
          css: font.value + ", serif",
          category: "serif" as const,
        },
      ]),
    ).values(),
  ];
}
export async function validateLocalFonts(fonts: LocalFont[]) {
  if (!Array.isArray(fonts) || fonts.length > 64)
    throw new Error("El proyecto tiene demasiadas fuentes personales.");
  let total = 0;
  const used = new Set<string>();
  for (const font of fonts) {
    if (
      !font ||
      typeof font.bytes !== "string" ||
      font.bytes.length > 12 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(font.bytes)
    )
      throw new Error("Fuente personal no válida.");
    const bytes = decodeFont(font.bytes);
    total += bytes.length;
    if (total > 24 * 1024 * 1024)
      throw new Error("Las fuentes personales del proyecto superan 24 MB.");
    const checked = await importLocalFont(bytes),
      key = checked.value + ":" + checked.style;
    if (
      used.has(key) ||
      font.value !== checked.value ||
      font.label !== checked.label ||
      font.hash !== checked.hash ||
      font.style !== checked.style ||
      font.subset !== checked.subset
    )
      throw new Error(
        "Los datos de una fuente personal no coinciden con su archivo.",
      );
    used.add(key);
  }
}
export async function mountLocalFonts(fonts: LocalFont[]) {
  const faces: FontFace[] = [];
  try {
    for (const font of fonts) {
      const face = new FontFace(
        font.value,
        decodeFont(font.bytes).buffer as ArrayBuffer,
        {
          weight: font.style.includes("Bold") ? "700" : "400",
          style: font.style.includes("Italic") ? "italic" : "normal",
        },
      );
      await face.load();
      document.fonts.add(face);
      faces.push(face);
    }
    return () => faces.forEach((face) => document.fonts.delete(face));
  } catch (error) {
    faces.forEach((face) => document.fonts.delete(face));
    throw error;
  }
}
