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
const appVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
const release = "https://github.com/OscarD0823/prisma-pdf/releases/";
writeFileSync(
  "public/version.json",
  JSON.stringify(
    {
      version: appVersion,
      releaseUrl: release + "tag/v" + appVersion,
      androidUrl:
        release +
        "download/v" +
        appVersion +
        "/Prisma-PDF-" +
        appVersion +
        "-Android.apk",
      windowsUrl:
        release +
        "download/v" +
        appVersion +
        "/Prisma-PDF-" +
        appVersion +
        "-Windows-Setup.exe",
      features: [
        "Biblioteca de 81 familias tipográficas e importación de fuentes personales",
        "Reglas laterales y secciones con diseño independiente",
        "Más estilos bibliográficos, citas y búsqueda con reemplazo",
        "Exportación a Word, HTML, Markdown, TXT e imágenes",
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
