import { fontFamilies, fontCss } from "./fonts";
const alternatives: Record<string, string> = {
  arial: "Arimo", calibri: "Carlito", cambria: "Caladea",
  "times new roman": "PrismaSerif", "courier new": "PrismaMono", georgia: "Gelasio",
};
/** Preserve the Office name in XLSX; resolve a bundled font for preview and PDF. */
export function resolveOfficeFont(name = "Calibri") {
  const key = name.normalize("NFC").trim().toLocaleLowerCase("en");
  return fontFamilies.find(font => font.label.toLocaleLowerCase("en") === key || font.value.toLocaleLowerCase("en") === key)
    ?? fontFamilies.find(font => font.value === alternatives[key]);
}
export function officeFontCss(name = "Calibri") {
  const family = resolveOfficeFont(name);
  // Unknown Office fonts retain their name; CSS can use a font installed by the user.
  return family ? fontCss(family.value) : `${JSON.stringify(name)}, ${fontCss("Carlito")}`;
}
