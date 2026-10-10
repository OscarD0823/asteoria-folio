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
const writer = process.env.VITE_PRODUCT === "writer";
const appVersion = writer
  ? "1.0.0"
  : JSON.parse(readFileSync("package.json", "utf8")).version;
const releaseTag = (writer ? "writer-v" : "v") + appVersion;
const assetName = writer ? "Prisma-Writer" : "Prisma-PDF";
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
      features: [
        "Biblioteca de fuentes con favoritas, texto de muestra y vistas de lista o tarjetas",
        "Galería de estilos, índices con relleno y numeración alineada",
        "Revisor ortográfico de español e inspector Unicode locales",
        "Escritura con separación de páginas e importación de DOCX",
        "Comprobación de actualizaciones sin enviar documentos",
      ],
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
  "typo-js",
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
