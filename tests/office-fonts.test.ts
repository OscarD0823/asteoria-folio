import test from "node:test";
import assert from "node:assert/strict";
import { fontFamilies } from "../src/fonts";
import { officeFontCss, resolveOfficeFont } from "../src/office-fonts";
import { SheetsBook } from "../src/sheets-core";
import { sheetFlow } from "../src/sheets-document";
import { buildFlowPdf, defaultLayout } from "../src/flow";
import { setFontLoader } from "../src/fonts";
import { readFile } from "node:fs/promises";
import { nativeOperation, type Inspection } from "../src/native-core";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
test("every distributed font has a shared Office name mapping for Sheets previews and exports", async () => {
  for (const font of fontFamilies.filter(font => font.file || font.styles)) {
    assert.equal(resolveOfficeFont(font.label)?.value, font.value);
    assert(officeFontCss(font.label).includes(font.css.split(",")[0]));
  }
  assert.equal(resolveOfficeFont(" CALIBRI ")?.value, "Carlito");
  assert.equal(resolveOfficeFont("Arial")?.value, "Arimo");
  assert.equal(resolveOfficeFont("Cambria")?.value, "Caladea");
  assert.equal(resolveOfficeFont("Times New Roman")?.value, "PrismaSerif");
  const book = new SheetsBook();
  book.set("Hoja1", 0, 0, "Prueba");
  book.sheet("Hoja1").getCell("A1").font = { name: "PT Sans", size: 13 };
  const flow = sheetFlow(book, "Hoja1");
  assert(JSON.stringify(flow).includes('"fontFamily":"PTSans"'));
  const reopened = await SheetsBook.open(await book.bytes());
  assert.equal(reopened.sheet("Hoja1").getCell("A1").font.name, "PT Sans");
  book.destroy(); reopened.destroy();
});
test("PDF table paragraphs retain their actual typeface, size and independent alignment", async () => {
  setFontLoader(async file => new Uint8Array(await readFile("public/fonts/" + file)));
  const bytes = await buildFlowPdf({ layout: defaultLayout(), content: {
    type: "doc", content: [{ type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [
      { type: "paragraph", attrs: { fontFamily: "PTSans", fontSize: 13, textAlign: "right" }, content: [{ type: "text", text: "Derecha" }] },
      { type: "paragraph", attrs: { fontFamily: "Carlito", fontSize: 20, textAlign: "left" }, content: [{ type: "text", text: "Izquierda" }] },
    ] }] }] }],
  } });
  const inspected = await nativeOperation({ action: "inspect", bytes, index: 0 }) as Inspection;
  const right = inspected.objects.find(object => object.text === "Derecha")!, left = inspected.objects.find(object => object.text === "Izquierda")!;
  const pdf = await PDFDocument.load(bytes), fontDictionary = pdf.getPage(0).node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
  const names = fontDictionary.entries().map(([, ref]) => pdf.context.lookup(ref, PDFDict).get(PDFName.of("BaseFont"))!.toString());
  assert(names.some(name => name.includes("PTSans")), names.join(", "));
  assert(names.some(name => name.includes("Carlito")), names.join(", "));
  assert.equal(Math.round(right.size), 13);
  assert.equal(Math.round(left.size), 20);
  assert(right.x > left.x + 200);
});
