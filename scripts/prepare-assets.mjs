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
const suiteFeatures={pdf:['OCR español e inglés sin subir documentos','Taller PDF: formularios, imposición, división y metadatos','94 familias de fuentes y diccionarios locales'],writer:['Conservación de partes originales DOCX en cambios de texto compatibles','Revisión de notas al pie, notas finales y comentarios de Word','94 familias de fuentes y biblioteca StarDict/ODict'],sheets:['Hojas XLSX, fórmulas, formatos y exportación','94 familias de fuentes locales'],slides:['Edición local de PPTX con texto, imágenes, tablas, formas y notas','Objetos movibles, reglas y exportación PDF'],data:['SQLite en el navegador con tablas, relaciones y consultas SQL','Importación CSV/XLSX y exportación SQLite, CSV, JSON y XLSX'],publisher:['Publicaciones A4, plantillas, reglas y objetos movibles','Guardado local y exportación PPTX editable o PDF']};
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
for(const engine of ['genoffice','pdfcraft'])for(const file of ['LICENSE','NOTICE','SOURCE.json'])if(existsSync('vendor/'+engine+'/'+file))cpSync('vendor/'+engine+'/'+file,'public/third-party/'+engine+'-'+file+'.txt');
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
