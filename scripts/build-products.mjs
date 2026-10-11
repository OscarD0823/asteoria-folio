import { spawnSync } from "node:child_process";
import {
  cpSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  realpathSync,
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
run(["scripts/bundle-prisma-engines.mjs"]);
run(["scripts/prepare-assets.mjs"]);
run(["node_modules/typescript/bin/tsc", "--noEmit"]);
run(["node_modules/vite/bin/vite.js", "build"],{VITE_PRODUCT:'pdf'});
run(["scripts/package-source.mjs"]);
run(["scripts/build-offline.mjs"]);
try {
  for (const [kind, name, description] of [
    ["writer", "Prisma Writer", "Procesador de documentos local y privado"],
    [
      "sheets",
      "Prisma Sheets",
      "Hojas de cálculo locales compatibles con XLSX",
    ],
    ['slides','Prisma Slides','Presentaciones locales compatibles con PPTX'],
    ['data','Prisma Data','Bases de datos y consultas locales'],
    ['publisher','Prisma Publisher','Diseño de publicaciones y páginas para imprimir'],
    ['prisma','Prisma','Tu espacio de trabajo local con las seis aplicaciones Prisma'],
  ]) {
    const output = "dist-" + kind;
    run(["scripts/prepare-assets.mjs"], { VITE_PRODUCT: kind });
    run(["node_modules/vite/bin/vite.js", "build", "--outDir", output], {
      VITE_PRODUCT: kind,
    });
    cpSync("public/" + kind + "-logo.svg", output + "/logo.svg");
    cpSync("public/" + kind + "-icons", output + "/icons", { recursive: true });
    const manifest = JSON.parse(
      readFileSync("public/manifest.webmanifest", "utf8"),
    );
    Object.assign(manifest, {
      name,
      short_name: name,
      description,
      categories: ["productivity"],
      id: "./",
      start_url: "./",
      scope: "./",
    });
    writeFileSync(
      output + "/manifest.webmanifest",
      JSON.stringify(manifest, null, 2) + "\n",
    );
    cpSync(
      "dist/prisma-pdf-source.tar.gz",
      output + "/prisma-pdf-source.tar.gz",
    );
    cpSync("LICENSE", output + "/LICENSE.txt");
    run(["scripts/build-offline.mjs"], { PRISMA_OUTDIR: output });
  }
} finally {
  run(["scripts/prepare-assets.mjs"]);
}
run(['scripts/assemble-site.mjs']);
