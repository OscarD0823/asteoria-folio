import { useEffect, useRef, useState } from "react";
import type { WorkbookModel, Cell } from "exceljs";
import {
  ArrowLeft,
  ArrowUpDown,
  Bold,
  Check,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Grid2X2,
  Italic,
  LockKeyhole,
  Plus,
  Printer,
  Redo2,
  Save,
  Search,
  Sheet,
  ShieldCheck,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import {
  SheetsBook,
  cellAddress,
  columnName,
  displayValue,
  parseAddress,
  parseDelimited,
  encodeDelimited,
  sheetLimits,
} from "./sheets-core";
import { download } from "./download";
import { Updates } from "./Updates";
import { InstallApp } from "./InstallApp";
import { product } from "./product";
import { loadBook, saveBook } from "./sheets-storage";
import "./sheets.css";
type Pos = { row: number; col: number };
const equal = (a: Pos, b: Pos) => a.row === b.row && a.col === b.col;
const emptyCell = {
  font: {},
  alignment: {},
  numFmt: "General",
  fill: undefined,
  note: undefined,
  isMerged: false,
} as unknown as Cell;
export default function Sheets() {
  const [book, setBook] = useState<SheetsBook | null>(null),
    [name, setName] = useState("Mi libro"),
    [sheet, setSheet] = useState("Hoja1"),
    [tick, setTick] = useState(0),
    [anchor, setAnchor] = useState<Pos>({ row: 0, col: 0 }),
    [end, setEnd] = useState<Pos>({ row: 0, col: 0 }),
    [edit, setEdit] = useState<string | null>(null),
    [formula, setFormula] = useState(""),
    [tab, setTab] = useState("Inicio"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [recent, setRecent] = useState(false),
    [report, setReport] = useState(false),
    [exportMenu, setExportMenu] = useState(false),
    [search, setSearch] = useState(""),
    [scroll, setScroll] = useState({ top: 0, left: 0 }),
    [zoom, setZoom] = useState(100);
  const input = useRef<HTMLInputElement>(null),
    grid = useRef<HTMLDivElement>(null),
    editor = useRef<HTMLInputElement>(null),
    editRef = useRef<string | null>(null),
    dragging = useRef(false),
    history = useRef<WorkbookModel[]>([]),
    future = useRef<WorkbookModel[]>([]),
    checkpoint = useRef<Uint8Array | null>(null),
    queue = useRef(Promise.resolve()),
    bookRef = useRef(book),
    nameRef = useRef(name),
    saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);
  bookRef.current = book;
  editRef.current = edit;
  nameRef.current = name;
  const fail = (e: unknown) => {
    setMessage(e instanceof Error ? e.message : String(e));
    setBusy(false);
  };
  useEffect(() => {
    void loadBook()
      .then((v) => setRecent(!!v))
      .catch(() => {});
    const up = () => (dragging.current = false);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerup", up);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);
  const persist = () => {
    const expected = generation.current;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        const current = bookRef.current;
        if (!current || generation.current !== expected) return;
        const bytes = await current.bytes();
        if (generation.current !== expected || current !== bookRef.current)
          return;
        await saveBook({
          bytes,
          name: nameRef.current,
          warnings: current.warnings,
          original: current.original,
        });
        checkpoint.current = bytes;
        setSaved(true);
      })
      .catch((error) => {
        fail(error);
        throw error;
      });
    return queue.current;
  };
  const changed = () => {
    setTick((t) => t + 1);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist().catch(fail), 500);
  };
  const remember = () => {
    if (book) {
      history.current.push(structuredClone(book.workbook.model));
      if (history.current.length > 20) history.current.shift();
      future.current = [];
    }
  };
  const selection = (limit = 150000) => {
    const positions: Pos[] = [];
    for (
      let r = Math.min(anchor.row, end.row);
      r <= Math.max(anchor.row, end.row);
      r++
    )
      for (
        let c = Math.min(anchor.col, end.col);
        c <= Math.max(anchor.col, end.col);
        c++
      ) {
        if (positions.length >= limit && limit === 10000) return positions;
        if (positions.length >= limit)
          throw new Error("Selecciona menos de 150.000 celdas.");
        positions.push({ row: r, col: c });
      }
    return positions;
  };
  const enterBook = async (next: SheetsBook, title: string) => {
    generation.current++;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setBook(next);
    bookRef.current = next;
    nameRef.current = title;
    setName(title);
    setSheet(next.workbook.worksheets[0].name);
    setAnchor({ row: 0, col: 0 });
    setEnd({ row: 0, col: 0 });
    setEdit(null);
    setScroll({ top: 0, left: 0 });
    history.current = [];
    future.current = [];
    checkpoint.current = await next.bytes();
    setSaved(false);
    setMessage("");
    setRecent(true);
    void persist().catch(fail);
  };
  const newBook = async (example = false) => {
    try {
      const next = new SheetsBook();
      if (example) {
        const s = next.sheet("Hoja1");
        s.name = "Presupuesto";
        const rows = [
          ["Presupuesto de ejemplo"],
          ["Datos ficticios para explorar Prisma Sheets"],
          [],
          ["Concepto", "Cantidad", "Valor unitario", "Total"],
          ["Cuadernos", 12, 8500, "=B5*C5"],
          ["Impresiones", 80, 300, "=B6*C6"],
          ["Materiales", 3, 25000, "=B7*C7"],
          ["Total", "", "", "=SUM(D5:D7)"],
        ];
        rows.forEach((row, r) =>
          row.forEach((v, c) => {
            s.getCell(r + 1, c + 1).value =
              typeof v === "string" && v.startsWith("=")
                ? { formula: v.slice(1) }
                : v;
          }),
        );
        s.getColumn(1).width = 29;
        [2, 3, 4].forEach((c) => (s.getColumn(c).width = 20));
        s.getRow(1).font = {
          name: "Calibri",
          size: 17,
          bold: true,
          color: { argb: "FF1C5148" },
        };
        s.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
        s.getRow(4).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF207C69" },
        };
        s.getRow(8).font = { bold: true };
        s.mergeCells("A1:D1");
        s.mergeCells("A2:D2");
        for (let r = 5; r <= 8; r++)
          for (let c = 3; c <= 4; c++) s.getCell(r, c).numFmt = '"$"#,##0';
        next.rebuild();
      }
      await enterBook(next, example ? "Presupuesto de ejemplo" : "Mi libro");
    } catch (e) {
      fail(e);
    }
  };
  const open = async (file: File) => {
    try {
      setBusy(true);
      if (file.size > sheetLimits.fileBytes)
        throw new Error("El límite de apertura es de 40 MB.");
      let next: SheetsBook;
      if (/\.csv$/i.test(file.name)) {
        next = new SheetsBook();
        const text = await file.text(),
          line = text.split(/\r?\n/)[0];
        const separator = line.includes(";") ? ";" : ",";
        const rows = parseDelimited(text.replace(/^\uFEFF/, ""), separator);
        if (
          rows.length > sheetLimits.rows ||
          rows.some((r) => r.length > sheetLimits.columns) ||
          rows.reduce((n, r) => n + r.length, 0) > sheetLimits.cells
        )
          throw new Error("El CSV supera los límites de esta versión.");
        next.setBlock(
          "Hoja1",
          { row: 0, col: 0 },
          rows.map((row) => row.map((v) => (v.startsWith("=") ? "'" + v : v))),
        );
        next.original = null;
      } else
        next = await SheetsBook.open(new Uint8Array(await file.arrayBuffer()));
      await enterBook(next, file.name.replace(/\.(xlsx|csv)$/i, ""));
      if (next.warnings.length) setReport(true);
      setBusy(false);
    } catch (e) {
      fail(e);
    }
    if (input.current) input.current.value = "";
  };
  const resume = async () => {
    try {
      setBusy(true);
      const v = await loadBook();
      if (!v) throw new Error("No hay un libro guardado.");
      const next = await SheetsBook.open(v.bytes);
      next.warnings = v.warnings ?? [];
      next.original = v.original ?? null;
      await enterBook(next, v.name);
      setBusy(false);
    } catch (e) {
      fail(e);
    }
  };
  const selected = book?.sheet(sheet),
    active = selected?.findCell(anchor.row + 1, anchor.col + 1);
  useEffect(() => {
    if (book) setFormula(book.input(sheet, anchor.row, anchor.col));
  }, [book, sheet, anchor.row, anchor.col, tick]);
  useEffect(() => {
    if (edit !== null) editor.current?.focus();
  }, [edit !== null]);
  const commit = (value = edit, move?: Pos) => {
    if (!book || value === null) return;
    try {
      remember();
      book.set(sheet, anchor.row, anchor.col, value);
      editRef.current = null;
      setEdit(null);
      changed();
      if (move) {
        setAnchor(move);
        setEnd(move);
      }
      grid.current?.focus();
    } catch (e) {
      fail(e);
    }
  };
  const select = (pos: Pos, extend = false) => {
    if (edit !== null) commit();
    if (!extend) setAnchor(pos);
    setEnd(pos);
    setEdit(null);
    grid.current?.focus();
  };
  const go = (pos: Pos, extend = false) => {
    pos = {
      row: Math.max(0, Math.min(sheetLimits.rows - 1, pos.row)),
      col: Math.max(0, Math.min(sheetLimits.columns - 1, pos.col)),
    };
    select(pos, extend);
    requestAnimationFrame(() => {
      const g = grid.current;
      if (g) {
        let x = 44,
          y = 32;
        for (let c = 0; c < pos.col; c++) x += columnWidth(c);
        for (let r = 0; r < pos.row; r++) y += rowHeight(r);
        if (x < g.scrollLeft + 44) g.scrollLeft = Math.max(0, x - 44);
        if (x + columnWidth(pos.col) > g.scrollLeft + g.clientWidth)
          g.scrollLeft = x + columnWidth(pos.col) - g.clientWidth;
        if (y < g.scrollTop + 32) g.scrollTop = y - 32;
        if (y + rowHeight(pos.row) > g.scrollTop + g.clientHeight)
          g.scrollTop = y + rowHeight(pos.row) - g.clientHeight;
      }
    });
  };
  const writePaste = (text: string) => {
    if (!book) return;
    try {
      const rows = parseDelimited(text);
      if (
        anchor.row + rows.length > sheetLimits.rows ||
        rows.some((r) => anchor.col + r.length > sheetLimits.columns) ||
        rows.reduce((s, r) => s + r.length, 0) > sheetLimits.cells
      )
        throw new Error("El bloque supera los límites de esta versión.");
      remember();
      book.setBlock(sheet, anchor, rows);
      setEnd({
        row: anchor.row + rows.length - 1,
        col: anchor.col + Math.max(...rows.map((r) => r.length)) - 1,
      });
      changed();
    } catch (e) {
      fail(e);
    }
  };
  const copied = () => {
    if (!book) return "";
    const rows: unknown[][] = [];
    for (
      let r = Math.min(anchor.row, end.row);
      r <= Math.max(anchor.row, end.row);
      r++
    ) {
      const row = [];
      for (
        let c = Math.min(anchor.col, end.col);
        c <= Math.max(anchor.col, end.col);
        c++
      )
        row.push(book.input(sheet, r, c));
      rows.push(row);
    }
    return encodeDelimited(rows);
  };
  const clear = () => {
    if (!book) return;
    try {
      remember();
      book.engine.batch(() =>
        selection().forEach((p) => book.set(sheet, p.row, p.col, "")),
      );
      changed();
    } catch (e) {
      fail(e);
    }
  };
  const format = (change: Parameters<SheetsBook["format"]>[2]) => {
    if (!book) return;
    try {
      remember();
      book.format(sheet, selection(), change);
      changed();
    } catch (e) {
      fail(e);
    }
  };
  const undo = async (back = true) => {
    try {
      if (!book) return;
      const source = back ? history : future,
        target = back ? future : history,
        model = source.current.pop();
      if (!model) return;
      target.current.push(structuredClone(book.workbook.model));
      book.restore(model);
      if (!book.workbook.getWorksheet(sheet))
        setSheet(book.workbook.worksheets[0].name);
      changed();
    } catch (e) {
      fail(e);
    }
  };
  const exportFile = async (kind: string, simplified = false) => {
    if (!book) return;
    try {
      if (edit !== null) commit();
      if (kind === "xlsx" && book.warnings.length && !simplified) {
        setExportMenu(false);
        setReport(true);
        return;
      }
      setBusy(true);
      const title = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-") || "Mi libro";
      if (kind === "original") {
        if (book.original)
          await download(
            book.original,
            title + "-original.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
      } else if (kind === "csv") {
        const rows: unknown[][] = [];
        for (let r = 0; r < (selected?.rowCount ?? 0); r++) {
          const row = [];
          for (let c = 0; c < (selected?.columnCount ?? 0); c++) {
            const v = book.value(sheet, r, c);
            row.push(typeof v === "string" && /^[=+@\-]/.test(v) ? "'" + v : v);
          }
          rows.push(row);
        }
        await download(
          new TextEncoder().encode("\uFEFF" + encodeDelimited(rows, ";")),
          title + "-" + sheet + ".csv",
          "text/csv;charset=utf-8",
        );
      } else if (kind === "writer" || kind === "pdf" || kind === "print") {
        const { sheetFlow } = await import("./sheets-document");
        const flow = sheetFlow(
          book,
          sheet,
          equal(anchor, end) ? undefined : { start: anchor, end },
        );
        if (kind === "writer") {
          const { exportDocx } = await import("./document-export");
          await download(
            await exportDocx(flow, title),
            title + "-tabla.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          );
          setMessage("La tabla DOCX se puede editar en Prisma Writer y Word.");
        } else {
          const { buildFlowDocument } = await import("./flow");
          const rendered = await buildFlowDocument(flow);
          if (kind === "pdf")
            await download(rendered.bytes, title + "-" + sheet + ".pdf");
          else {
            setBusy(false);
            const { printDocument } = await import("./printing");
            await printDocument(rendered.bytes, [], title);
          }
        }
      } else
        await download(
          await book.bytes(),
          title + ".xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
      await persist();
      setExportMenu(false);
      setBusy(false);
    } catch (e) {
      fail(e);
    }
  };
  const searchNext = () => {
    if (!book || !search.trim()) return;
    const matches: Pos[] = [];
    selected?.eachRow((row, r) =>
      row.eachCell((cell, c) => {
        if (
          String(book.value(sheet, r - 1, c - 1) ?? "")
            .toLocaleLowerCase("es")
            .includes(search.toLocaleLowerCase("es"))
        )
          matches.push({ row: r - 1, col: c - 1 });
      }),
    );
    if (!matches.length) {
      setMessage("No se encontraron resultados en esta hoja.");
      return;
    }
    const i = matches.findIndex((p) => equal(p, anchor));
    go(matches[(i + 1) % matches.length]);
    setMessage(matches.length + " resultado(s) en esta hoja.");
  };
  const columnWidth = (c: number) =>
    Math.max(
      64,
      Math.min(500, (selected?.getColumn(c + 1).width ?? 16) * 7 + 12),
    );
  const rowHeight = (r: number) =>
    Math.max(
      30,
      Math.min(1000, ((selected?.findRow(r + 1)?.height ?? 22.5) * 4) / 3),
    );
  const widths = Array.from(
      {
        length: Math.min(
          sheetLimits.columns,
          Math.max(16, (selected?.columnCount ?? 0) + 6, anchor.col + 4),
        ),
      },
      (_, c) => columnWidth(c),
    ),
    prefix = [44];
  for (const width of widths) prefix.push(prefix.at(-1)! + width);
  const rows = Math.min(
      sheetLimits.rows,
      Math.max(100, (selected?.rowCount ?? 0) + 40, anchor.row + 25),
    ),
    yPrefix = [32];
  for (let r = 0; r < rows; r++) yPrefix.push(yPrefix.at(-1)! + rowHeight(r));
  const start = Math.max(0, yPrefix.findIndex((y) => y > scroll.top) - 3),
    visibleRows = Array.from(
      { length: Math.min(48, rows - start) },
      (_, i) => start + i,
    ),
    visibleColumns = widths
      .map((_, c) => c)
      .filter(
        (c) => prefix[c + 1] > scroll.left && prefix[c] < scroll.left + 1800,
      );
  const merges = (selected?.model.merges ?? [])
    .map((range) => {
      const [a, b] = range.split(":").map(parseAddress);
      return a && b ? { a, b } : null;
    })
    .filter((m): m is { a: Pos; b: Pos } => !!m);
  for (const m of merges) {
    if (
      m.b.row >= start &&
      m.a.row < start + 48 &&
      prefix[m.b.col + 1] > scroll.left &&
      prefix[m.a.col] < scroll.left + 1800
    ) {
      if (!visibleRows.includes(m.a.row)) visibleRows.push(m.a.row);
      if (!visibleColumns.includes(m.a.col)) visibleColumns.push(m.a.col);
    }
  }
  const rangeCount =
    (Math.abs(anchor.row - end.row) + 1) * (Math.abs(anchor.col - end.col) + 1);
  const positions = book ? selection(10000) : [],
    numbers = positions
      .slice(0, 10000)
      .map((p) => book?.value(sheet, p.row, p.col))
      .filter((v): v is number => typeof v === "number"),
    sum = numbers.reduce((a, b) => a + b, 0);
  return (
    <div className={"sheets-app" + (!book ? " sheets-welcome" : "")}>
      <input
        hidden
        ref={input}
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void open(f);
        }}
      />
      <header className="sheets-header">
        <a
          className="sheets-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (book)
              void persist()
                .then(() => {
                  setBook(null);
                  setRecent(true);
                })
                .catch(fail);
          }}
        >
          <img
            src={import.meta.env.DEV ? "./sheets-logo.svg" : "./logo.svg"}
            alt=""
          />
          <span>
            Prisma <b>Sheets</b>
          </span>
        </a>
        {book && (
          <>
            <input
              className="sheets-name"
              aria-label="Nombre del libro"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                nameRef.current = e.target.value;
                changed();
              }}
            />
            <span className="sheets-saved">
              <Check size={14} />
              {saved ? "Guardado en este dispositivo" : "Guardando…"}
            </span>
          </>
        )}
        <div className="sheets-header-actions">
          <InstallApp />
          <Updates beforeReload={persist} onError={fail} />
          {book && (
            <button
              className="sheet-primary"
              onClick={() => setExportMenu(!exportMenu)}
            >
              <Download size={16} />
              Exportar
            </button>
          )}
        </div>
      </header>
      {message && (
        <div className="sheets-message" role="status">
          {message}
          <button aria-label="Cerrar mensaje" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {!book ? (
        <main className="sheets-home">
          <div className="sheets-hero">
            <div>
              <span className="sheets-eyebrow">DA FORMA A TUS NÚMEROS</span>
              <h1>
                De una celda
                <br />a una gran idea.
              </h1>
              <p>
                Organiza, calcula y comparte tus hojas con quienes usan Excel.
                Tus archivos se quedan en tu dispositivo.
              </p>
              <div className="sheets-hero-actions">
                <button
                  className="sheet-primary"
                  onClick={() => void newBook()}
                >
                  <Plus />
                  Crear libro
                </button>
                <button onClick={() => input.current?.click()}>
                  <FolderOpen />
                  Abrir XLSX o CSV
                </button>
              </div>
              <span className="sheets-private">
                <LockKeyhole size={14} />
                Sin cuentas. Sin subir tus archivos.
              </span>
            </div>
            <div className="sheets-preview" aria-hidden="true">
              <div className="sheet-mini-label">
                <Sheet size={18} />
                Prisma Sheets
              </div>
              <div className="sheet-mini-formula">
                ƒx <span>=SUM(D5:D7)</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Concepto", "Cantidad", "Total"],
                    ["Cuadernos", "12", "$ 102.000"],
                    ["Impresiones", "80", "$ 24.000"],
                    ["Materiales", "3", "$ 75.000"],
                    ["Total", "", "$ 201.000"],
                  ].map((row, i) => (
                    <tr key={i}>
                      <th>{i + 1}</th>
                      {row.map((v, c) => (
                        <td key={c}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <span className="sheet-floating">
                <ShieldCheck size={18} />
                Todo en tu dispositivo
              </span>
            </div>
          </div>
          <div className="sheets-home-cards">
            <button onClick={() => void newBook()}>
              <FilePlus2 />
              <b>Un libro en blanco</b>
              <span>Celdas, fórmulas y varias hojas.</span>
            </button>
            <button onClick={() => void newBook(true)}>
              <Grid2X2 />
              <b>Explorar un ejemplo</b>
              <span>Un presupuesto con cálculos reales.</span>
            </button>
            <button
              onClick={() => (recent ? void resume() : input.current?.click())}
            >
              <FolderOpen />
              <b>
                {recent ? "Continúa donde quedaste" : "Abre un libro de Excel"}
              </b>
              <span>
                {recent
                  ? "Recupera el último libro guardado."
                  : "Importa datos y formato de XLSX."}
              </span>
            </button>
          </div>
          <footer>
            Prisma Sheets {product.version} · Primera versión{" "}
            <nav>
              <a
                href="https://oscard0823.github.io/prisma-pdf/writer/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prisma Writer
              </a>
              <a
                href="https://oscard0823.github.io/prisma-pdf/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prisma PDF
              </a>
              <a href="https://github.com/OscarD0823/prisma-pdf">
                Código abierto
              </a>
            </nav>
          </footer>
        </main>
      ) : (
        <>
          <nav className="sheets-tabs">
            {[
              "Archivo",
              "Inicio",
              "Insertar",
              "Fórmulas",
              "Datos",
              "Vista",
            ].map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
            <span>
              <LockKeyhole size={13} />
              100 % local
            </span>
          </nav>
          <div
            className="sheets-ribbon"
            role="toolbar"
            aria-label="Herramientas de la hoja"
          >
            {tab === "Archivo" ? (
              <>
                <button
                  onClick={() => void persist().then(() => setBook(null))}
                >
                  <ArrowLeft />
                  Inicio
                </button>
                <button onClick={() => void newBook()}>
                  <FilePlus2 />
                  Nuevo libro
                </button>
                <button onClick={() => input.current?.click()}>
                  <FolderOpen />
                  Abrir
                </button>
                <button
                  onClick={() =>
                    void persist().then(() =>
                      setMessage("Libro guardado en este dispositivo."),
                    )
                  }
                >
                  <Save />
                  Guardar local
                </button>
                <button onClick={() => void exportFile("xlsx")}>
                  <Download />
                  XLSX
                </button>
                <button onClick={() => void exportFile("csv")}>CSV</button>
                <button onClick={() => void exportFile("print")}>
                  <Printer />
                  Imprimir
                </button>
                <button onClick={() => setReport(true)}>
                  Compatibilidad con Excel
                </button>
              </>
            ) : tab === "Inicio" ? (
              <>
                <div className="sheet-tools-group">
                  <button
                    disabled={!history.current.length}
                    title="Deshacer"
                    aria-label="Deshacer"
                    onClick={() => void undo()}
                  >
                    <Undo2 />
                  </button>
                  <button
                    disabled={!future.current.length}
                    title="Rehacer"
                    aria-label="Rehacer"
                    onClick={() => void undo(false)}
                  >
                    <Redo2 />
                  </button>
                  <button
                    onClick={() =>
                      navigator.clipboard
                        .writeText(copied())
                        .then(() => setMessage("Selección copiada."))
                        .catch(() => setMessage("Usa Ctrl+C para copiar."))
                    }
                  >
                    <Copy />
                    Copiar
                  </button>
                  <button
                    onClick={() =>
                      navigator.clipboard
                        .readText()
                        .then(writePaste)
                        .catch(() => setMessage("Usa Ctrl+V para pegar."))
                    }
                  >
                    Pegar
                  </button>
                  <small>Portapapeles</small>
                </div>
                <div className="sheet-tools-group">
                  <select
                    aria-label="Fuente de las celdas"
                    value={active?.font?.name ?? "Calibri"}
                    onChange={(e) => format({ font: { name: e.target.value } })}
                  >
                    {[
                      "Calibri",
                      "Arial",
                      "Times New Roman",
                      "Cambria",
                      "Aptos",
                      "Carlito",
                      "Liberation Sans",
                      "Liberation Serif",
                      "Courier New",
                      "Verdana",
                      "Georgia",
                      "Tahoma",
                    ].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    aria-label="Tamaño de letra"
                    type="number"
                    min="6"
                    max="72"
                    value={active?.font?.size ?? 11}
                    onChange={(e) =>
                      format({
                        font: {
                          size: Math.max(
                            6,
                            Math.min(72, Number(e.target.value) || 11),
                          ),
                        },
                      })
                    }
                  />
                  <button
                    aria-label="Negrita"
                    aria-pressed={!!active?.font?.bold}
                    onClick={() =>
                      format({ font: { bold: !active?.font?.bold } })
                    }
                  >
                    <Bold />
                  </button>
                  <button
                    aria-label="Cursiva"
                    aria-pressed={!!active?.font?.italic}
                    onClick={() =>
                      format({ font: { italic: !active?.font?.italic } })
                    }
                  >
                    <Italic />
                  </button>
                  <button
                    aria-label="Subrayado"
                    aria-pressed={!!active?.font?.underline}
                    onClick={() =>
                      format({ font: { underline: !active?.font?.underline } })
                    }
                  >
                    <Underline />
                  </button>
                  <label title="Color de texto">
                    A
                    <input
                      aria-label="Color de texto"
                      type="color"
                      defaultValue="#20273a"
                      onChange={(e) =>
                        format({
                          font: {
                            color: { argb: "FF" + e.target.value.slice(1) },
                          },
                        })
                      }
                    />
                  </label>
                  <label title="Color de relleno">
                    Relleno
                    <input
                      aria-label="Relleno de celdas"
                      type="color"
                      defaultValue="#e7f3ee"
                      onChange={(e) =>
                        format({
                          fill: {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FF" + e.target.value.slice(1) },
                          },
                        })
                      }
                    />
                  </label>
                  <small>Fuente</small>
                </div>
                <div className="sheet-tools-group">
                  <select
                    aria-label="Alineación"
                    value={active?.alignment?.horizontal ?? "general"}
                    onChange={(e) =>
                      format({
                        alignment: { horizontal: e.target.value as "left" },
                      })
                    }
                  >
                    <option value="general">Automática</option>
                    <option value="left">Izquierda</option>
                    <option value="center">Centrar</option>
                    <option value="right">Derecha</option>
                  </select>
                  <button
                    aria-pressed={!!active?.alignment?.wrapText}
                    onClick={() => {
                      format({
                        alignment: { wrapText: !active?.alignment?.wrapText },
                      });
                    }}
                  >
                    Ajustar texto
                  </button>
                  <button
                    onClick={() =>
                      format({
                        border: {
                          top: { style: "thin" },
                          left: { style: "thin" },
                          right: { style: "thin" },
                          bottom: { style: "thin" },
                        },
                      })
                    }
                  >
                    Bordes
                  </button>
                  <small>Alineación</small>
                </div>
                <div className="sheet-tools-group">
                  <select
                    aria-label="Formato de número"
                    value={active?.numFmt ?? "General"}
                    onChange={(e) => format({ numFmt: e.target.value })}
                  >
                    {[
                      "General",
                      "#,##0",
                      "#,##0.00",
                      '"$"#,##0',
                      "0.0%",
                      "dd/mm/yyyy",
                      "@",
                    ].map((f) => (
                      <option key={f} value={f}>
                        {
                          (
                            {
                              General: "General",
                              "#,##0": "Número entero",
                              "#,##0.00": "Número decimal",
                              '"$"#,##0': "Moneda",
                              "0.0%": "Porcentaje",
                              "dd/mm/yyyy": "Fecha",
                              "@": "Texto",
                            } as Record<string, string>
                          )[f]
                        }
                      </option>
                    ))}
                  </select>
                  <small>Números</small>
                </div>
              </>
            ) : tab === "Insertar" ? (
              <>
                <button
                  onClick={() => {
                    if (book) {
                      remember();
                      setSheet(book.addSheet());
                      changed();
                    }
                  }}
                >
                  <Plus />
                  Nueva hoja
                </button>
                <button
                  onClick={() => {
                    if (!book || !selected) return;
                    try {
                      remember();
                      selected.mergeCells(
                        cellAddress(
                          Math.min(anchor.row, end.row),
                          Math.min(anchor.col, end.col),
                        ) +
                          ":" +
                          cellAddress(
                            Math.max(anchor.row, end.row),
                            Math.max(anchor.col, end.col),
                          ),
                      );
                      book.rebuild();
                      changed();
                      setMessage(
                        "Celdas combinadas. Se conserva el valor de la primera celda.",
                      );
                    } catch (e) {
                      fail(e);
                    }
                  }}
                >
                  Combinar selección
                </button>
                <button
                  onClick={() => {
                    if (!selected || !book) return;
                    remember();
                    selected.unMergeCells(cellAddress(anchor.row, anchor.col));
                    book.rebuild();
                    changed();
                  }}
                >
                  Separar celdas
                </button>
                <button onClick={() => void exportFile("writer")}>
                  Tabla para Writer o Word
                </button>
                <span className="sheet-ribbon-note">
                  Selecciona un rango para compartirlo como tabla editable.
                </span>
              </>
            ) : tab === "Fórmulas" ? (
              <>
                <button
                  onClick={() =>
                    setEdit(
                      "=SUM(" +
                        cellAddress(
                          Math.min(anchor.row, end.row),
                          Math.min(anchor.col, end.col),
                        ) +
                        ":" +
                        cellAddress(
                          Math.max(anchor.row, end.row),
                          Math.max(anchor.col, end.col),
                        ) +
                        ")",
                    )
                  }
                >
                  Σ Insertar SUMA
                </button>
                <select
                  aria-label="Insertar función"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) setEdit("=" + e.target.value + "(");
                    e.target.value = "";
                  }}
                >
                  <option value="">Elegir función…</option>
                  {[
                    "SUM",
                    "AVERAGE",
                    "MIN",
                    "MAX",
                    "COUNT",
                    "COUNTA",
                    "IF",
                    "SUMIFS",
                    "COUNTIFS",
                    "VLOOKUP",
                    "INDEX",
                    "MATCH",
                    "ROUND",
                    "TODAY",
                    "CONCATENATE",
                  ].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                <span className="sheet-ribbon-note">
                  Acepta SUMA, PROMEDIO, SI y sus nombres en inglés. Ejemplo:
                  =SUMA(A1:A5)
                </span>
              </>
            ) : tab === "Datos" ? (
              <>
                <input
                  aria-label="Buscar en la hoja"
                  placeholder="Buscar en esta hoja"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchNext();
                  }}
                />
                <button onClick={searchNext}>
                  <Search />
                  Siguiente
                </button>
                <button
                  onClick={() => {
                    if (!selected || !book) return;
                    remember();
                    const range =
                      cellAddress(
                        Math.min(anchor.row, end.row),
                        Math.min(anchor.col, end.col),
                      ) +
                      ":" +
                      cellAddress(
                        Math.max(anchor.row, end.row),
                        Math.max(anchor.col, end.col),
                      );
                    selected.autoFilter = selected.autoFilter
                      ? undefined
                      : range;
                    changed();
                    setMessage(
                      "Filtro guardado para Excel. La vista filtrada llegará en una actualización.",
                    );
                  }}
                >
                  Filtro para Excel
                </button>
                <button onClick={() => setReport(true)}>
                  Compatibilidad con Excel
                </button>
              </>
            ) : (
              <>
                <label>
                  Zoom
                  <input
                    aria-label="Zoom de la hoja"
                    type="range"
                    min="70"
                    max="130"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                  {zoom}%
                </label>
                <button
                  onClick={() => {
                    if (selected) {
                      remember();
                      selected.views = [{ state: "frozen", ySplit: 1 }];
                      changed();
                      setMessage(
                        "Primera fila congelada al abrir en Excel. Las letras y números permanecen visibles en Prisma.",
                      );
                    }
                  }}
                >
                  Congelar primera fila en Excel
                </button>
                <button onClick={() => void exportFile("print")}>
                  <Printer />
                  Imprimir
                </button>
                <button onClick={() => setReport(true)}>Compatibilidad</button>
              </>
            )}
          </div>
          <div className="sheets-formula">
            <input
              aria-label="Ir a celda"
              key={cellAddress(anchor.row, anchor.col)}
              defaultValue={cellAddress(anchor.row, anchor.col)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const p = parseAddress(e.currentTarget.value);
                  if (p) go(p);
                  else
                    setMessage(
                      "Escribe una dirección válida, por ejemplo A1 o D25.",
                    );
                }
              }}
            />
            <span>ƒx</span>
            <input
              aria-label="Barra de fórmulas"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(formula);
                if (e.key === "Escape")
                  setFormula(book.input(sheet, anchor.row, anchor.col));
              }}
            />
            <button
              aria-label="Aplicar fórmula"
              onClick={() => commit(formula)}
            >
              <Check size={17} />
            </button>
          </div>
          <div
            ref={grid}
            className="sheets-grid"
            role="grid"
            tabIndex={0}
            aria-label={"Hoja " + sheet}
            aria-rowcount={rows}
            aria-colcount={widths.length}
            style={{ fontSize: (11 * zoom) / 100 + "pt" }}
            onScroll={(e) =>
              setScroll({
                top: e.currentTarget.scrollTop,
                left: e.currentTarget.scrollLeft,
              })
            }
            onCopy={(e) => {
              if (edit !== null) return;
              e.preventDefault();
              e.clipboardData.setData("text/plain", copied());
            }}
            onCut={(e) => {
              if (edit !== null) return;
              e.preventDefault();
              e.clipboardData.setData("text/plain", copied());
              clear();
            }}
            onPaste={(e) => {
              if (edit !== null) return;
              e.preventDefault();
              writePaste(e.clipboardData.getData("text/plain"));
            }}
            onKeyDown={(e) => {
              if (edit !== null || e.target !== e.currentTarget) return;
              const target = e.shiftKey ? end : anchor;
              const move: Record<string, Pos> = {
                ArrowDown: { ...target, row: target.row + 1 },
                ArrowUp: { ...target, row: target.row - 1 },
                ArrowLeft: { ...target, col: target.col - 1 },
                ArrowRight: { ...target, col: target.col + 1 },
                Enter: { ...target, row: target.row + 1 },
                Tab: { ...target, col: target.col + (e.shiftKey ? -1 : 1) },
              };
              if (move[e.key]) {
                e.preventDefault();
                go(move[e.key], e.shiftKey && e.key !== "Tab");
              } else if (e.key === "F2") {
                e.preventDefault();
                setEdit(book.input(sheet, anchor.row, anchor.col));
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                clear();
              } else if (
                (e.ctrlKey || e.metaKey) &&
                e.key.toLowerCase() === "z"
              ) {
                e.preventDefault();
                void undo(!e.shiftKey);
              } else if (
                e.key.length === 1 &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey
              ) {
                e.preventDefault();
                setEdit(e.key);
              }
            }}
          >
            <div
              className="sheets-canvas"
              style={{ width: prefix.at(-1), height: yPrefix.at(-1) }}
            >
              <div className="sheets-columns" role="row">
                <div className="sheet-corner" style={{ left: scroll.left }} />
                <>
                  {visibleColumns.map((c) => (
                    <div
                      className="sheet-column"
                      role="columnheader"
                      key={c}
                      style={{ left: prefix[c], width: widths[c] }}
                    >
                      {columnName(c)}
                      <span
                        title="Arrastra para cambiar el ancho"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          const x = e.clientX,
                            width = widths[c],
                            el = e.currentTarget;
                          el.setPointerCapture(e.pointerId);
                          el.onpointermove = (ev) => {
                            if (!selected) return;
                            selected.getColumn(c + 1).width = Math.max(
                              5,
                              Math.min(70, (width + ev.clientX - x - 12) / 7),
                            );
                            setTick((t) => t + 1);
                          };
                          el.onpointerup = () => {
                            el.onpointermove = null;
                            el.onpointerup = null;
                            changed();
                          };
                        }}
                      />
                    </div>
                  ))}
                </>
              </div>
              {visibleRows.map((r) => (
                <div
                  className="sheet-row"
                  role="row"
                  aria-rowindex={r + 1}
                  key={r}
                  style={{ top: yPrefix[r], height: rowHeight(r) }}
                >
                  <div
                    className="sheet-row-head"
                    role="rowheader"
                    style={{ left: scroll.left, height: rowHeight(r) }}
                  >
                    {r + 1}
                  </div>
                  {visibleColumns.map((c) => {
                    const cell = selected!.findCell(r + 1, c + 1) ?? emptyCell,
                      isActive = equal(anchor, { row: r, col: c }),
                      inRange =
                        r >= Math.min(anchor.row, end.row) &&
                        r <= Math.max(anchor.row, end.row) &&
                        c >= Math.min(anchor.col, end.col) &&
                        c <= Math.max(anchor.col, end.col),
                      value = book.value(sheet, r, c),
                      fill =
                        cell.fill?.type === "pattern"
                          ? cell.fill.fgColor?.argb
                          : undefined,
                      colour = cell.font?.color?.argb;
                    if (cell.isMerged && cell.master.address !== cell.address)
                      return null;
                    const merged = merges.find(
                        (m) => m.a.row === r && m.a.col === c,
                      ),
                      height = merged
                        ? yPrefix[Math.min(rows, merged.b.row + 1)] - yPrefix[r]
                        : rowHeight(r);
                    const border = (edge: keyof Cell["border"]) =>
                      cell.border?.[edge]?.style
                        ? `1px solid #${cell.border[edge]?.color?.argb?.slice(-6) ?? "b4c7bb"}`
                        : undefined;
                    return (
                      <div
                        role="gridcell"
                        aria-label={cellAddress(r, c)}
                        aria-selected={inRange}
                        className={
                          "sheet-cell" +
                          (inRange ? " selected" : "") +
                          (isActive ? " active" : "") +
                          (typeof value === "number" ? " numeric" : "")
                        }
                        key={c}
                        style={{
                          left: prefix[c],
                          width: merged
                            ? prefix[merged.b.col + 1] - prefix[c]
                            : widths[c],
                          height,
                          lineHeight: cell.alignment?.wrapText
                            ? "1.35"
                            : height - 1 + "px",
                          paddingTop: cell.alignment?.wrapText ? 5 : undefined,
                          zIndex: merged ? 2 : undefined,
                          borderTop: border("top"),
                          borderBottom: border("bottom"),
                          borderLeft: border("left"),
                          borderRight: border("right"),
                          fontFamily:
                            (
                              {
                                Calibri: "Carlito",
                                Arial: "PrismaSans",
                                "Times New Roman": "PrismaSerif",
                                "Courier New": "PrismaMono",
                              } as Record<string, string>
                            )[cell.font?.name ?? ""] ??
                            cell.font?.name ??
                            "Carlito, Arial, sans-serif",
                          fontSize:
                            ((cell.font?.size ?? 11) * zoom) / 100 + "pt",
                          fontWeight: cell.font?.bold ? "bold" : undefined,
                          fontStyle: cell.font?.italic ? "italic" : undefined,
                          textDecoration: cell.font?.underline
                            ? "underline"
                            : undefined,
                          color: colour ? "#" + colour.slice(-6) : undefined,
                          backgroundColor: fill
                            ? "#" + fill.slice(-6)
                            : undefined,
                          textAlign:
                            cell.alignment?.horizontal === "center"
                              ? "center"
                              : cell.alignment?.horizontal === "right"
                                ? "right"
                                : cell.alignment?.horizontal === "left"
                                  ? "left"
                                  : undefined,
                          whiteSpace: cell.alignment?.wrapText
                            ? "pre-wrap"
                            : undefined,
                        }}
                        onPointerDown={(e) => {
                          if (edit !== null && isActive) return;
                          e.preventDefault();
                          select({ row: r, col: c }, e.shiftKey);
                          dragging.current = true;
                        }}
                        onPointerEnter={() => {
                          if (dragging.current) setEnd({ row: r, col: c });
                        }}
                        onDoubleClick={() => setEdit(book.input(sheet, r, c))}
                      >
                        {isActive && edit !== null ? (
                          <input
                            ref={editor}
                            aria-label={"Editar " + cellAddress(r, c)}
                            value={edit}
                            onChange={(e) => setEdit(e.target.value)}
                            onBlur={() => {
                              if (editRef.current !== null)
                                commit(editRef.current);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault();
                                e.stopPropagation();
                                commit(edit, {
                                  row: r + (e.key === "Enter" ? 1 : 0),
                                  col: c + (e.key === "Tab" ? 1 : 0),
                                });
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEdit(null);
                                grid.current?.focus();
                              }
                            }}
                          />
                        ) : (
                          displayValue(value, cell.numFmt)
                        )}
                        {cell.note && (
                          <span
                            className="sheet-note"
                            title={
                              typeof cell.note === "string"
                                ? cell.note
                                : "Nota de Excel"
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="sheets-bottom">
            <div className="sheet-names">
              {book.workbook.worksheets.map((s) => (
                <button
                  key={s.id}
                  aria-pressed={s.name === sheet}
                  onClick={() => {
                    if (edit !== null) commit();
                    setSheet(s.name);
                    setAnchor({ row: 0, col: 0 });
                    setEnd({ row: 0, col: 0 });
                  }}
                >
                  {s.name}
                </button>
              ))}
              <button
                aria-label="Agregar hoja"
                onClick={() => {
                  remember();
                  setSheet(book.addSheet());
                  changed();
                }}
              >
                <Plus size={16} />
              </button>
            </div>
            <span>
              {rangeCount > 1
                ? `${rangeCount} celdas · Suma: ${sum.toLocaleString("es-CO")} · Promedio: ${numbers.length ? (sum / numbers.length).toLocaleString("es-CO") : "—"}`
                : "Listo"}
              {rangeCount > 10000 ? " · cálculo de primeras 10.000 celdas" : ""}
            </span>
          </div>
          {exportMenu && (
            <div
              className="sheets-export"
              role="menu"
              aria-label="Exportar libro"
            >
              <button role="menuitem" onClick={() => void exportFile("xlsx")}>
                Libro de Excel (.xlsx)
              </button>
              <button role="menuitem" onClick={() => void exportFile("csv")}>
                Hoja actual (.csv)
              </button>
              <button role="menuitem" onClick={() => void exportFile("writer")}>
                Selección como tabla para Word (.docx)
              </button>
              <button role="menuitem" onClick={() => void exportFile("pdf")}>
                Hoja o selección en PDF
              </button>
              {book.original && (
                <button
                  role="menuitem"
                  onClick={() => void exportFile("original")}
                >
                  Descargar archivo original intacto
                </button>
              )}
              <button role="menuitem" onClick={() => setExportMenu(false)}>
                Cerrar
              </button>
            </div>
          )}
        </>
      )}
      {report && book && (
        <div className="modal-backdrop">
          <section
            className="modal sheets-report"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-compatibility"
          >
            <button
              className="sheets-close"
              aria-label="Cerrar compatibilidad"
              onClick={() => setReport(false)}
            >
              <X />
            </button>
            <span className="sheets-eyebrow">COMPATIBILIDAD CON EXCEL</span>
            <h2 id="sheet-compatibility">Tu libro, listo para compartir.</h2>
            <p>
              Esta primera versión permite editar celdas, fórmulas, formatos y
              varias hojas. XLSX conserva tablas, imágenes y notas que admite el
              motor de importación.
            </p>
            <div className="sheets-report-counts">
              <b>
                {book.workbook.worksheets.length}
                <span>Hojas</span>
              </b>
              <b>
                {book.workbook.worksheets.reduce(
                  (n, s) => n + s.actualRowCount,
                  0,
                )}
                <span>Filas con datos</span>
              </b>
            </div>
            {book.warnings.length ? (
              <>
                <h3>Revisa estas funciones antes de exportar</h3>
                <ul>
                  {book.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
                <p>
                  La copia exportada puede perder esos elementos. El archivo
                  original permanece intacto.
                </p>
                <button
                  className="sheet-primary"
                  onClick={() => {
                    setReport(false);
                    void exportFile("xlsx", true);
                  }}
                >
                  Exportar copia simplificada
                </button>
                {book.original && (
                  <button onClick={() => void exportFile("original")}>
                    Descargar original
                  </button>
                )}
              </>
            ) : (
              <p>
                No se detectaron gráficos nativos, tablas dinámicas ni
                conexiones externas. Revisa el archivo exportado si usas
                fórmulas especiales o formatos complejos.
              </p>
            )}
            <p className="sheet-compatibility-limits">
              Todavía no incluye VBA, Power Query, edición de gráficos ni tablas
              dinámicas. Los documentos nunca se envían a un servidor.
            </p>
            <button onClick={() => setReport(false)}>Continuar editando</button>
          </section>
        </div>
      )}
      {busy && (
        <div className="sheets-busy" role="status">
          Procesando el archivo en este dispositivo…
        </div>
      )}
    </div>
  );
}
