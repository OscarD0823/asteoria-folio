import { defaultLayout, type FlowDocument, type RichNode } from "./flow";
import { displayValue, parseAddress, type SheetsBook } from "./sheets-core";
import { fontFamilies } from "./fonts";
export function sheetFlow(
  book: SheetsBook,
  name: string,
  selection?: {
    start: { row: number; col: number };
    end: { row: number; col: number };
  },
): FlowDocument {
  const sheet = book.sheet(name),
    a = selection?.start ?? { row: 0, col: 0 },
    b = selection?.end ?? {
      row: Math.max(0, sheet.rowCount - 1),
      col: Math.max(0, sheet.columnCount - 1),
    };
  const firstRow = Math.min(a.row, b.row),
    lastRow = Math.max(a.row, b.row),
    firstCol = Math.min(a.col, b.col),
    lastCol = Math.max(a.col, b.col);
  if (lastCol - firstCol >= 12)
    throw new Error(
      "Selecciona hasta 12 columnas para obtener una tabla legible en Word o PDF.",
    );
  if (lastRow - firstRow >= 2000)
    throw new Error(
      "Selecciona hasta 2.000 filas para exportar a Word o PDF. XLSX conserva el libro completo.",
    );
  const rows: RichNode[] = [];
  const merges = sheet.model.merges.map((range) =>
    range.split(":").map(parseAddress),
  );
  for (let r = firstRow; r <= lastRow; r++) {
    const cells: RichNode[] = [];
    for (let c = firstCol; c <= lastCol; c++) {
      const cell = sheet.getCell(r + 1, c + 1),
        font =
          fontFamilies.find((f) => f.label === cell.font?.name)?.value ??
          (cell.font?.name === "Times New Roman"
            ? "PrismaSerif"
            : cell.font?.name === "Calibri"
              ? "Carlito"
              : "PrismaSans");
      const master = cell.isMerged ? parseAddress(cell.master.address) : null;
      if (
        master &&
        master.row >= firstRow &&
        master.col >= firstCol &&
        (master.row !== r || master.col !== c)
      )
        continue;
      const merged = merges.find(
          ([start]) => start?.row === r && start.col === c,
        ),
        colSpan = merged?.[1] ? Math.min(lastCol, merged[1].col) - c + 1 : 1,
        rowSpan = merged?.[1] ? Math.min(lastRow, merged[1].row) - r + 1 : 1;
      cells.push({
        type: "tableCell",
        attrs: {
          colspan: colSpan,
          rowspan: rowSpan,
          colwidth: Array.from({ length: colSpan }, (_, offset) =>
            Math.max(
              64,
              (sheet.getColumn(c + offset + 1).width ?? 16) * 7 + 12,
            ),
          ),
        },
        content: [
          {
            type: "paragraph",
            attrs: {
              fontFamily: font,
              fontSize: cell.font?.size ?? 11,
              textAlign:
                cell.alignment?.horizontal ??
                (typeof book.value(name, r, c) === "number" ? "right" : "left"),
              spaceAfter: 4,
              lineHeight: 1.1,
            },
            content: [
              {
                type: "text",
                text: displayValue(book.value(name, r, c), cell.numFmt) || " ",
                marks: [
                  ...(cell.font?.bold ? [{ type: "bold" }] : []),
                  ...(cell.font?.italic ? [{ type: "italic" }] : []),
                ],
              },
            ],
          },
        ],
      });
    }
    rows.push({ type: "tableRow", content: cells });
  }
  return {
    layout: {
      ...defaultLayout(),
      orientation: lastCol - firstCol > 5 ? "landscape" : "portrait",
      numbering: true,
    },
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { paragraphStyle: "title", fontSize: 18, spaceAfter: 12 },
          content: [{ type: "text", text: name, marks: [{ type: "bold" }] }],
        },
        { type: "table", attrs: { id: crypto.randomUUID() }, content: rows },
      ],
    },
    academicStyle: "free",
  };
}
