import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Optional authoring dependency; the exported icons are already included in Git.
// Set PRISMA_SHARP_PATH to a shared Sharp install, or install Sharp locally.
const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require(process.env.PRISMA_SHARP_PATH || "sharp");
} catch {
  throw new Error(
    "Para regenerar los iconos instala Sharp o define PRISMA_SHARP_PATH. Los iconos publicados no necesitan esta dependencia.",
  );
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const kind = process.argv.includes("--sheets") ? "sheets" : "pdf";
const icons = resolve(root, kind === "sheets" ? "public/sheets-icons" : "public/icons");
const logo = resolve(root, kind === "sheets" ? "public/sheets-logo.svg" : "public/logo.svg");
mkdirSync(icons, { recursive: true });
for (const size of [192, 512, 1024]) {
  await sharp(logo)
    .resize(size, size)
    .png()
    .toFile(resolve(icons, `prisma-${size}.png`));
}

// A Windows ICO contains PNG images at each of the requested resolutions.
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = await Promise.all(
  sizes.map((size) => sharp(logo).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
for (let i = 0; i < images.length; i++) {
  const entry = 6 + i * 16;
  header.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], entry);
  header.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
writeFileSync(resolve(icons, "prisma.ico"), Buffer.concat([header, ...images]));
console.log(
  "Iconos de Prisma PDF exportados: PNG 192, 512 y 1024 px; ICO de 16 a 256 px.",
);

const previewIndex = process.argv.indexOf("--preview");
if (previewIndex !== -1) {
  const destination = process.argv[previewIndex + 1];
  if (!destination)
    throw new Error("Especifica el archivo PNG despues de --preview.");
  const asset = `data:image/svg+xml;base64,${readFileSync(logo).toString("base64")}`;
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="920" viewBox="0 0 1400 920">
    <rect width="1400" height="920" fill="#f5f6fc"/>
    <rect x="34" y="34" width="1332" height="852" rx="30" fill="#fff" stroke="#e2e5f0"/>
    <g font-family="Segoe UI, sans-serif">
      <text x="82" y="101" fill="#6e7391" font-size="15" font-weight="600" letter-spacing="3">IDENTIDAD VISUAL · PRISMA PDF</text>
      <text x="82" y="149" fill="#171f39" font-size="28" font-weight="600">Todo empieza con una página.</text>
      <image href="${asset}" x="83" y="219" width="340" height="340"/>
      <image href="${asset}" x="522" y="275" width="92" height="92"/>
      <text x="638" y="332" fill="#171f39" font-size="54" font-weight="700" letter-spacing="-2">Prisma <tspan fill="#705de0">PDF</tspan></text>
      <text x="640" y="365" fill="#767c98" font-size="19">Crea. Edita. Continúa.</text>
      <line x1="525" y1="417" x2="1284" y2="417" stroke="#e9eaf3"/>
      <text x="525" y="453" fill="#767c98" font-size="15">Documento, prisma y luz: una marca reconocible en cada pantalla.</text>
      <g transform="translate(525 484)">
        <circle cx="17" cy="17" r="17" fill="#171f39"/><circle cx="67" cy="17" r="17" fill="#7259e8"/>
        <circle cx="117" cy="17" r="17" fill="#a17afa"/><circle cx="167" cy="17" r="17" fill="#72c6fb"/>
        <circle cx="217" cy="17" r="17" fill="#d59bd5"/><circle cx="267" cy="17" r="17" fill="#f5f6fc" stroke="#dedfec"/>
      </g>
      <rect x="64" y="612" width="1272" height="244" rx="22" fill="#171f39"/>
      <text x="96" y="656" fill="#bfc1e1" font-size="14" letter-spacing="2">UNA MISMA IDENTIDAD EN WEB, ANDROID Y WINDOWS</text>
      <image href="${asset}" x="96" y="697" width="120" height="120"/>
      <text x="244" y="745" fill="#f6f6ff" font-size="38" font-weight="650" letter-spacing="-1">Prisma PDF</text>
      <text x="245" y="780" fill="#b7bdd8" font-size="16">Tu espacio para los documentos.</text>
      <line x1="658" y1="701" x2="658" y2="815" stroke="#454c6a"/>
      <image href="${asset}" x="718" y="745" width="32" height="32"/>
      <image href="${asset}" x="795" y="737" width="48" height="48"/>
      <image href="${asset}" x="888" y="729" width="64" height="64"/>
      <image href="${asset}" x="997" y="713" width="96" height="96"/>
      <image href="${asset}" x="1138" y="697" width="120" height="120"/>
    </g>
  </svg>`;
  mkdirSync(dirname(resolve(destination)), { recursive: true });
  await sharp(Buffer.from(sheet)).png().toFile(destination);
  console.log(`Vista de identidad exportada: ${destination}`);
}
