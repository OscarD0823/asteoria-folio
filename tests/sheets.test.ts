import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  SheetsBook,
  canonicalFormula,
  encodeDelimited,
  parseDelimited,
} from "../src/sheets-core";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import "fake-indexeddb/auto";
import { saveBook, loadBook } from "../src/sheets-storage";
test("Literal spreadsheet text never becomes an executable formula or loses leading zeroes", () => {
  const b = new SheetsBook();
  b.setBlock("Hoja1", { row: 0, col: 0 }, [["'=1+1", "'007", "''literal"]]);
  assert.equal(b.value("Hoja1", 0, 0), "=1+1");
  assert.equal(b.value("Hoja1", 0, 1), "007");
  assert.equal(b.value("Hoja1", 0, 2), "'literal");
  b.destroy();
});
test("XLSX accepts valid namespace-prefixed worksheet elements without altering the original", async () => {
  const b = new SheetsBook();
  b.set("Hoja1", 0, 0, "7");
  const zip = unzipSync(await b.bytes());
  for (const path of [
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
    "xl/styles.xml",
  ]) {
    const xml = strFromU8(zip[path])
      .replace(
        'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
        'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
      )
      .replace(/<(\/?)([A-Za-z][\w]*)(?=[\s/>])/g, "<$1x:$2");
    zip[path] = strToU8(xml);
  }
  const original = zipSync(zip),
    r = await SheetsBook.open(original);
  assert.equal(r.value("Hoja1", 0, 0), 7);
  assert.deepEqual(r.original, original);
  b.destroy();
  r.destroy();
});
test("XLSX recalculates Spanish formulas and cross-sheet references, then preserves English formulas and cached results for Excel", async () => {
  const book = new SheetsBook();
  book.workbook.addWorksheet("Resumen");
  book.rebuild();
  book.setBlock("Hoja1", { row: 0, col: 0 }, [
    ["Concepto", "Cantidad", "Precio", "Total"],
    ["Cuadernos", "12", "8500", "=B2*C2"],
    ["Impresiones", "80", "300", "=B3*C3"],
    ["Materiales", "3", "25000", "=B4*C4"],
    ["Total", "", "", "=SUMA(D2:D4)"],
  ]);
  book.set("Resumen", 0, 0, "=SI(Hoja1!D5>200000;Hoja1!D5;0)");
  assert.equal(book.value("Resumen", 0, 0), 201000);
  book.set("Hoja1", 1, 1, "15");
  assert.equal(book.value("Resumen", 0, 0), 226500);
  const bytes = await book.bytes(),
    roundtrip = await SheetsBook.open(bytes);
  assert.equal(roundtrip.value("Resumen", 0, 0), 226500);
  assert.equal(roundtrip.sheet("Hoja1").getCell("D5").formula, "SUM(D2:D4)");
  assert.equal(roundtrip.sheet("Hoja1").getCell("D5").result, 226500);
  assert.deepEqual(roundtrip.original, bytes);
  book.destroy();
  roundtrip.destroy();
});
test("XLSX retains cell styles, merged ranges, notes, table metadata and dimensions", async () => {
  const wb = new ExcelJS.Workbook(),
    s = wb.addWorksheet("Datos");
  s.mergeCells("A1:C1");
  s.getCell("A1").value = "Informe";
  s.getCell("A1").font = { name: "Calibri", bold: true, size: 18 };
  s.getCell("A1").note = "Revisar título";
  s.addTable({
    name: "Productos",
    ref: "A3",
    headerRow: true,
    columns: [{ name: "Concepto" }, { name: "Cantidad" }, { name: "Precio" }],
    rows: [["Libro", 2, 100]],
    style: { theme: "TableStyleMedium2" },
  });
  s.getColumn(1).width = 28;
  s.getRow(1).height = 30;
  s.getCell("C4").numFmt = '"$"#,##0';
  const b = new SheetsBook(wb),
    r = await SheetsBook.open(await b.bytes());
  const checkpoint = structuredClone(r.workbook.model);
  r.set("Datos", 3, 1, "10");
  r.restore(checkpoint);
  assert.deepEqual(r.sheet("Datos").model.merges, ["A1:C1"]);
  assert.equal(r.sheet("Datos").getCell("A1").font.bold, true);
  assert.equal(r.sheet("Datos").getCell("A1").note, "Revisar título");
  assert.equal(r.sheet("Datos").getColumn(1).width, 28);
  assert.match(
    strFromU8(unzipSync(await r.bytes())["xl/tables/table1.xml"]),
    /name="Productos"/,
  );
  assert.equal(r.sheet("Datos").getCell("C4").numFmt, '"$"#,##0');
  b.destroy();
  r.destroy();
});
test("Paste into merged cells and oversized ranges fails before mutating the workbook", () => {
  const b = new SheetsBook();
  b.sheet("Hoja1").mergeCells("B1:C1");
  b.rebuild();
  b.set("Hoja1", 0, 0, "Original");
  assert.throws(
    () =>
      b.setBlock("Hoja1", { row: 0, col: 0 }, [
        ["Cambiado", "Master", "Esclava"],
      ]),
    /combinado/,
  );
  assert.equal(b.input("Hoja1", 0, 0), "Original");
  assert.throws(() => b.set("Hoja1", 19999, 499, "x"), /tamaño/);
  b.destroy();
});
test("Formula translation preserves quoted strings and CSV preserves separators, quotes and newlines", () => {
  assert.equal(
    canonicalFormula("=SI(A1>1,5;\"SUMA(1;2)\";'Hoja 2'!B1)"),
    "=IF(A1>1.5,\"SUMA(1;2)\",'Hoja 2'!B1)",
  );
  const rows = [
    ["a;b", '"comillas"', "dos\nlíneas"],
    ["áéíóú", "ñ", ""],
  ];
  assert.deepEqual(parseDelimited(encodeDelimited(rows, ";"), ";"), rows);
});
test("Unsupported charts are reported while the exact original and local draft are retained", async () => {
  const b = new SheetsBook();
  b.set("Hoja1", 0, 0, "7");
  const zip = unzipSync(await b.bytes());
  zip["xl/charts/chart1.xml"] = strToU8("<chart/>");
  const original = zipSync(zip),
    r = await SheetsBook.open(original);
  assert.match(r.warnings.join(" "), /Gráficos/);
  await saveBook({
    bytes: await r.bytes(),
    name: "Prueba",
    warnings: r.warnings,
    original: r.original,
  });
  const restored = await loadBook();
  assert.deepEqual(restored?.original, original);
  assert.equal(restored?.name, "Prueba");
  assert.match(restored!.warnings.join(" "), /Gráficos/);
  b.destroy();
  r.destroy();
});
