import { cpSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
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
]) {
  let root;
  if (dependency === "mupdf") root = dirname(engine);
  else
    try {
      root = dirname(require.resolve(dependency + "/package.json"));
    } catch {
      root = dirname(require.resolve(dependency));
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
const pmRequire=createRequire(createRequire(require.resolve('@tiptap/core')).resolve('@tiptap/pm/model'));
for(const dependency of ['prosemirror-model','prosemirror-state','prosemirror-view','prosemirror-transform','prosemirror-history','prosemirror-commands','prosemirror-schema-list','prosemirror-keymap','prosemirror-dropcursor','prosemirror-gapcursor','prosemirror-inputrules','prosemirror-tables']){
  let root=dirname(pmRequire.resolve(dependency));while(!existsSync(join(root,'package.json'))&&root!==dirname(root))root=dirname(root);
  const license=['LICENSE','LICENSE.md','LICENSE.txt'].map(name=>join(root,name)).find(existsSync);if(license)cpSync(license,join('public/third-party',dependency+'-LICENSE.txt'));
}
