import { spawnSync } from "node:child_process";
import {
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { resolve, dirname, basename } from "node:path";
const run = (args, env = {}) => {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0)
    throw new Error("No se pudo completar: " + args.join(" "));
};
run(["scripts/prepare-assets.mjs"]);
run(["node_modules/typescript/bin/tsc", "--noEmit"]);
run(["node_modules/vite/bin/vite.js", "build"]);
run(["scripts/package-source.mjs"]);
run(["scripts/build-offline.mjs"]);
try {
  run(["scripts/prepare-assets.mjs"], { VITE_PRODUCT: "writer" });
  run(["node_modules/vite/bin/vite.js", "build", "--outDir", "dist-writer"], {
    VITE_PRODUCT: "writer",
  });
  cpSync("public/writer-logo.svg", "dist-writer/logo.svg");
  cpSync("public/writer-icons", "dist-writer/icons", { recursive: true });
  const manifest = JSON.parse(
    readFileSync("public/manifest.webmanifest", "utf8"),
  );
  Object.assign(manifest, {
    name: "Prisma Writer",
    short_name: "Prisma Writer",
    description: "Procesador de documentos local y privado",
    categories: ["productivity"],
    id: "./",
    start_url: "./",
    scope: "./",
  });
  writeFileSync(
    "dist-writer/manifest.webmanifest",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  cpSync(
    "dist/prisma-pdf-source.tar.gz",
    "dist-writer/prisma-pdf-source.tar.gz",
  );
  cpSync("LICENSE", "dist-writer/LICENSE.txt");
  run(["scripts/build-offline.mjs"], { PRISMA_OUTDIR: "dist-writer" });
} finally {
  run(["scripts/prepare-assets.mjs"]);
}
// Keep native packages separate; GitHub Pages receives the combined directory.
const siteOutput = resolve("dist-site");
if (
  dirname(siteOutput) !== resolve(".") ||
  basename(siteOutput) !== "dist-site"
)
  throw new Error("Directorio de publicación no válido");
rmSync(siteOutput, { recursive: true, force: true });
mkdirSync("dist-site", { recursive: true });
cpSync("dist", "dist-site", { recursive: true });
cpSync("dist-writer", "dist-site/writer", { recursive: true });
console.log(
  "Prisma PDF: dist · Prisma Writer: dist-writer · Web pública: dist-site",
);
