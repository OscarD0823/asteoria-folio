import ExcelJS from "exceljs";
import {
  HyperFormula,
  DetailedCellError,
  AlwaysSparse,
  type RawCellContent,
} from "hyperformula";
import esES from "hyperformula/i18n/languages/esES";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

export const sheetLimits = {
  fileBytes: 40 * 1024 * 1024,
  cells: 150000,
  rows: 20000,
  columns: 500,
  area: 600000,
};
export const columnName = (column: number) => {
  let n = column + 1,
    s = "";
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
export const cellAddress = (row: number, column: number) =>
  columnName(column) + (row + 1);
export function parseAddress(address: string) {
  const m = address.trim().match(/^\$?([A-Z]{1,3})\$?([1-9]\d*)$/i);
  if (!m) return null;
  let col = 0;
  for (const c of m[1].toUpperCase()) col = col * 26 + c.charCodeAt(0) - 64;
  const row = Number(m[2]) - 1;
  return row < sheetLimits.rows && col <= sheetLimits.columns
    ? { row, col: col - 1 }
    : null;
}
const translated = new Map(
  Object.entries(esES.functions)
    .filter(([, v]) => v)
    .map(([k, v]) => [String(v).toUpperCase(), k]),
);
export function canonicalFormula(input: string) {
  // Translate only tokens outside strings and quoted worksheet names.
  const parts = input.split(/("(?:[^"]|"")*"|'(?:[^']|'')*')/g);
  const spanish = parts.some(
    (p, i) =>
      i % 2 === 0 &&
      (/;/.test(p) ||
        (/[A-ZÁÉÍÓÚÑ_.]+\s*\(/i.test(p) &&
          [...p.matchAll(/([A-ZÁÉÍÓÚÑ_.]+)\s*\(/gi)].some(
            (m) =>
              translated.has(m[1].toUpperCase()) &&
              translated.get(m[1].toUpperCase()) !== m[1].toUpperCase(),
          ))),
  );
  return parts
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(
              /([A-ZÁÉÍÓÚÑ_.]+)(\s*\()/gi,
              (_, name, open) =>
                (translated.get(name.toUpperCase()) ?? name.toUpperCase()) +
                open,
            )
            .replace(
              spanish && part.includes(";") ? /(\d),(?=\d)/g : /$^/g,
              "$1.",
            )
            .replace(/;/g, ","),
    )
    .join("");
}
function raw(cell: ExcelJS.Cell): RawCellContent {
  if (cell.isMerged && cell.master.address !== cell.address) return null;
  if (cell.type === ExcelJS.ValueType.Formula) return "=" + cell.formula;
  const v = cell.value;
  if (v instanceof Date)
    return (v.getTime() - Date.UTC(1899, 11, 30)) / 86400000;
  if (typeof v === "object" && v) {
    if ("richText" in v) return "'" + v.richText.map((r) => r.text).join("");
    if ("text" in v) return "'" + v.text;
    if ("error" in v) return v.error;
  }
  if (typeof v === "string") return "'" + v;
  return typeof v === "number" || typeof v === "boolean" ? v : null;
}
// Some valid OOXML producers qualify spreadsheet elements with a namespace
// prefix. ExcelJS expects unprefixed elements in these parts. Normalize a
// working copy; the user's original bytes remain untouched.
export function normalizedSpreadsheetParts(zip: Record<string, Uint8Array>) {
  let changed = false;
  for (const path of Object.keys(zip)) {
    if (!path.endsWith(".xml") && !path.endsWith(".rels")) continue;
    if (!path.startsWith("xl/") && !path.startsWith("_rels/")) continue;
    let xml = strFromU8(zip[path]);
    const prefixes = [
      ...xml.matchAll(
        /xmlns:([A-Za-z_][\w.-]*)=["'](http:\/\/schemas\.openxmlformats\.org\/(?:spreadsheetml\/2006\/main|package\/2006\/relationships))["']/g,
      ),
    ];
    if (!prefixes.length) continue;
    for (const [, prefix, namespace] of prefixes) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      xml = xml
        .split(/(<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->)/g)
        .map((part, i) =>
          i % 2
            ? part
            : part
                .replace(new RegExp("(<\\/?)(?:" + escaped + "):", "g"), "$1")
                .replace(
                  new RegExp("xmlns:" + escaped + "=[\"'][^\"']+[\"']", "g"),
                  'xmlns="' + namespace + '"',
                ),
        )
        .join("");
    }
    zip[path] = strToU8(xml);
    changed = true;
  }
  return changed ? zipSync(zip, { level: 0 }) : null;
}
export class SheetsBook {
  workbook: ExcelJS.Workbook;
  engine!: HyperFormula;
  warnings: string[] = [];
  original: Uint8Array | null = null;
  private batching = false;
  constructor(workbook = new ExcelJS.Workbook()) {
    this.workbook = workbook;
    if (!workbook.worksheets.length) workbook.addWorksheet("Hoja1");
    this.rebuild();
  }
  rebuild() {
    const sheets: Record<string, RawCellContent[][]> = {};
    let total = 0,
      area = 0;
    for (const sheet of this.workbook.worksheets) {
      if (
        sheet.rowCount > sheetLimits.rows ||
        sheet.columnCount > sheetLimits.columns
      )
        throw new Error(
          "Este libro supera el límite de 20.000 filas o 500 columnas por hoja.",
        );
      area += sheet.rowCount * sheet.columnCount;
      if (area > sheetLimits.area)
        throw new Error(
          "El área del libro es demasiado grande para esta primera versión. El archivo original se conserva.",
        );
      const data: RawCellContent[][] = [];
      sheet.eachRow((row, r) => {
        data[r - 1] = [];
        row.eachCell((cell, c) => {
          total++;
          data[r - 1][c - 1] = raw(cell);
        });
      });
      if (total > sheetLimits.cells)
        throw new Error(
          "Este libro supera las 150.000 celdas de esta versión.",
        );
      for (let r = 0; r < data.length; r++) {
        data[r] ??= [];
        for (let c = 0; c < data[r].length; c++) data[r][c] ??= null;
      }
      sheets[sheet.name] = data;
    }
    const next = HyperFormula.buildFromSheets(sheets, {
      licenseKey: "gpl-v3",
      language: "enGB",
      maxRows: sheetLimits.rows,
      maxColumns: sheetLimits.columns,
      chooseAddressMappingPolicy: new AlwaysSparse(),
      dateFormats: ["DD/MM/YYYY", "YYYY-MM-DD"],
      nullYear: 30,
    });
    this.engine?.destroy();
    this.engine = next;
  }
  static async open(bytes: Uint8Array) {
    if (bytes.length > sheetLimits.fileBytes)
      throw new Error("El límite de apertura es de 40 MB.");
    let expanded = 0;
    const zip = unzipSync(bytes, {
      filter(entry) {
        expanded += entry.originalSize;
        if (expanded > 180 * 1024 * 1024)
          throw new Error(
            "El XLSX descomprimido supera el límite de seguridad.",
          );
        return true;
      },
    });
    if (!zip["xl/workbook.xml"])
      throw new Error("Selecciona un archivo XLSX válido.");

    const wb = new ExcelJS.Workbook();
    const normalized = normalizedSpreadsheetParts(zip);
    await wb.xlsx.load(
      (normalized ?? new Uint8Array(bytes)) as unknown as ExcelJS.Buffer,
    );
    const book = new SheetsBook(wb);
    book.original = new Uint8Array(bytes);
    if(zip["xl/vbaProject.bin"])book.warnings.push("Este XLSM contiene VBA inactivo. Descarga el original para conservar las macros. Exportar una copia XLSX conserva las celdas compatibles y elimina VBA.");
    const paths = Object.keys(zip);
    const unsupported: [RegExp, string][] = [
      [/xl\/charts\//, "Gráficos nativos de Excel"],
      [/xl\/pivot/, "Tablas dinámicas"],
      [/xl\/externalLinks\//, "Vínculos con otros libros"],
      [/xl\/slicer/, "Segmentaciones"],
      [/xl\/embeddings\//, "Objetos incrustados"],
      [/xl\/threadedComments\//, "Comentarios en conversaciones"],
      [/xl\/connections\.xml/, "Conexiones y consultas externas"],
    ];
    for (const [pattern, label] of unsupported)
      if (paths.some((p) => pattern.test(p)))
        book.warnings.push(
          label +
            ": todavía no se conservan al exportar una copia. Puedes descargar el original intacto.",
        );
    const worksheetXml = paths
      .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
      .map((p) => strFromU8(zip[p]))
      .join("");
    if (/<(?:\w+:)?sheetProtection\b/.test(worksheetXml))
      throw new Error(
        "El libro contiene hojas protegidas. Retira la protección en una copia desde Excel para editarla en Prisma.",
      );
    if (/<(?:\w+:)?f[^>]*(?:\bt="array"|\bref=)/.test(worksheetXml))
      book.warnings.push(
        "Fórmulas matriciales: revisa sus resultados antes de exportar.",
      );
    return book;
  }
  sheet(name: string) {
    const s = this.workbook.getWorksheet(name);
    if (!s) throw new Error("No se encontró la hoja.");
    return s;
  }
  value(name: string, row: number, col: number) {
    const id = this.engine.getSheetId(name)!;
    const v = this.engine.getCellValue({ sheet: id, row, col });
    return v instanceof DetailedCellError ? v.value : v;
  }
  input(name: string, row: number, col: number) {
    const cell = this.sheet(name).findCell(row + 1, col + 1);
    if (!cell) return "";
    if (cell.type === ExcelJS.ValueType.Formula) return "=" + cell.formula;
    const value = cell.value;
    return value instanceof Date ? value.toISOString().slice(0, 10) : cell.text;
  }
  set(name: string, row: number, col: number, input: string) {
    if (!this.batching) this.validatePositions(name, [{ row, col }]);
    if (
      row < 0 ||
      col < 0 ||
      row >= sheetLimits.rows ||
      col >= sheetLimits.columns
    )
      throw new Error("La celda queda fuera del límite de esta versión.");
    const cell = this.sheet(name).getCell(row + 1, col + 1);
    if (cell.isMerged && cell.master.address !== cell.address)
      throw new Error("Edita la primera celda de este bloque combinado.");
    const text = input.trim();
    let v: ExcelJS.CellValue = null;
    if (input.startsWith("'")) v = input.slice(1);
    else if (text.startsWith("="))
      v = { formula: canonicalFormula(text).slice(1) };
    else if (text && /^-?\d+(?:[.,]\d+)?%$/.test(text)) {
      v = Number(text.slice(0, -1).replace(",", ".")) / 100;
      cell.numFmt = "0.0%";
    } else if (text && /^-?(?:\d+\.?\d*|\d*,\d+)(?:e[+-]?\d+)?$/i.test(text))
      v = Number(text.replace(",", "."));
    else if (/^(TRUE|FALSE|VERDADERO|FALSO)$/i.test(text))
      v = /^(TRUE|VERDADERO)$/i.test(text);
    else if (input) v = input;
    cell.value = v;
    this.engine.setCellContents(
      { sheet: this.engine.getSheetId(name)!, row, col },
      [[raw(cell)]],
    );
  }
  format(
    name: string,
    cells: { row: number; col: number }[],
    change: Partial<ExcelJS.Style>,
  ) {
    this.validatePositions(name, cells, true);
    for (const pos of cells) {
      const c = this.sheet(name).getCell(pos.row + 1, pos.col + 1);
      c.style = {
        ...c.style,
        ...change,
        font: change.font ? { ...c.font, ...change.font } : c.font,
        alignment: change.alignment
          ? { ...c.alignment, ...change.alignment }
          : c.alignment,
      };
      if (change.alignment?.wrapText)
        this.sheet(name).getRow(pos.row + 1).height = Math.max(
          45,
          this.sheet(name).getRow(pos.row + 1).height ?? 22.5,
        );
    }
  }
  validatePositions(
    name: string,
    positions: { row: number; col: number }[],
    allowMerged = false,
  ) {
    const sheet = this.sheet(name);
    let rowCount = sheet.rowCount,
      columnCount = sheet.columnCount,
      additions = 0;
    for (const p of positions) {
      if (
        p.row < 0 ||
        p.col < 0 ||
        p.row >= sheetLimits.rows ||
        p.col >= sheetLimits.columns
      )
        throw new Error("La celda queda fuera del límite de esta versión.");
      rowCount = Math.max(rowCount, p.row + 1);
      columnCount = Math.max(columnCount, p.col + 1);
      const cell = sheet.findCell(p.row + 1, p.col + 1);
      if (
        !allowMerged &&
        cell?.isMerged &&
        cell.master.address !== cell.address
      )
        throw new Error(
          "Edita la primera celda del bloque combinado o separa las celdas antes de pegar.",
        );
      if (cell?.value == null) additions++;
    }
    let area = rowCount * columnCount,
      total = additions;
    for (const s of this.workbook.worksheets) {
      if (s !== sheet) area += s.rowCount * s.columnCount;
      s.eachRow((row) => {
        total += row.actualCellCount;
      });
    }
    if (area > sheetLimits.area || total > sheetLimits.cells)
      throw new Error(
        "El bloque supera el tamaño admitido en esta versión. Selecciona un rango más pequeño.",
      );
  }
  setBlock(
    name: string,
    start: { row: number; col: number },
    rows: string[][],
  ) {
    const positions = rows.flatMap((row, r) =>
      row.map((_, c) => ({ row: start.row + r, col: start.col + c })),
    );
    this.validatePositions(name, positions);
    const model = structuredClone(this.workbook.model);
    try {
      this.batching = true;
      this.engine.batch(() =>
        rows.forEach((row, r) =>
          row.forEach((v, c) =>
            this.set(name, start.row + r, start.col + c, v),
          ),
        ),
      );
    } catch (error) {
      this.restore(model);
      throw error;
    } finally {
      this.batching = false;
    }
  }
  restore(model: ExcelJS.WorkbookModel) {
    const copy = structuredClone(model);
    // ExcelJS's model setter consumes mergeCells, whereas its getter emits
    // merges. Supply both so undo does not silently remove merged ranges.
    for (const sheet of [
      ...copy.sheets,
      ...(copy.worksheets as unknown as ExcelJS.WorksheetModel[]),
    ])
      Object.assign(sheet, { mergeCells: sheet.merges });
    this.workbook.model = copy;
    this.rebuild();
  }
  async bytes() {
    for (const sheet of this.workbook.worksheets)
      sheet.eachRow((row, r) =>
        row.eachCell((cell, c) => {
          if (cell.type === ExcelJS.ValueType.Formula) {
            const result = this.value(sheet.name, r - 1, c - 1);
            cell.value = {
              formula: cell.formula,
              result:
                typeof result === "string" && result.startsWith("#")
                  ? { error: result as ExcelJS.CellErrorValue["error"] }
                  : (result ?? undefined),
            };
          }
        }),
      );
    this.workbook.creator ||= "Prisma Sheets";
    this.workbook.modified = new Date();
    this.workbook.calcProperties.fullCalcOnLoad = true;
    return new Uint8Array(await this.workbook.xlsx.writeBuffer());
  }
  addSheet() {
    let i = 1;
    while (this.workbook.getWorksheet("Hoja" + i)) i++;
    const sheet = this.workbook.addWorksheet("Hoja" + i);
    this.rebuild();
    return sheet.name;
  }
  destroy() {
    this.engine.destroy();
  }
}
export function displayValue(value: unknown, format: string) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "VERDADERO" : "FALSO";
  if (typeof value !== "number") return String(value);
  if (/(?:^|[^a-z])(?:yy|dd)/i.test(format)) {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC" }).format(d);
  }
  if (format === "General" || !format) return String(value);
  const decimals = format.match(/\.(0+)/)?.[1].length ?? 0;
  const percent = format.includes("%"),
    currency = /\$|COP|USD/.test(format);
  const result = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: Math.min(8, decimals),
    maximumFractionDigits: Math.min(8, decimals),
    useGrouping: format.includes(","),
  }).format(percent ? value * 100 : value);
  return (currency ? "$ " : "") + result + (percent ? " %" : "");
}
export function parseDelimited(text: string, separator = "\t") {
  const rows: string[][] = [[]];
  let cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!cell || quoted) quoted = !quoted;
      else cell += ch;
    } else if (!quoted && ch === separator) {
      rows.at(-1)!.push(cell);
      cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      rows.at(-1)!.push(cell);
      rows.push([]);
      cell = "";
    } else cell += ch;
  }
  rows.at(-1)!.push(cell);
  if (rows.length > 1 && rows.at(-1)!.length === 1 && rows.at(-1)![0] === "")
    rows.pop();
  return rows;
}
export const encodeDelimited = (rows: unknown[][], separator = "\t") =>
  rows
    .map((row) =>
      row
        .map((value) => {
          const v = String(value ?? "");
          return /["\n\r\t,;]/.test(v)
            ? '"' + v.replaceAll('"', '""') + '"'
            : v;
        })
        .join(separator),
    )
    .join("\r\n");
