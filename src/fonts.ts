import { StandardFonts, type PDFDocument, type PDFFont } from "pdf-lib";

export const fontFamilies = [
  {
    value: "PrismaSans",
    label: "Liberation Sans",
    css: "PrismaSans, Arial, sans-serif",
    file: "LiberationSans",
  },
  {
    value: "PrismaSerif",
    label: "Liberation Serif",
    css: "PrismaSerif, Georgia, serif",
    file: "LiberationSerif",
  },
  {
    value: "PrismaMono",
    label: "Liberation Mono",
    css: "PrismaMono, monospace",
    file: "LiberationMono",
  },
  { value: "Helvetica", label: "Arial / Helvetica", css: "Arial, sans-serif" },
  { value: "Times-Roman", label: "Times", css: "Times New Roman, serif" },
  { value: "Courier", label: "Courier", css: "Courier New, monospace" },
];
export const fontCss = (font?: string) =>
  fontFamilies.find((f) => f.value === font)?.css ?? fontFamilies[0].css;
let loader = (name: string): Promise<Uint8Array> =>
  fetch(new URL("./fonts/" + name, document.baseURI)).then(async (r) => {
    if (!r.ok) throw new Error("No se pudo abrir la tipografía local.");
    return new Uint8Array(await r.arrayBuffer());
  });
const data = new Map<string, Promise<Uint8Array>>();
export function setFontLoader(next: typeof loader) {
  loader = next;
  data.clear();
}
export function createFontProvider(doc: PDFDocument) {
  const fonts = new Map<string, Promise<PDFFont>>();
  return (
    family = "PrismaSans",
    bold = false,
    italic = false,
  ): Promise<PDFFont> => {
    const known =
      fontFamilies.find((f) => f.value === family) ?? fontFamilies[0];
    const style = bold
      ? italic
        ? "BoldItalic"
        : "Bold"
      : italic
        ? "Italic"
        : "Regular";
    const key = known.value + style;
    if (!fonts.has(key))
      fonts.set(
        key,
        (async () => {
          if (known.file) {
            doc.registerFontkit((await import("@pdf-lib/fontkit")).default);
            const file = known.file + "-" + style + ".ttf";
            if (!data.has(file)) data.set(file, loader(file));
            return doc.embedFont(await data.get(file)!, { subset: true });
          }
          const name =
            family === "Courier"
              ? bold
                ? italic
                  ? StandardFonts.CourierBoldOblique
                  : StandardFonts.CourierBold
                : italic
                  ? StandardFonts.CourierOblique
                  : StandardFonts.Courier
              : family === "Times-Roman"
                ? bold
                  ? italic
                    ? StandardFonts.TimesRomanBoldItalic
                    : StandardFonts.TimesRomanBold
                  : italic
                    ? StandardFonts.TimesRomanItalic
                    : StandardFonts.TimesRoman
                : bold
                  ? italic
                    ? StandardFonts.HelveticaBoldOblique
                    : StandardFonts.HelveticaBold
                  : italic
                    ? StandardFonts.HelveticaOblique
                    : StandardFonts.Helvetica;
          return doc.embedFont(name);
        })(),
      );
    return fonts.get(key)!;
  };
}
