import {
  cpSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
await import('./prepare-proofing.mjs');
const {gunzipSync}=require('node:zlib');
const {unlinkSync}=require('node:fs');
const writer = process.env.VITE_PRODUCT === "writer";
const sheets = process.env.VITE_PRODUCT === "sheets";
const products=JSON.parse(readFileSync('products.json','utf8'));
const kind=process.env.VITE_PRODUCT&&products[process.env.VITE_PRODUCT]?process.env.VITE_PRODUCT:'pdf';
const appVersion=products[kind].version;
const releaseTag =
  (kind==='pdf'?'v':kind+'-v')+appVersion;
const assetName=products[kind].name.replace(' ','-');
const suiteFeatures={prisma:['Panel general con los seis editores propios de Prisma','Biblioteca local con búsqueda, filtros y apertura de archivos','Guardado antes de cambiar de aplicación e instalación independiente'],pdf:['Motores propios y taller PDF local','Macros Prisma en vista de escritura y corrector en 8 idiomas','Exportación DOCX, ODT, RTF y PDF'],writer:['Motor propio de conservación DOCX/DOCM','Macros portables y corrector en 8 idiomas con 11 diccionarios','Exportación DOCX, ODT, RTF, HTML, Markdown y PDF'],sheets:['Macros locales para celdas, cálculos y reemplazos','Corrector en 8 idiomas','Exportación XLSX, CSV, TSV, JSON, ODS de valores, DOCX y PDF'],slides:['Motor propio PPTX/PPTM y conservación de partes','Macros locales y corrector en 8 idiomas','Exportación PPTX, PDF y SVG'],data:['Macros Prisma y SQL con transacciones locales','Tablas, registros y relaciones SQLite','Exportación SQLite, CSV, JSON y XLSX'],publisher:['Motor propio para publicaciones y páginas A4','Macros y corrector en 8 idiomas','Exportación PPTX, PDF y SVG']};
const release = "https://github.com/OscarD0823/prisma-pdf/releases/";
writeFileSync(
  "public/version.json",
  JSON.stringify(
    {
      version: appVersion,
      releaseUrl: release + "tag/" + releaseTag,
      androidUrl:
        release +
        "download/" +
        releaseTag +
        "/" +
        assetName +
        "-" +
        appVersion +
        "-Android.apk",
      windowsUrl:
        release +
        "download/" +
        releaseTag +
        "/" +
        assetName +
        "-" +
        appVersion +
        "-Windows-Setup.exe",
      features: suiteFeatures[kind] ?? (sheets
        ? [
            "Aplicación instalable y biblioteca completa de fuentes con favoritas",
            "Editor local de hojas XLSX y CSV",
            "Fórmulas, formatos y varias hojas",
            "Tablas para Word y Writer, exportación PDF e impresión",
            "Guardado local y aviso de funciones incompatibles",
          ]
        : [
            "Aplicación instalable y descarga opcional de biblioteca sin conexión",
            "Diccionario personal con definiciones e importación local",
            "Informe de compatibilidad al importar documentos Word",
            "Índices de tablas y figuras actualizables en Word",
            "Biblioteca de fuentes con favoritas, texto de muestra y vistas de lista o tarjetas",
            "Galería de estilos, índices con relleno y numeración alineada",
            "Revisor ortográfico de español e inspector Unicode locales",
            "Escritura con separación de páginas e importación de DOCX",
            "Comprobación de actualizaciones sin enviar documentos",
          ]),
    },
    null,
    2,
  ) + "\n",
);
const base = dirname(require.resolve("pdfjs-dist/package.json"));
mkdirSync("public/pdfjs", { recursive: true });
for (const name of ["cmaps", "standard_fonts", "wasm"])
  cpSync(join(base, name), join("public/pdfjs", name), { recursive: true });
const engine = dirname(require.resolve("mupdf"));
const ocr=dirname(require.resolve('tesseract.js/package.json')),ocrCore=dirname(require.resolve('tesseract.js-core/package.json'));
mkdirSync('public/ocr/lang',{recursive:true});cpSync(join(ocr,'dist/worker.min.js'),'public/ocr/worker.min.js');
for(const file of ['tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm'])cpSync(join(ocrCore,file),'public/ocr/'+file);
for(const lang of ['spa','eng']){const packed=join(dirname(require.resolve('@tesseract.js-data/'+lang+'/package.json')),'4.0.0_best_int',lang+'.traineddata.gz');writeFileSync('public/ocr/lang/'+lang+'.traineddata',gunzipSync(readFileSync(packed)));if(existsSync('public/ocr/lang/'+lang+'.traineddata.gz'))unlinkSync('public/ocr/lang/'+lang+'.traineddata.gz');}
mkdirSync("public/engine", { recursive: true });
for (const name of ["mupdf.js", "mupdf-wasm.js", "mupdf-wasm.wasm"])
  cpSync(join(engine, name), join("public/engine", name));
mkdirSync("public/third-party", { recursive: true });
mkdirSync("public/spelling", { recursive: true });
const dictionary = dirname(require.resolve("dictionary-es"));
for (const file of ["index.aff", "index.dic"])
  cpSync(join(dictionary, file), join("public/spelling", file));
cpSync(join(dictionary, "license"), "public/spelling/LICENSE.txt");
for (const dependency of [
  "mupdf",
  "pdf-lib",
  "@pdf-lib/fontkit",
  "mathjax-full",
  "regenerator-runtime",
  "@tiptap/pm",
  "pdfjs-dist",
  "react",
  "react-dom",
  "lucide-react",
  "@capacitor/core",
  "@capacitor/android",
  "@capacitor/filesystem",
  "@capacitor/share",
  "@tiptap/core",
  "@tiptap/react",
  "@tiptap/starter-kit",
  "@tiptap/extension-image",
  "@tiptap/extension-table",
  "@tiptap/extension-text-style",
  "@tiptap/extension-text-align",
  "@tiptap/extension-placeholder",
  "@tiptap/extension-subscript",
  "@tiptap/extension-superscript",
  "docx",
  "citeproc",
  "fflate",
  "exceljs",
  "hyperformula",
  "typo-js",
  "hunspell-asm",
  "@xmldom/xmldom",
  "jszip",
  "fast-xml-parser",
  "utif2",
  "buffer",
  "@noble/hashes",
  "pptxgenjs",
  "sql.js",
  "tesseract.js",
  "tesseract.js-core",
  "opentype.js",
  "bidi-js",
]) {
  let root;
  if (dependency === "mupdf") root = dirname(engine);
  else
    try {
      root = dirname(require.resolve(dependency + "/package.json"));
    } catch {
      root = dirname(
        require.resolve(
          dependency === "@tiptap/pm" ? "@tiptap/pm/model" : dependency,
        ),
      );
      while (!existsSync(join(root, "package.json")) && root !== dirname(root))
        root = dirname(root);
    }
  const license = ["LICENSE", "LICENSE.md", "LICENSE.txt"]
    .map((name) => join(root, name))
    .find((path) => existsSync(path));
  if (license)
    cpSync(
      license,
      join(
        "public/third-party",
        dependency.replaceAll("/", "-") + "-LICENSE.txt",
      ),
    );
}
const pmRequire = createRequire(
  createRequire(require.resolve("@tiptap/core")).resolve("@tiptap/pm/model"),
);
for (const dependency of [
  "prosemirror-model",
  "prosemirror-state",
  "prosemirror-view",
  "prosemirror-transform",
  "prosemirror-history",
  "prosemirror-commands",
  "prosemirror-schema-list",
  "prosemirror-keymap",
  "prosemirror-dropcursor",
  "prosemirror-gapcursor",
  "prosemirror-inputrules",
  "prosemirror-tables",
]) {
  let root = dirname(pmRequire.resolve(dependency));
  while (!existsSync(join(root, "package.json")) && root !== dirname(root))
    root = dirname(root);
  const license = ["LICENSE", "LICENSE.md", "LICENSE.txt"]
    .map((name) => join(root, name))
    .find(existsSync);
  if (license)
    cpSync(license, join("public/third-party", dependency + "-LICENSE.txt"));
}
