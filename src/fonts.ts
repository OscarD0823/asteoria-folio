import {
  StandardFonts,
  PDFRawStream,
  PDFName,
  PDFDict,
  decodePDFRawStream,
  type PDFDocument,
  type PDFFont,
} from "pdf-lib";
import { decodeFont, type LocalFont } from "./local-fonts";
import { extraFontFamilies } from "./extra-fonts";
import {referenceFontFamilies} from './reference-fonts';

export type FontStyle = "Regular" | "Bold" | "Italic" | "BoldItalic";
export type FontFamily = {
  value: string;
  label: string;
  css: string;
  category: "sans-serif" | "serif" | "monospace";
  file?: string;
  styles?: Partial<Record<FontStyle, string>>;
  fallback?: boolean;
};

// These files are distributed with the app; no external font service is used.
export const fontFamilies: FontFamily[] = [
  {
    value: "PrismaSans",
    label: "Liberation Sans",
    category: "sans-serif",
    file: "LiberationSans",
    css: "PrismaSans, Arial, sans-serif",
  },
  {
    value: "PrismaSerif",
    label: "Liberation Serif",
    category: "serif",
    file: "LiberationSerif",
    css: "PrismaSerif, Georgia, serif",
  },
  {
    value: "PrismaMono",
    label: "Liberation Mono",
    category: "monospace",
    file: "LiberationMono",
    css: "PrismaMono, monospace",
  },
  {
    value: "Lato",
    label: "Lato",
    css: "Lato, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "Lato/Lato-Regular.ttf",
      Italic: "Lato/Lato-Italic.ttf",
      Bold: "Lato/Lato-Bold.ttf",
      BoldItalic: "Lato/Lato-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "PTSans",
    label: "PT Sans",
    css: "PTSans, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "PTSans/PTSans-Regular.ttf",
      Italic: "PTSans/PTSans-Italic.ttf",
      Bold: "PTSans/PTSans-Bold.ttf",
      BoldItalic: "PTSans/PTSans-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "PTSerif",
    label: "PT Serif",
    css: "PTSerif, serif",
    category: "serif",
    styles: {
      Regular: "PTSerif/PTSerif-Regular.ttf",
      Italic: "PTSerif/PTSerif-Italic.ttf",
      Bold: "PTSerif/PTSerif-Bold.ttf",
      BoldItalic: "PTSerif/PTSerif-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Ubuntu",
    label: "Ubuntu",
    css: "Ubuntu, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "Ubuntu/Ubuntu-Regular.ttf",
      Italic: "Ubuntu/Ubuntu-Italic.ttf",
      Bold: "Ubuntu/Ubuntu-Bold.ttf",
      BoldItalic: "Ubuntu/Ubuntu-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Cousine",
    label: "Cousine",
    css: "Cousine, monospace",
    category: "monospace",
    styles: {
      Regular: "Cousine/Cousine-Regular.ttf",
      Italic: "Cousine/Cousine-Italic.ttf",
      Bold: "Cousine/Cousine-Bold.ttf",
      BoldItalic: "Cousine/Cousine-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Tinos",
    label: "Tinos",
    css: "Tinos, serif",
    category: "serif",
    styles: {
      Regular: "Tinos/Tinos-Regular.ttf",
      Italic: "Tinos/Tinos-Italic.ttf",
      Bold: "Tinos/Tinos-Bold.ttf",
      BoldItalic: "Tinos/Tinos-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "ComicNeue",
    label: "Comic Neue",
    css: "ComicNeue, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "ComicNeue/ComicNeue-Regular.ttf",
      Italic: "ComicNeue/ComicNeue-Italic.ttf",
      Bold: "ComicNeue/ComicNeue-Bold.ttf",
      BoldItalic: "ComicNeue/ComicNeue-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Carlito",
    label: "Carlito",
    css: "Carlito, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "Carlito/Carlito-Regular.ttf",
      Italic: "Carlito/Carlito-Italic.ttf",
      Bold: "Carlito/Carlito-Bold.ttf",
      BoldItalic: "Carlito/Carlito-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Caladea",
    label: "Caladea",
    css: "Caladea, serif",
    category: "serif",
    styles: {
      Regular: "Caladea/Caladea-Regular.ttf",
      Italic: "Caladea/Caladea-Italic.ttf",
      Bold: "Caladea/Caladea-Bold.ttf",
      BoldItalic: "Caladea/Caladea-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "NotoSansSymbols2",
    label: "Noto Sans Symbols 2",
    css: "NotoSansSymbols2, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansSymbols2/NotoSansSymbols2-Regular.ttf",
    },
    fallback: true,
  },
  {
    value: "NotoSansMath",
    label: "Noto Sans Math",
    css: "NotoSansMath, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansMath/NotoSansMath-Regular.ttf",
    },
    fallback: true,
  },
  {
    value: "FiraSans",
    label: "Fira Sans",
    css: "FiraSans, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "FiraSans/FiraSans-Regular.ttf",
      Italic: "FiraSans/FiraSans-Italic.ttf",
      Bold: "FiraSans/FiraSans-Bold.ttf",
      BoldItalic: "FiraSans/FiraSans-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "FiraMono",
    label: "Fira Mono",
    css: "FiraMono, monospace",
    category: "monospace",
    styles: {
      Regular: "FiraMono/FiraMono-Regular.ttf",
      Bold: "FiraMono/FiraMono-Bold.ttf",
    },
    fallback: false,
  },
  {
    value: "Mukta",
    label: "Mukta",
    css: "Mukta, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "Mukta/Mukta-Regular.ttf",
      Bold: "Mukta/Mukta-Bold.ttf",
    },
    fallback: false,
  },
  {
    value: "BreeSerif",
    label: "Bree Serif",
    css: "BreeSerif, serif",
    category: "serif",
    styles: {
      Regular: "BreeSerif/BreeSerif-Regular.ttf",
    },
    fallback: false,
  },
  {
    value: "NotoSans",
    label: "Noto Sans",
    css: "NotoSans, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSans/NotoSans-Regular.ttf",
      Bold: "NotoSans/NotoSans-Bold.ttf",
      Italic: "NotoSans/NotoSans-Italic.ttf",
      BoldItalic: "NotoSans/NotoSans-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "NotoSerif",
    label: "Noto Serif",
    css: "NotoSerif, serif",
    category: "serif",
    styles: {
      Regular: "NotoSerif/NotoSerif-Regular.ttf",
      Bold: "NotoSerif/NotoSerif-Bold.ttf",
      Italic: "NotoSerif/NotoSerif-Italic.ttf",
      BoldItalic: "NotoSerif/NotoSerif-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "NotoSansMono",
    label: "Noto Sans Mono",
    css: "NotoSansMono, monospace",
    category: "monospace",
    styles: {
      Regular: "NotoSansMono/NotoSansMono-Regular.ttf",
      Bold: "NotoSansMono/NotoSansMono-Bold.ttf",
    },
    fallback: false,
  },
  {
    value: "SourceSans3",
    label: "Source Sans 3",
    css: "SourceSans3, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "SourceSans3/SourceSans3-Regular.ttf",
      Bold: "SourceSans3/SourceSans3-Bold.ttf",
      Italic: "SourceSans3/SourceSans3-Italic.ttf",
      BoldItalic: "SourceSans3/SourceSans3-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "SourceSerif4",
    label: "Source Serif 4",
    css: "SourceSerif4, serif",
    category: "serif",
    styles: {
      Regular: "SourceSerif4/SourceSerif4-Regular.ttf",
      Bold: "SourceSerif4/SourceSerif4-Bold.ttf",
      Italic: "SourceSerif4/SourceSerif4-Italic.ttf",
      BoldItalic: "SourceSerif4/SourceSerif4-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Roboto",
    label: "Roboto",
    css: "Roboto, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "Roboto/Roboto-Regular.ttf",
      Bold: "Roboto/Roboto-Bold.ttf",
      Italic: "Roboto/Roboto-Italic.ttf",
      BoldItalic: "Roboto/Roboto-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "Montserrat",
    label: "Montserrat",
    css: "Montserrat, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "Montserrat/Montserrat-Regular.ttf",
      Bold: "Montserrat/Montserrat-Bold.ttf",
      Italic: "Montserrat/Montserrat-Italic.ttf",
      BoldItalic: "Montserrat/Montserrat-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "OpenSans",
    label: "Open Sans",
    css: "OpenSans, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "OpenSans/OpenSans-Regular.ttf",
      Bold: "OpenSans/OpenSans-Bold.ttf",
      Italic: "OpenSans/OpenSans-Italic.ttf",
      BoldItalic: "OpenSans/OpenSans-BoldItalic.ttf",
    },
    fallback: false,
  },
  {
    value: "NotoSansArabic",
    label: "Noto Sans Arabic",
    css: "NotoSansArabic, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansArabic/NotoSansArabic-Regular.ttf",
      Bold: "NotoSansArabic/NotoSansArabic-Bold.ttf",
    },
    fallback: true,
  },
  {
    value: "NotoSansHebrew",
    label: "Noto Sans Hebrew",
    css: "NotoSansHebrew, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansHebrew/NotoSansHebrew-Regular.ttf",
      Bold: "NotoSansHebrew/NotoSansHebrew-Bold.ttf",
    },
    fallback: true,
  },
  {
    value: "NotoSansThai",
    label: "Noto Sans Thai",
    css: "NotoSansThai, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansThai/NotoSansThai-Regular.ttf",
      Bold: "NotoSansThai/NotoSansThai-Bold.ttf",
    },
    fallback: true,
  },
  {
    value: "NotoSansDevanagari",
    label: "Noto Sans Devanagari",
    css: "NotoSansDevanagari, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
      Bold: "NotoSansDevanagari/NotoSansDevanagari-Bold.ttf",
    },
    fallback: true,
  },
  {
    value: "NotoSansSC",
    label: "Noto Sans SC (CJK)",
    css: "NotoSansSC, sans-serif",
    category: "sans-serif",
    styles: {
      Regular: "NotoSansSC/NotoSansSC-Regular.ttf",
    },
    fallback: true,
  },
  {
    value: "Helvetica",
    label: "Helvetica · estándar PDF",
    css: "Arial, sans-serif",
    category: "sans-serif",
  },
  {
    value: "Times-Roman",
    label: "Times",
    css: "Times New Roman, serif",
    category: "serif",
  },
  {
    value: "Courier",
    label: "Courier",
    css: "Courier New, monospace",
    category: "monospace",
  },
  {value:"NotoEmoji",label:"Noto Emoji · símbolos y emoji",css:"NotoEmoji, sans-serif",category:"sans-serif",styles:{Regular:"NotoEmoji/NotoEmoji-Regular.ttf"},fallback:true},
  ...extraFontFamilies,
  ...referenceFontFamilies,
];

const fallbacks = [
  "NotoSans",
  "NotoSansMath",
  "NotoSansSymbols2",
  "NotoEmoji",
  "NotoSansArabic",
  "NotoSansHebrew",
  "NotoSansThai",
  "NotoSansDevanagari",
  "NotoSansSC",
];
function fallbackOrder(text: string): string[] {
  const preferred: string[] = [];
  if (/\p{Script=Arabic}/u.test(text)) preferred.push("NotoSansArabic");
  if (/\p{Script=Hebrew}/u.test(text)) preferred.push("NotoSansHebrew");
  if (/\p{Script=Thai}/u.test(text)) preferred.push("NotoSansThai");
  if (/\p{Script=Devanagari}/u.test(text)) preferred.push("NotoSansDevanagari");
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text))
    preferred.push("NotoSansSC");
  if (/\p{Extended_Pictographic}/u.test(text))
    preferred.push("NotoEmoji", "NotoSansSymbols2");
  if (/\p{Math}/u.test(text)) preferred.push("NotoSansMath");
  return [...new Set([...preferred, ...fallbacks])];
}
export const fontCss = (font?: string) => {
  if (font && /^local-[a-f0-9]{20}$/.test(font))
    return [font, ...fallbacks, "serif"].join(", ");
  const family = fontFamilies.find((f) => f.value === font) ?? fontFamilies[0];
  const [primary, ...generic] = family.css.split(",");
  return [
    primary,
    ...fallbacks.filter((name) => name !== family.value),
    ...generic,
  ].join(", ");
};

let fontBaseUrl: string | undefined;
function localFontBaseUrl() {
  const base =
    fontBaseUrl ??
    (typeof document !== "undefined"
      ? document.baseURI
      : globalThis.location?.href);
  if (!base)
    throw new Error(
      "No se ha definido la ubicación de las tipografías locales.",
    );
  return base;
}
let loader = (name: string): Promise<Uint8Array> =>
  fetch(new URL("./fonts/" + name, localFontBaseUrl())).then(
    async (response) => {
      if (!response.ok)
        throw new Error("No se pudo abrir la tipografía local.");
      return new Uint8Array(await response.arrayBuffer());
    },
  );
const data = new Map<string, Promise<Uint8Array>>();
const dataSizes = new Map<string, number>();
const fontCacheLimit = 20 * 1024 * 1024;
let fontkitPromise: Promise<typeof import("@pdf-lib/fontkit")> | undefined;
function loadFontkit() {
  return (fontkitPromise ??= (async () => {
    // Fontkit's Indic shaping engine expects this runtime on the global scope.
    await import("regenerator-runtime/runtime.js");
    return (await import("@pdf-lib/fontkit")).default;
  })());
}
export function clearFontDataCache() {
  data.clear();
  dataSizes.clear();
}
export function setFontBaseUrl(url: string) {
  const next = new URL(url).href;
  if (fontBaseUrl === next) return;
  fontBaseUrl = next;
  clearFontDataCache();
}
export function setFontLoader(next: typeof loader) {
  loader = next;
  clearFontDataCache();
}
export function readFontFile(file: string): Promise<Uint8Array> {
  const cached = data.get(file);
  if (cached) {
    data.delete(file);
    data.set(file, cached);
    return cached;
  }
  const pending = loader(file);
  data.set(file, pending);
  void pending.then(
    (bytes) => {
      if (data.get(file) !== pending) return;
      dataSizes.set(file, bytes.byteLength);
      let cachedBytes = [...dataSizes.values()].reduce(
        (total, size) => total + size,
        0,
      );
      for (const key of data.keys()) {
        if (cachedBytes <= fontCacheLimit) break;
        if (key === file) continue;
        cachedBytes -= dataSizes.get(key) ?? 0;
        dataSizes.delete(key);
        data.delete(key);
      }
    },
    () => {
      if (data.get(file) === pending) {
        data.delete(file);
        dataSizes.delete(file);
      }
    },
  );
  return pending;
}
export function fontFile(
  family: string,
  bold = false,
  italic = false,
): string | undefined {
  const known = fontFamilies.find((f) => f.value === family) ?? fontFamilies[0];
  const style: FontStyle = bold
    ? italic
      ? "BoldItalic"
      : "Bold"
    : italic
      ? "Italic"
      : "Regular";
  if (known.styles) {
    // Families without true italic use their upright face. CSS may synthesize
    // italic; PDF never requests a nonexistent asset or changes the font binary.
    return (
      known.styles[style] ??
      known.styles[bold ? "Bold" : "Regular"] ??
      known.styles.Regular
    );
  }
  return known.file ? known.file + "-" + style + ".ttf" : undefined;
}
export function fontStyleAvailable(
  family: string,
  bold = false,
  italic = false,
): boolean {
  const known = fontFamilies.find((item) => item.value === family);
  if (!known) return false;
  const style: FontStyle = bold
    ? italic
      ? "BoldItalic"
      : "Bold"
    : italic
      ? "Italic"
      : "Regular";
  return known.styles ? !!known.styles[style] : true;
}
const coverage = new WeakMap<PDFFont, Set<number>>();
const nonPrinting = (character: string) =>
  /[\t\r\n]/u.test(character) ||
  /\p{Default_Ignorable_Code_Point}/u.test(character);
export function unsupportedCodePoints(font: PDFFont, text: string): number[] {
  if (!coverage.has(font)) coverage.set(font, new Set(font.getCharacterSet()));
  const glyphs = coverage.get(font)!;
  return [
    ...new Set(
      Array.from(text)
        .filter((character) => !nonPrinting(character))
        .map((character) => character.codePointAt(0)!)
        .filter((point) => !glyphs.has(point)),
    ),
  ];
}
export class UnsupportedGlyphError extends Error {
  readonly codePoints: number[];
  constructor(points: number[]) {
    const labels = points
      .slice(0, 8)
      .map((point) => "U+" + point.toString(16).toUpperCase().padStart(4, "0"));
    super(
      "Las tipografías locales no incluyen estos caracteres: " +
        labels.join(", ") +
        ". Cambia los caracteres o incorpora una fuente que los incluya.",
    );
    this.name = "UnsupportedGlyphError";
    this.codePoints = points;
  }
}
export function assertFontCoverage(font: PDFFont, text: string) {
  const missing = unsupportedCodePoints(font, text);
  if (missing.length) throw new UnsupportedGlyphError(missing);
}

export function createFontProvider(doc: PDFDocument, local: LocalFont[] = []) {
  const fonts = new Map<string, Promise<PDFFont>>();
  async function embed(
    family = "PrismaSans",
    bold = false,
    italic = false,
  ): Promise<PDFFont> {
    const localFamily = local.filter((f) => f.value === family);
    if (localFamily.length) {
      const style: FontStyle = bold
        ? italic
          ? "BoldItalic"
          : "Bold"
        : italic
          ? "Italic"
          : "Regular";
      const asset =
        localFamily.find((f) => f.style === style) ??
        localFamily.find((f) => f.style === (bold ? "Bold" : "Regular")) ??
        localFamily[0];
      if (!fonts.has(asset.hash))
        fonts.set(
          asset.hash,
          (async () => {
            doc.registerFontkit(await loadFontkit());
            return doc.embedFont(decodeFont(asset.bytes), {
              subset: false,
              features: { liga: false, clig: false },
            });
          })(),
        );
      return fonts.get(asset.hash)!;
    }
    const known =
      fontFamilies.find((f) => f.value === family) ?? fontFamilies[0];
    const file = fontFile(known.value, bold, italic);
    const key =
      file ??
      known.value + (bold ? "Bold" : "Regular") + (italic ? "Italic" : "");
    if (!fonts.has(key)) {
      const pending = (async () => {
        if (file) {
          doc.registerFontkit(await loadFontkit());
          // Fontkit 1.1.1 creates invalid outlines for several modern fonts
          // when subsetting. Keep validated originals and disable optional
          // Latin ligatures so exported words remain copyable.
          return doc.embedFont(await readFontFile(file), {
            subset: false,
            features: { liga: false, clig: false },
          });
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
      })();
      fonts.set(key, pending);
      void pending.catch(() => {
        if (fonts.get(key) === pending) fonts.delete(key);
      });
    }
    return fonts.get(key)!;
  }
  return async (
    family = "PrismaSans",
    bold = false,
    italic = false,
    text?: string,
  ): Promise<PDFFont> => {
    const preferred = await embed(family, bold, italic);
    if (!text || !unsupportedCodePoints(preferred, text).length)
      return preferred;
    // The fourth argument handles a run whose characters share one fallback.
    // Mixed scripts should use resolveFontRuns so each run keeps its typography.
    for (const alternative of fallbackOrder(text)) {
      const candidate = await embed(alternative, bold, italic);
      if (!unsupportedCodePoints(candidate, text).length) return candidate;
    }
    throw new UnsupportedGlyphError(unsupportedCodePoints(preferred, text));
  };
}
export type FontProvider = ReturnType<typeof createFontProvider>;
/** A full OTF container is OpenType, rather than a raw CFF font program. */
export async function finalizeFontStreams(doc: PDFDocument) {
  await doc.flush();
  const descriptors = new Set<PDFDict>();
  for (const [, object] of doc.context.enumerateIndirectObjects())
    if (
      object instanceof PDFDict &&
      object.get(PDFName.of("Type")) === PDFName.of("FontDescriptor")
    ) {
      const ref =
        object.get(PDFName.of("FontFile2")) ??
        object.get(PDFName.of("FontFile3"));
      if (!ref) continue;
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) continue;
      const bytes = decodePDFRawStream(stream).decode();
      if (
        bytes[0] !== 79 ||
        bytes[1] !== 84 ||
        bytes[2] !== 84 ||
        bytes[3] !== 79
      )
        continue;
      stream.dict.set(PDFName.of("Subtype"), PDFName.of("OpenType"));
      object.delete(PDFName.of("FontFile2"));
      object.set(PDFName.of("FontFile3"), ref);
      descriptors.add(object);
    }
  for (const [, object] of doc.context.enumerateIndirectObjects())
    if (
      object instanceof PDFDict &&
      object.get(PDFName.of("Subtype")) === PDFName.of("CIDFontType2")
    ) {
      const ref = object.get(PDFName.of("FontDescriptor"));
      if (ref && descriptors.has(doc.context.lookup(ref) as PDFDict)) {
        object.set(PDFName.of("Subtype"), PDFName.of("CIDFontType0"));
        object.delete(PDFName.of("CIDToGIDMap"));
      }
    }
}
export type FontRun = { text: string; font: PDFFont; family: string };

export async function resolveFontRuns(
  getFont: FontProvider,
  family: string,
  bold: boolean,
  italic: boolean,
  text: string,
): Promise<FontRun[]> {
  const preferred = await getFont(family, bold, italic);
  if (!unsupportedCodePoints(preferred, text).length)
    return [{ text, font: preferred, family }];
  const runs: FontRun[] = [];
  const missing = new Set<number>();
  const segments =
    typeof Intl.Segmenter === "function"
      ? [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            text,
          ),
        ]
      : Array.from(text, (segment) => ({ segment }));
  for (const { segment } of segments) {
    let chosen: FontRun = { text: segment, font: preferred, family };
    if (unsupportedCodePoints(preferred, segment).length) {
      let found = false;
      for (const alternative of fallbackOrder(segment)) {
        const candidate = await getFont(alternative, bold, italic);
        if (!unsupportedCodePoints(candidate, segment).length) {
          chosen = { text: segment, font: candidate, family: alternative };
          found = true;
          break;
        }
      }
      if (!found)
        unsupportedCodePoints(preferred, segment).forEach((point) =>
          missing.add(point),
        );
    }
    if (runs.at(-1)?.font === chosen.font)
      runs[runs.length - 1].text += segment;
    else runs.push(chosen);
  }
  if (missing.size) throw new UnsupportedGlyphError([...missing]);
  return runs;
}
