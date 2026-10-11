import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const sharp = require(process.env.PRISMA_SHARP_PATH || "sharp");
// Render our own SVG marks inside the central maskable safe area.
for (const [logo, folder, color] of [
  ["logo.svg", "icons", "#171f39"],
  ["writer-logo.svg", "writer-icons", "#edf8f5"],
  ["sheets-logo.svg", "sheets-icons", "#eaf5ee"],
  ['slides-logo.svg','slides-icons','#f4ecfc'],
  ['data-logo.svg','data-icons','#fceff0'],
  ['publisher-logo.svg','publisher-icons','#e9f4f6'],
  ['prisma-logo.svg','prisma-icons','#f8f9fd'],
]) {
  const source = readFileSync("public/" + logo).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${color}"/><image href="data:image/svg+xml;base64,${source}" x="92" y="92" width="328" height="328"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile("public/" + folder + "/prisma-maskable-512.png");
}
