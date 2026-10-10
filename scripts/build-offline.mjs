import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { offlineWorker } from "./offline-worker.mjs";
const files = [];
const output = process.env.PRISMA_OUTDIR || "dist";
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (
      ![
        "sw.js",
        "prisma-pdf-source.tar.gz",
        "LICENSE.txt",
        "licencias.txt",
      ].includes(entry.name) &&
      !full.includes("third-party")
    )
      files.push(path.relative(output, full).replaceAll("\\", "/"));
  }
}
walk(output);
files.sort();
const hash = crypto.createHash("sha256");
const resources = {};
for (const name of files) {
  const bytes = fs.readFileSync(path.join(output, name));
  hash.update(name).update(bytes);
  resources[name] = crypto.createHash("sha256").update(bytes).digest("hex");
}
const version = hash.digest("hex").slice(0, 16);
fs.writeFileSync(path.join(output, "sw.js"), offlineWorker(resources, version));
console.log(
  `Offline cache: ${files.length} application resources, version ${version}`,
);
