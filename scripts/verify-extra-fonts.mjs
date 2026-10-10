// Asset QA: hashes, license manifest, Spanish glyphs and all real PDF styles.
// This writes only synthetic proof artifacts under the ignored qa directory.
import "regenerator-runtime/runtime.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFRawStream,
  PDFName,
  PDFDict,
  decodePDFRawStream,
} from "pdf-lib";

const root = new URL("../", import.meta.url);
const fontsRoot = new URL("public/fonts/", root);
const catalog = JSON.parse(
  await readFile(new URL("EXTRA-catalog.json", fontsRoot), "utf8"),
);
const original = JSON.parse(
  await readFile(new URL("catalog.json", fontsRoot), "utf8"),
);
const css = await readFile(new URL("EXTRA.css", fontsRoot), "utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sample =
  "Investigación científica: Español, áéíóúüñ ÁÉÍÓÚÜÑ ¿¡ 0123456789";
const ascii =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789";
const extraKeys = new Set();
const originalKeys = new Set(original.map((font) => font.value));
const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const labelFont = await doc.embedFont(StandardFonts.Helvetica);
const monoFont = await doc.embedFont(StandardFonts.Courier);
let page;
let y;
let totalBytes = 0;
let totalFiles = 0;
const results = [];

for (const [index, family] of catalog.entries()) {
  assert(!extraKeys.has(family.value), "Duplicate family: " + family.value);
  assert(
    !originalKeys.has(family.value),
    "Family overlaps the original catalog: " + family.value,
  );
  extraKeys.add(family.value);
  assert(family.styles.Regular, "Missing regular style: " + family.value);
  const base = new URL(family.value + "/", fontsRoot);
  const source = JSON.parse(
    await readFile(new URL("SOURCE.json", base), "utf8"),
  );
  assert(
    ["OFL-1.1", "Apache-2.0", "GUST Font License"].includes(source.license),
  );
  assert.equal(
    source.licenseSha256,
    hash(await readFile(new URL("LICENSE.txt", base))),
  );
  if (index % 2 === 0) {
    page = doc.addPage([595.28, 841.89]);
    y = 790;
    page.drawText("Prisma PDF - additional local font proof", {
      x: 42,
      y,
      size: 15,
      font: labelFont,
    });
    y -= 32;
  }
  page.drawText(family.label, {
    x: 42,
    y,
    size: 14,
    font: labelFont,
    color: rgb(0.24, 0.21, 0.58),
  });
  y -= 25;
  const familyResult = { family: family.label, styles: [] };
  for (const [style, filename] of Object.entries(family.styles)) {
    const bytes = await readFile(new URL(filename, fontsRoot));
    const manifest = source.outputs.find((entry) => entry.style === style);
    assert(manifest, "Missing manifest: " + filename);
    assert.equal(hash(bytes), manifest.sha256, "Hash mismatch: " + filename);
    assert.equal(bytes.length, manifest.bytes);
    assert(css.includes("./" + filename), "CSS omits file: " + filename);
    const parsed = fontkit.create(bytes);
    assert(parsed.unitsPerEm > 0);
    for (const character of sample + ascii) {
      assert(
        parsed.hasGlyphForCodePoint(character.codePointAt(0)),
        family.value + "/" + style + " missing " + character,
      );
    }
    const run = parsed.layout(sample);
    assert(run.glyphs.length > 0);
    assert(
      run.glyphs.every((glyph) => glyph.id > 0),
      "Missing glyph in shaped text: " + filename,
    );
    assert(
      run.positions.every((position) => Number.isFinite(position.xAdvance)),
      "Invalid advance: " + filename,
    );
    const embedded = await doc.embedFont(bytes, {
      subset: false,
      features: { liga: false, clig: false },
    });
    assert(embedded.widthOfTextAtSize(sample, 11) > 0);
    page.drawText(style, { x: 42, y, size: 8, font: monoFont });
    y -= 15;
    page.drawText(sample, { x: 42, y, size: 11, font: embedded });
    y -= 20;
    page.drawText(ascii, { x: 42, y, size: 10, font: embedded });
    y -= 25;
    totalBytes += bytes.length;
    totalFiles++;
    familyResult.styles.push({
      style,
      bytes: bytes.length,
      glyphs: parsed.numGlyphs,
      postscriptName: parsed.postscriptName,
    });
  }
  results.push(familyResult);
  y -= 30;
}
assert.equal(catalog.length, 50);
await mkdir(new URL("qa/", root), { recursive: true });
await doc.flush();
const descriptors = new Set();
for (const [, object] of doc.context.enumerateIndirectObjects())
  if (
    object instanceof PDFDict &&
    object.get(PDFName.of("Type")) === PDFName.of("FontDescriptor")
  ) {
    const ref =
      object.get(PDFName.of("FontFile2")) ??
      object.get(PDFName.of("FontFile3"));
    if (!ref) continue;
    const stream = doc.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    const bytes = decodePDFRawStream(stream).decode();
    if (
      bytes[0] !== 79 ||
      bytes[1] !== 84 ||
      bytes[2] !== 84 ||
      bytes[3] !== 79
    )
      continue;
    stream.dict.set(PDFName.of("Subtype"), PDFName.of("OpenType"));
    object.delete(PDFName.of("FontFile2"));
    object.set(PDFName.of("FontFile3"), ref);
    descriptors.add(object);
  }
for (const [, object] of doc.context.enumerateIndirectObjects())
  if (
    object instanceof PDFDict &&
    object.get(PDFName.of("Subtype")) === PDFName.of("CIDFontType2")
  ) {
    const ref = object.get(PDFName.of("FontDescriptor"));
    if (ref && descriptors.has(doc.context.lookup(ref))) {
      object.set(PDFName.of("Subtype"), PDFName.of("CIDFontType0"));
      object.delete(PDFName.of("CIDToGIDMap"));
    }
  }
const proof = await doc.save();
await writeFile(new URL("qa/extra-fonts-proof.pdf", root), proof);
const summary = {
  families: catalog.length,
  fontFiles: totalFiles,
  fontBytes: totalBytes,
  MiB: totalBytes / 1024 / 1024,
  proofPages: doc.getPageCount(),
  proofBytes: proof.length,
  results,
};
await writeFile(
  new URL("qa/extra-fonts-qa.json", root),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify({ ...summary, results: undefined }));
