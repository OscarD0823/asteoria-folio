import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Check,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Highlighter,
  ImagePlus,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Minus,
  MousePointer2,
  PanelLeftClose,
  PenLine,
  Plus,
  Redo2,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  X,
  ScanText,
  Scissors,
  Underline,
  Strikethrough,
  Square,
  Circle,
  Eraser,
  Printer,
  Save,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table2,
  IndentIncrease,
  IndentDecrease,
  Subscript,
  Superscript,
  Link2,
  FileText,
  BookOpen,
  Maximize2,
} from "lucide-react";
import {
  appendPdf,
  buildPdf,
  demoWorkspace,
  emptyWorkspace,
  fitPdfToLayout,
  pageRange,
  uid,
  rotation,
  turnPoint,
  type Workspace,
  type Page,
  type Mark,
  type Tool,
} from "./pdf";
import { clearPdfCache, getPdf, releaseUnusedSources } from "./renderer";
import { runNative, type NativeObject } from "./native";
import {
  loadSession,
  saveSession,
  saveProject,
  listProjects,
  loadProject,
  deleteProject,
  type ProjectSummary,
  pruneSources,
} from "./storage";
import { projectBytes, readProject, validateLayout } from "./projects";
import { defaultLayout, pageSize, plainText, type PageLayout } from "./flow";
import { renderFlow } from "./flow-renderer";
import { DocumentNavigation } from "./DocumentNavigation";
import { blankWithWatermarks, watermarkCandidate } from "./watermarks";
import { insertBlankPage } from "./page-insertion";
import { WordTools } from "./WordTools";
import { DocumentRuler, VerticalDocumentRuler } from "./DocumentRuler";
import { selectedSection, documentSections, changeSection } from "./sections";
import { normalizeAcademicDocument, academicPlainText } from "./academic";
import { documentStatistics } from "./document-tools";
import type { TextPreparation, Inspection } from "./native";
import type { RichNode } from "./flow";
import { FontPicker } from "./FontPicker";
import {
  importLocalFont,
  validateLocalFonts,
  mountLocalFonts,
} from "./local-fonts";
import { RichEditor, type RichEditorInstance } from "./LazyRichEditor";
import { SpellingReview } from "./SpellingReview";
import { CharacterInspector } from "./CharacterInspector";
import { product } from "./product";
import PdfWorkbench from './PdfWorkbench';
import {OcrDialog} from './OcrDialog';
import { importOfficeDocx, importText } from "./document-import";
import { writerExample } from "./writer-example";
import { PageFrame } from "./PageFrame";
import { Button, PageThumbnail, Signature } from "./components";
import { download } from "./download";
import { Updates } from "./Updates";
import { preparePrint, printDocument, type PrintPage } from "./printing";
import { InstallApp } from "./InstallApp";
import { formatRichNode, hasRichMark } from "./rich-format";
const safeName = (s: string) =>
  s.replace(/\.(pdf|prisma)$/i, "").replace(/[<>:"/\\|?*\x00-\x1f]/g, "-") ||
  "Mi documento";
const palette = [
  "#20273a",
  "#6554d8",
  "#1c8ca0",
  "#e05688",
  "#ffdf64",
  "#7fdaba",
];
const tools = [
  { id: "select", icon: MousePointer2, label: "Seleccionar" },
  { id: "edit", icon: ScanText, label: "Editar palabras" },
  { id: "text", icon: Type, label: "Texto nuevo" },
  { id: "highlight", icon: Highlighter, label: "Resaltar texto" },
] as const;
type Dialog =
  | "export"
  | "layout"
  | "signature"
  | "print"
  | "help"
  | "table"
  | "link"
  | null;
export default function Studio() {
  const [pdfWorkbench,setPdfWorkbench]=useState(false);
  const [ocrOpen,setOcrOpen]=useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace),
    state = useRef(workspace);
  state.current = workspace;
  const [home, setHome] = useState(true),
    [projects, setProjects] = useState<ProjectSummary[]>([]),
    [last, setLast] = useState<Workspace>(),
    [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState(""),
    [selectedId, setSelectedId] = useState(""),
    [editing, setEditing] = useState(""),
    [tool, setTool] = useState<Tool>("select");
  const [showMarks, setShowMarks] = useState(false),
    [autoCorrect, setAutoCorrect] = useState(false),
    [showRuler, setShowRuler] = useState(true),
    [navigation, setNavigation] = useState(false),
    [searchQuery, setSearchQuery] = useState("");
  const [reviewPanel, setReviewPanel] = useState<
    "" | "spelling" | "characters"
  >("");
  const [writingPages, setWritingPages] = useState(1);
  const [writingActivePage, setWritingActivePage] = useState(0);
  const [tab, setTab] = useState("Inicio"),
    [view, setView] = useState<"write" | "pdf">("write"),
    [sidebar, setSidebar] = useState(window.innerWidth > 850),
    [zoom, setZoom] = useState(100),
    [fit, setFit] = useState(true),
    [stageWidth, setStageWidth] = useState(900);
  const [editor, setEditor] = useState<RichEditorInstance | null>(null),
    [tick, setTick] = useState(0),
    [font, setFont] = useState(product.writer ? "Carlito" : "PrismaSans"),
    [size, setSize] = useState(12),
    [color, setColor] = useState("#20273a");
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saved, setSaved] = useState("Guardado local"),
    [dialog, setDialog] = useState<Dialog>(null);
  const [pending, setPending] = useState<{
      data: string;
      ratio: number;
      type: "image" | "signature";
    }>(),
    [layout, setLayout] = useState<PageLayout>(defaultLayout),
    [scope, setScope] = useState("all"),
    [range, setRange] = useState("1"),
    [compress, setCompress] = useState(false),
    [exportName, setExportName] = useState("");
  const [exportFormat, setExportFormat] = useState(
    product.writer ? "docx" : "pdf",
  );
  const [printPages, setPrintPages] = useState<PrintPage[]>([]),
    [printCount, setPrintCount] = useState(0),
    [printScope, setPrintScope] = useState("all"),
    [printRange, setPrintRange] = useState("1"),
    printBytes = useRef<Uint8Array>(new Uint8Array()),
    [rows, setRows] = useState(3),
    [cols, setCols] = useState(3),
    [link, setLink] = useState("https://");
  const [history, setHistory] = useState<{
      past: Workspace[];
      future: Workspace[];
    }>({ past: [], future: [] }),
    histories = useRef(history);
  histories.current = history;
  const stage = useRef<HTMLDivElement>(null),
    openInput = useRef<HTMLInputElement>(null),
    mergeInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    imagesInput = useRef<HTMLInputElement>(null),
    initialized = useRef(false),
    flowJob = useRef(0),
    scrollFrame = useRef(0);
  const active =
      workspace.pages.find((p) => p.id === activeId) ?? workspace.pages[0],
    selected = workspace.pages
      .flatMap((p) => p.marks)
      .find((m) => m.id === selectedId),
    writing = !!workspace.flow && view === "write";
  const rich =
    editor && !editor.isDestroyed && (writing || !!editing || tool === "edit")
      ? editor
      : null;
  const fail = (e: unknown) => {
    if (
      e instanceof Error &&
      (/Loading aborted|Rendering cancelled/i.test(e.message) ||
        [
          "AbortException",
          "RenderingCancelledException",
          "AbortError",
        ].includes(e.name))
    )
      return;
    setError(
      e instanceof Error ? e.message : "No pudimos completar esta acción.",
    );
  };
  const inform = (s: string) => {
    setNotice(s);
    setError("");
  };
  function commit(next: Workspace, remember = true) {
    const previous = state.current;
    if (remember)
      setHistory((h) => ({
        past: [...h.past, previous].slice(-30),
        future: [],
      }));
    const clean = pruneSources(next);
    state.current = clean;
    setWorkspace(clean);
    setSaved("Guardando…");
  }
  useEffect(() => {
    let closed = false,
      dispose: (() => void) | undefined;
    mountLocalFonts(workspace.fonts ?? [])
      .then((cleanup) => {
        if (closed) cleanup();
        else dispose = cleanup;
      })
      .catch(fail);
    return () => {
      closed = true;
      dispose?.();
    };
  }, [workspace.fonts]);
  async function importFonts(files: File[]) {
    const fonts = [...(state.current.fonts ?? [])];
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024)
        throw new Error("Elige fuentes TTF u OTF de hasta 8 MB por archivo.");
      const face = await importLocalFont(
        new Uint8Array(await file.arrayBuffer()),
      );
      const index = fonts.findIndex(
        (f) => f.value === face.value && f.style === face.style,
      );
      if (index >= 0) fonts[index] = face;
      else fonts.push(face);
    }
    await validateLocalFonts(fonts);
    commit({ ...state.current, fonts });
    inform("Fuentes importadas en este proyecto.");
  }
  function changeMark(pageId: string, m: Mark) {
    commit(
      {
        ...state.current,
        pages: state.current.pages.map((p) =>
          p.id === pageId
            ? { ...p, marks: p.marks.map((a) => (a.id === m.id ? m : a)) }
            : p,
        ),
      },
      editing !== m.id,
    );
  }
  function addMarks(pageId: string, marks: Mark[]) {
    commit({
      ...state.current,
      pages: state.current.pages.map((p) =>
        p.id === pageId ? { ...p, marks: [...p.marks, ...marks] } : p,
      ),
    });
  }
  function clear() {
    setSelectedId("");
    setEditing("");
    setEditor(null);
  }
  function undo() {
    if (rich?.can().undo()) {
      rich.chain().focus().undo().run();
      return;
    }
    const h = histories.current;
    if (!h.past.length) return;
    const previous = state.current;
    commit(h.past.at(-1)!, false);
    setHistory({ past: h.past.slice(0, -1), future: [previous, ...h.future] });
    clear();
  }
  function redo() {
    if (rich?.can().redo()) {
      rich.chain().focus().redo().run();
      return;
    }
    const h = histories.current;
    if (!h.future.length) return;
    const previous = state.current;
    commit(h.future[0], false);
    setHistory({ past: [...h.past, previous], future: h.future.slice(1) });
    clear();
  }
  async function refresh() {
    setProjects(await listProjects());
  }
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([loadSession(), listProjects()])
      .then(([s, p]) => {
        setLast(s?.workspace);
        setProjects(p);
      })
      .catch(() => setSaved("Guardado local no disponible"))
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (home || !ready || (!workspace.pages.length && !workspace.flow)) return;
    const timer = setTimeout(() => {
      void saveSession(workspace)
        .then(() => {
          setSaved("Guardado en este dispositivo");
          setLast(workspace);
        })
        .catch(() => setSaved("Sin espacio: guarda una copia .prisma"));
    }, 900);
    return () => clearTimeout(timer);
  }, [workspace, home, ready]);
  useEffect(() => {
    if (home || !stage.current) return;
    const o = new ResizeObserver((es) =>
      setStageWidth(es[0].contentRect.width),
    );
    o.observe(stage.current);
    return () => o.disconnect();
  }, [home]);
  useEffect(() => {
    const media = matchMedia("(max-width: 700px)");
    const resize = () => setSidebar(!media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    void releaseUnusedSources(workspace.sources.map((s) => s.id));
  }, [workspace.sources]);
  useEffect(() => {
    stage.current?.scrollTo({ top: 0, left: 0 });
  }, [view]);
  useEffect(() => {
    if (dialog !== "print") {
      setPrintPages([]);
      printBytes.current = new Uint8Array();
    }
  }, [dialog]);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);
  useEffect(() => {
    if (!workspace.flow) return;
    const expected = ++flowJob.current,
      flow = workspace.flow;
    const t = setTimeout(() => {
      renderFlow({ ...flow, fonts: state.current.fonts }, state.current.name)
        .then(
          async ({ bytes, content, pageMap, pageLayouts, pageSections }) => {
            if (expected !== flowJob.current || state.current.flow !== flow)
              return;
            const doc = await PDFDocument.load(bytes),
              sourceId = uid();
            const next = {
              ...state.current,
              flow: {
                ...flow,
                pageMap,
                pageLayouts,
                pageSections,
                content:
                  JSON.stringify(content) === JSON.stringify(flow.content)
                    ? flow.content
                    : content,
              },
              sources: [
                { id: sourceId, name: state.current.name + ".pdf", bytes },
              ],
              pages: doc.getPages().map((_, index) => ({
                id: state.current.pages[index]?.id ?? uid(),
                sourceId,
                index,
                rotation: 0,
                marks: [],
              })),
            };
            state.current = next;
            setWorkspace(next);
            if (!activeId) setActiveId(next.pages[0].id);
          },
        )
        .catch((e) => {
          if (e?.name !== "AbortError") fail(e);
        });
    }, 700);
    return () => {
      clearTimeout(t);
      flowJob.current++;
    };
  }, [
    workspace.flow?.content,
    workspace.flow?.layout,
    workspace.flow?.references,
    workspace.flow?.academicStyle,
    workspace.fonts,
  ]);
  useEffect(() => {
    if (!rich) return;
    const update = () => setTick((n) => n + 1);
    rich.on("transaction", update);
    return () => {
      rich.off("transaction", update);
    };
  }, [rich]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (busy) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.shiftKey ? void portable() : void saveNamed();
        return;
      }
      if (mod && e.key.toLowerCase() === "p" && !home) {
        e.preventDefault();
        void beginPrint();
        return;
      }
      if (dialog) {
        if (e.key === "Escape") setDialog(null);
        return;
      }
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"]',
        )
      )
        return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === "Delete" && selected) removeSelected();
      else if (e.key === "Escape") {
        clear();
        setTool("select");
        setPending(undefined);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (!dialog) return;
    const prior = document.activeElement as HTMLElement,
      el = document.querySelector<HTMLElement>('[role="dialog"]');
    el?.querySelector<HTMLElement>("input,button")?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        ),
      );
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0]?.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      prior?.focus();
    };
  }, [dialog]);
  async function enter(next: Workspace) {
    await clearPdfCache();
    flowJob.current++;
    state.current = next;
    setWorkspace(next);
    setActiveId(next.pages[0]?.id ?? "");
    setWritingPages(1);
    setWritingActivePage(0);
    clear();
    setHistory({ past: [], future: [] });
    setTool("select");
    setHome(false);
    setView(next.flow ? "write" : "pdf");
    setLayout(next.flow?.layout ?? defaultLayout());
  }
  async function newDocument() {
    await enter({
      ...emptyWorkspace(),
      flow: {
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              attrs: {
                fontFamily: product.writer ? "Carlito" : "PrismaSans",
                fontSize: 12,
              },
            },
          ],
        },
        layout: defaultLayout(),
      },
    });
  }
  async function openFiles(files: FileList | null, append = false) {
    if (!files?.length) return;
    setBusy(append ? "Uniendo PDF…" : "Abriendo documento…");
    try {
      let next = append ? state.current : emptyWorkspace();
      if (append && next.flow)
        next = await appendPdf(
          emptyWorkspace(),
          await buildPdf(next),
          next.name + ".pdf",
        );
      let total = next.sources.reduce((n, s) => n + s.bytes.length, 0);
      for (const f of Array.from(files)) {
        if (/\.(docx|txt)$/i.test(f.name)) {
          if (append || files.length !== 1)
            throw new Error("Abre un solo documento DOCX o TXT.");
          const imported = /\.docx$/i.test(f.name)
            ? await importOfficeDocx(new Uint8Array(await f.arrayBuffer()))
            : { flow: importText(await f.text()), warnings: [] };
          const name = f.name.replace(/\.[^.]+$/, "");
          next = { ...emptyWorkspace(), name, flow: imported.flow };
          await enter(next);
          inform(
            imported.warnings.length
              ? "Documento importado. " + imported.warnings.join(" ")
              : "Documento importado y listo para escribir.",
          );
          return;
        }
        if (/\.prisma$/i.test(f.name)) {
          if (append || files.length > 1)
            throw new Error("Abre un solo proyecto .prisma.");
          next = await readProject(new Uint8Array(await f.arrayBuffer()));
          break;
        }
        if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf")
          throw new Error(
            "Selecciona un PDF, DOCX, TXT o un proyecto .prisma.",
          );
        total += f.size;
        if (total > 100 * 1024 * 1024)
          throw new Error("Usa documentos de hasta 100 MB en total.");
        next = await appendPdf(
          next,
          new Uint8Array(await f.arrayBuffer()),
          f.name,
        );
      }
      if (append) {
        commit(next);
        setView("pdf");
      } else await enter(next);
      inform("Documento abierto en tu dispositivo.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
      if (openInput.current) openInput.current.value = "";
      if (mergeInput.current) mergeInput.current.value = "";
    }
  }
  async function saveNamed() {
    if (home || busy) return;
    try {
      const id = await saveProject(state.current);
      commit({ ...state.current, projectId: id }, false);
      await refresh();
      inform("Proyecto guardado en tu biblioteca local.");
    } catch (e) {
      fail(e);
    }
  }
  async function portable() {
    if (home) return;
    try {
      await download(
        projectBytes(state.current),
        safeName(state.current.name) + ".prisma",
        "application/json",
      );
      inform("Copia editable guardada con el documento y sus cambios.");
    } catch (e) {
      fail(e);
    }
  }
  async function normalizeImage(f: File) {
    if (f.size > 25 * 1024 * 1024)
      throw new Error("Usa una imagen de hasta 25 MB.");
    const url = URL.createObjectURL(f);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const c = document.createElement("canvas"),
        r = Math.min(
          1,
          2400 / Math.max(image.naturalWidth, image.naturalHeight),
        );
      c.width = Math.max(1, Math.round(image.naturalWidth * r));
      c.height = Math.max(1, Math.round(image.naturalHeight * r));
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      return {
        data: c.toDataURL("image/png"),
        ratio: c.width / c.height,
        type: "image" as const,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function loadImage(f?: File) {
    if (!f) return;
    try {
      const img = await normalizeImage(f);
      if (writing && rich)
        rich
          .chain()
          .focus()
          .setImage({ src: img.data, width: 240, height: 240 / img.ratio })
          .run();
      else {
        setPending(img);
        setTool("image");
        clear();
        inform("Haz clic en una página para colocar la imagen.");
      }
    } catch (e) {
      fail(e);
    } finally {
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  function choose(next: Tool) {
    if (next === "edit" && !workspace.flow) {
      void prepareAllText();
      return;
    }
    clear();
    setPending(undefined);
    setTool(next);
    if (next === "highlight") setColor("#ffdf64");
    if (
      [
        "draw",
        "rectangle",
        "ellipse",
        "arrow",
        "underline",
        "strikeout",
      ].includes(next)
    )
      setSize(2);
  }
  async function prepareAllText() {
    if (busy) return;
    clear();
    setBusy("Preparando todo el texto del documento…");
    try {
      let current = state.current;
      for (const source of current.sources) {
        const pending = current.pages.filter(
          (p) => p.sourceId === source.id && !p.textReady,
        );
        if (!pending.length) continue;
        const prepared = (await runNative({
            action: "editAll",
            bytes: source.bytes,
            index: 0,
          })) as TextPreparation,
          id = uid();
        current = {
          ...current,
          sources: [
            ...current.sources,
            { id, name: source.name, bytes: prepared.bytes },
          ],
          pages: current.pages.map((p) => {
            if (!pending.some((a) => a.id === p.id)) return p;
            const info = prepared.pages[p.index];
            const marks: Mark[] = info.objects.map((o) => ({
              id: uid(),
              type: "text",
              x: o.x,
              y: (o.baseline ?? o.y + o.size) - o.size,
              width: Math.max(
                12,
                o.width + 4,
                Math.min(
                  info.width - o.x - 35,
                  ...info.objects
                    .filter(
                      (n) =>
                        n.x > o.x + o.width * 0.6 &&
                        n.y < o.y + o.height &&
                        n.y + n.height > o.y,
                    )
                    .map((n) => n.x - o.x - 5),
                ),
              ),
              height: o.size * 1.25,
              size: o.size,
              color: o.color,
              font:
                o.font === "Times-Roman"
                  ? "PrismaSerif"
                  : o.font === "Courier"
                    ? "PrismaMono"
                    : "PrismaSans",
              bold: o.bold,
              italic: o.italic,
              text: o.text,
              viewRotation: 0,
            }));
            return {
              ...p,
              sourceId: id,
              textReady: true,
              originalText: info.objects.map((o, i) => ({
                mark: marks[i],
                rect: [
                  o.x + 0.01,
                  (o.baseline ?? o.y + o.size) - o.size * 0.65,
                  o.x + Math.max(0.1, o.width) - 0.01,
                  (o.baseline ?? o.y + o.size) - o.size * 0.15,
                ] as [number, number, number, number],
              })),
              marks: [...p.marks, ...marks],
            };
          }),
        };
      }
      commit(current);
      setTool("edit");
      inform(
        "Todo el texto disponible está listo: escribe directamente en cualquier línea.",
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function flexibleDocument() {
    if (busy) return;
    if (state.current.flow) {
      setView("write");
      return;
    }
    setBusy("Organizando el PDF como documento editable…");
    try {
      const content: RichNode[] = [];
      for (const page of state.current.pages) {
        const source = state.current.sources.find(
          (s) => s.id === page.sourceId,
        )!;
        const info = (await runNative({
          action: "inspect",
          bytes: source.bytes,
          index: page.index,
        })) as Inspection;
        for (const o of info.objects) {
          if (o.kind === "text" && o.text)
            content.push({
              type: "paragraph",
              attrs: { id: uid() },
              content: [
                {
                  type: "text",
                  text: o.text,
                  marks: [
                    ...(o.bold ? [{ type: "bold" }] : []),
                    ...(o.italic ? [{ type: "italic" }] : []),
                    {
                      type: "textStyle",
                      attrs: {
                        fontFamily:
                          o.font === "Times-Roman"
                            ? "PrismaSerif"
                            : "PrismaSans",
                        fontSize: o.size + "pt",
                        color: o.color,
                      },
                    },
                  ],
                },
              ],
            });
          else if (o.kind === "image" && o.data)
            content.push({
              type: "image",
              attrs: { id: uid(), src: o.data, width: o.width / 0.75 },
            });
        }
        for (const mark of page.marks) {
          if (mark.type === "text")
            content.push(
              ...(mark.richText?.content ?? [
                {
                  type: "paragraph",
                  content: mark.text ? [{ type: "text", text: mark.text }] : [],
                },
              ]),
            );
          else if (mark.type === "image" || mark.type === "signature")
            content.push({
              type: "image",
              attrs: { id: mark.id, src: mark.data, width: mark.width / 0.75 },
            });
        }
        content.push({ type: "pageBreak" });
      }
      content.pop();
      const flow = {
        content: normalizeAcademicDocument(
          {
            type: "doc",
            content: content.length ? content : [{ type: "paragraph" }],
          },
          [],
          "free",
        ),
        layout: state.current.layout ?? defaultLayout(),
        academicStyle: "free" as const,
        references: [],
      };
      commit({ ...state.current, flow });
      setView("write");
      clear();
      inform(
        "Escritura flexible activa. Revisa el orden y los saltos antes de aplicar un estilo académico.",
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function updateDocumentLayout(next: PageLayout, sectionId?: string) {
    validateLayout(next);
    if (
      !Number.isFinite(next.left) ||
      !Number.isFinite(next.right) ||
      !Number.isFinite(next.top) ||
      !Number.isFinite(next.bottom) ||
      [next.left, next.right, next.top, next.bottom].some(
        (n) => n < 0 || n > 100,
      )
    )
      throw new Error("Los márgenes deben estar entre 0 y 100 mm.");
    const [w, h] = pageSize(next);
    if (
      w - ((next.left + next.right) * 72) / 25.4 < 80 ||
      h - ((next.top + next.bottom) * 72) / 25.4 < 100
    )
      throw new Error("Reduce los márgenes para dejar espacio al contenido.");
    if (state.current.flow) {
      const flow = state.current.flow,
        section =
          sectionId === undefined
            ? selectedSection(rich, flow.layout)
            : (documentSections(flow.content, flow.layout).find(
                (s) => s.id === sectionId,
              ) ?? documentSections(flow.content, flow.layout)[0]);
      const headerKeys = [
        "header",
        "footer",
        "headerFirst",
        "footerFirst",
        "headerEven",
        "footerEven",
        "differentFirst",
        "oddEven",
      ] as const;
      const changedHeaders = headerKeys.some(
        (key) => section.layout[key] !== next[key],
      );
      commit({
        ...state.current,
        flow: section.id
          ? {
              ...flow,
              content: changeSection(flow.content, section.id, {
                layout: next,
                ...(changedHeaders ? { linkToPrevious: false } : {}),
              }),
            }
          : { ...flow, layout: next },
      });
    } else {
      setBusy("Aplicando diseño…");
      try {
        const current = state.current.layout;
        const geometry =
          JSON.stringify({ ...next, watermark: undefined }) !==
          JSON.stringify({ ...current, watermark: undefined });
        const changed = geometry
          ? await fitPdfToLayout(state.current, next)
          : state.current;
        commit({ ...changed, layout: next });
      } finally {
        setBusy("");
      }
    }
    setLayout(next);
  }
  function select(id: string, edit = false) {
    if (edit && editing !== id)
      setHistory((h) => ({
        past: [...h.past, state.current].slice(-30),
        future: [],
      }));
    setSelectedId(id);
    setEditing(edit ? id : "");
    if (!edit) setEditor(null);
  }
  function place(p: Page, x: number, y: number) {
    let m: Mark = {
      id: uid(),
      type: "text",
      x,
      y,
      width: 220,
      height: size * 1.3,
      color,
      size: Math.max(8, size),
      font,
      viewRotation: p.rotation,
    };
    if (tool === "text") {
      m.text = "";
      addMarks(p.id, [m]);
      select(m.id, true);
      setTool("select");
    } else if (pending) {
      m = {
        ...m,
        type: pending.type,
        data: pending.data,
        width: 180,
        height: 180 / pending.ratio,
      };
      addMarks(p.id, [m]);
      select(m.id);
      setPending(undefined);
      setTool("select");
    }
  }
  async function promote(p: Page, o: NativeObject) {
    if (busy) return;
    const s = state.current.sources.find((s) => s.id === p.sourceId);
    if (!s) return;
    setBusy(
      o.kind === "text" ? "Preparando texto editable…" : "Preparando imagen…",
    );
    try {
      const viewport = (
        await (await getPdf(s)).getPage(p.index + 1)
      ).getViewport({ scale: 1 });
      const bytes = (await runNative({
          action: "remove",
          bytes: s.bytes,
          index: p.index,
          objectId: o.id,
        })) as Uint8Array,
        id = uid(),
        m: Mark = {
          id: uid(),
          type: o.kind === "text" ? "text" : "image",
          x: o.x,
          y: o.kind === "text" ? (o.baseline ?? o.y + o.size) - o.size : o.y,
          width:
            o.kind === "text"
              ? Math.max(o.width, viewport.width - o.x - 40)
              : o.width,
          height: o.kind === "text" ? o.size * 1.3 : o.height,
          size: o.size || 12,
          color: o.color,
          font:
            o.font === "Helvetica"
              ? "PrismaSans"
              : o.font === "Times-Roman"
                ? "PrismaSerif"
                : "PrismaMono",
          bold: o.bold,
          italic: o.italic,
          text: o.text,
          data: o.data,
          viewRotation: 0,
        };
      commit({
        ...state.current,
        sources: [...state.current.sources, { id, name: s.name, bytes }],
        pages: state.current.pages.map((a) =>
          a.id === p.id
            ? { ...a, sourceId: id, index: 0, marks: [...a.marks, m] }
            : a,
        ),
      });
      setActiveId(p.id);
      setTool("select");
      select(m.id, o.kind === "text");
      setFont(m.font!);
      setSize(m.size);
      setColor(m.color);
      inform(
        o.kind === "text"
          ? "Escribe directamente sobre el documento."
          : "Arrastra la imagen o su esquina para cambiar el tamaño.",
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function redact(p: Page, r: [number, number, number, number]) {
    setBusy("Eliminando contenido…");
    try {
      const s = state.current.sources.find((s) => s.id === p.sourceId)!,
        pg = await (await getPdf(s)).getPage(p.index + 1),
        v = pg.getViewport({
          scale: 1,
          rotation: rotation(pg.rotate + p.rotation),
        }),
        a = turnPoint(r[0], r[1], v.width, v.height, rotation(-p.rotation)),
        b = turnPoint(r[2], r[3], v.width, v.height, rotation(-p.rotation));
      const rect: [number, number, number, number] = [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.max(a[0], b[0]),
          Math.max(a[1], b[1]),
        ],
        bytes = (await runNative({
          action: "redact",
          bytes: s.bytes,
          index: p.index,
          rect,
        })) as Uint8Array,
        id = uid();
      const marks = p.marks.filter((m) => {
        const delta = rotation(p.rotation - m.viewRotation),
          [bw, bh] = delta % 180 ? [v.height, v.width] : [v.width, v.height],
          a = turnPoint(m.x, m.y, bw, bh, delta),
          b = turnPoint(m.x + m.width, m.y + m.height, bw, bh, delta);
        return (
          Math.max(a[0], b[0]) < r[0] ||
          Math.min(a[0], b[0]) > r[2] ||
          Math.max(a[1], b[1]) < r[1] ||
          Math.min(a[1], b[1]) > r[3]
        );
      });
      commit({
        ...state.current,
        sources: [...state.current.sources, { id, name: s.name, bytes }],
        pages: state.current.pages.map((a) =>
          a.id === p.id ? { ...a, sourceId: id, index: 0, marks } : a,
        ),
      });
      inform("Contenido eliminado. Revisa el resultado antes de compartirlo.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  function removeSelected() {
    commit({
      ...state.current,
      pages: state.current.pages.map((p) => ({
        ...p,
        marks: p.marks.filter((m) => m.id !== selectedId),
      })),
    });
    clear();
  }
  function format(cmd: string, value?: string) {
    if (rich) {
      const c = rich.chain().focus();
      switch (cmd) {
        case "bold":
          c.toggleBold().run();
          break;
        case "italic":
          c.toggleItalic().run();
          break;
        case "underline":
          c.toggleUnderline().run();
          break;
        case "strike":
          c.toggleStrike().run();
          break;
        case "font":
          c.setFontFamily(value!).run();
          setFont(value!);
          break;
        case "size":
          c.setFontSize(value + "pt").run();
          setSize(Number(value));
          break;
        case "color":
          c.setColor(value!).run();
          setColor(value!);
          break;
        case "highlight":
          c.setBackgroundColor(value ?? "#ffdf64").run();
          break;
        case "align":
          c.setTextAlign(value!).run();
          break;
        case "bullet":
          c.toggleBulletList().run();
          break;
        case "ordered":
          c.toggleOrderedList().run();
          break;
        case "heading":
          value === "0"
            ? c.setParagraph().run()
            : c.toggleHeading({ level: Number(value) as 1 | 2 | 3 }).run();
          break;
        case "spacing":
          c.updateAttributes(
            rich.isActive("heading") ? "heading" : "paragraph",
            { lineHeight: value },
          ).run();
          break;
        case "superscript":
          c.toggleSuperscript().run();
          break;
        case "subscript":
          c.toggleSubscript().run();
          break;
        case "clear":
          c.unsetAllMarks().clearNodes().run();
          break;
        case "indent":
        case "outdent": {
          const t = rich.isActive("heading") ? "heading" : "paragraph",
            i = Number(rich.getAttributes(t).indent) || 0;
          c.updateAttributes(t, {
            indent: Math.max(0, Math.min(8, i + (cmd === "indent" ? 1 : -1))),
          }).run();
          break;
        }
      }
      setTick((v) => v + 1);
      return;
    }
    if (cmd === "font") setFont(value!);
    if (cmd === "size") setSize(Number(value));
    if (cmd === "color") setColor(value!);
    if (!selected) return;
    if (selected.richText) {
      for (const p of workspace.pages)
        if (p.marks.some((m) => m.id === selectedId))
          changeMark(p.id, {
            ...selected,
            richText: formatRichNode(selected.richText, cmd, value),
          });
      return;
    }
    const patch: Partial<Mark> =
      cmd === "font"
        ? { font: value }
        : cmd === "size"
          ? { size: Number(value) }
          : cmd === "color"
            ? { color: value }
            : cmd === "bold"
              ? { bold: !selected.bold }
              : cmd === "italic"
                ? { italic: !selected.italic }
                : cmd === "underline"
                  ? { underline: !selected.underline }
                  : cmd === "strike"
                    ? { strike: !selected.strike }
                    : cmd === "align"
                      ? { align: value }
                      : cmd === "spacing"
                        ? { lineHeight: Number(value) }
                        : {};
    for (const p of workspace.pages)
      if (p.marks.some((m) => m.id === selectedId))
        changeMark(p.id, { ...selected, ...patch });
  }
  function beginExport() {
    setExportName(workspace.name);
    setScope("all");
    setDialog("export");
  }
  async function exportPdf() {
    setBusy("Preparando PDF…");
    try {
      if (["docx", "html", "md", "txt"].includes(exportFormat)) {
        const [{ documentForExport }, exporter] = await Promise.all([
          import("./export-source"),
          import("./document-export"),
        ]);
        const flow = await documentForExport(state.current),
          name = safeName(exportName),
          mime =
            exportFormat === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : exportFormat === "html"
                ? "text/html;charset=utf-8"
                : exportFormat === "md"
                  ? "text/markdown;charset=utf-8"
                  : "text/plain;charset=utf-8";
        setBusy("Preparando " + exportFormat.toUpperCase() + "…");
        const bytes =
          exportFormat === "docx"
            ? await exporter.exportDocx(flow, name, state.current.fonts)
            : exportFormat === "html"
              ? await exporter.exportHtml(flow, name, state.current.fonts)
              : exportFormat === "md"
                ? exporter.exportMarkdown(flow)
                : new TextEncoder().encode(academicPlainText(flow.content));
        await download(bytes, name + "." + exportFormat, mime);
        setDialog(null);
        inform("Documento exportado como " + exportFormat.toUpperCase() + ".");
        return;
      }
      const ids =
        scope === "current" && active
          ? [active.id]
          : scope === "range"
            ? pageRange(range, state.current.pages.length).map(
                (i) => state.current.pages[i].id,
              )
            : undefined;
      let bytes = await buildPdf(state.current, ids);
      if (exportFormat === "png") {
        const { exportPageImages } = await import("./image-export"),
          result = await exportPageImages(
            bytes,
            state.current.sources.map((s) => s.id),
          );
        await download(
          result.bytes,
          safeName(exportName) + "." + result.extension,
          result.mime,
        );
        setDialog(null);
        inform("Imágenes exportadas.");
        return;
      }
      if (compress)
        bytes = (await runNative({
          action: "compress",
          bytes,
          index: 0,
        })) as Uint8Array;
      await download(bytes, safeName(exportName) + ".pdf");
      setDialog(null);
      inform("PDF guardado con tus cambios.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function beginPrint() {
    setBusy("Preparando impresión…");
    try {
      const bytes = await buildPdf(state.current);
      printBytes.current = bytes;
      setPrintCount((await PDFDocument.load(bytes)).getPageCount());
      setPrintScope("all");
      setPrintPages(await preparePrint(bytes, true));
      setDialog("print");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function print() {
    setBusy("Abriendo impresión…");
    try {
      let bytes = printBytes.current,
        count = printCount;
      if (printScope === "range") {
        const indices = pageRange(printRange, printCount),
          source = await PDFDocument.load(bytes),
          result = await PDFDocument.create();
        for (const page of await result.copyPages(source, indices))
          result.addPage(page);
        bytes = await result.save();
        count = indices.length;
      }
      await printDocument(bytes, printPages, state.current.name, count);
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function applyLayout() {
    setBusy("Aplicando diseño…");
    try {
      if (state.current.flow)
        commit({ ...state.current, flow: { ...state.current.flow, layout } });
      else commit(await fitPdfToLayout(state.current, layout));
      setDialog(null);
      inform("Diseño y márgenes actualizados.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  async function blank(placement = "below") {
    if (state.current.flow) {
      const flow = state.current.flow,
        block =
          writing && rich
            ? rich.state.selection.$from.depth
              ? rich.state.selection.$from.node(1)
              : rich.state.doc.nodeAt(rich.state.selection.from)
            : undefined,
        page =
          Number(block?.attrs.page) ||
          flow.pageMap?.[String(block?.attrs.id)] ||
          Math.max(1, workspace.pages.indexOf(active) + 1);
      const content = insertBlankPage(
        flow.content,
        page,
        placement,
        flow.pageMap,
      );
      commit({
        ...state.current,
        flow: {
          ...flow,
          content: normalizeAcademicDocument(
            content,
            flow.references ?? [],
            flow.academicStyle ?? "free",
          ),
        },
      });
      return;
    }
    setBusy("Añadiendo página…");
    try {
      const current = state.current,
        source = current.sources.find((s) => s.id === active?.sourceId),
        pageLayout = current.layout ?? layout;
      let bytes: Uint8Array;
      if (source && active) {
        const info = (await runNative({
          action: "watermarks",
          bytes: source.bytes,
          index: active.index,
        })) as Inspection;
        bytes = await blankWithWatermarks(
          source.bytes,
          active.index,
          pageLayout,
          watermarkCandidate(info.objects, info.width, info.height),
        );
      } else {
        const d = await PDFDocument.create();
        d.addPage(pageSize(pageLayout));
        bytes = await d.save();
      }
      const next = await appendPdf(current, bytes, "Página nueva.pdf");
      const added = next.pages.at(-1)!,
        pages = next.pages.slice(0, -1),
        at = pages.findIndex((p) => p.id === active?.id);
      pages.splice(
        placement === "end"
          ? pages.length
          : Math.max(0, at + (placement === "above" ? 0 : 1)),
        0,
        added,
      );
      commit({ ...next, pages, name: state.current.name });
      setActiveId(added.id);
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  function pageAction(cmd: string) {
    if (!active || workspace.flow) return;
    const pages = [...workspace.pages],
      i = pages.indexOf(active);
    if (cmd === "rotate")
      pages[i] = { ...active, rotation: rotation(active.rotation + 90) };
    if (cmd === "copy")
      pages.splice(i + 1, 0, {
        ...active,
        id: uid(),
        marks: active.marks.map((m) => ({ ...m, id: uid() })),
      });
    if (cmd === "delete") {
      if (pages.length < 2) return;
      pages.splice(i, 1);
      setActiveId(pages[Math.min(i, pages.length - 1)].id);
    }
    if (cmd === "up" && i > 0)
      [pages[i], pages[i - 1]] = [pages[i - 1], pages[i]];
    if (cmd === "down" && i < pages.length - 1)
      [pages[i], pages[i + 1]] = [pages[i + 1], pages[i]];
    commit({ ...workspace, pages });
  }
  async function imagesToPdf(files: FileList | null) {
    if (!files?.length) return;
    setBusy("Creando PDF de imágenes…");
    try {
      const d = await PDFDocument.create();
      for (const f of Array.from(files)) {
        const a = await normalizeImage(f),
          img = await d.embedPng(a.data),
          w = Math.min(img.width, 595),
          h = w / a.ratio;
        d.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
      }
      commit(await appendPdf(state.current, await d.save(), "Imágenes.pdf"));
      setView("pdf");
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
      if (imagesInput.current) imagesInput.current.value = "";
    }
  }
  async function numbering() {
    if (workspace.flow) {
      commit({
        ...workspace,
        flow: {
          ...workspace.flow,
          layout: {
            ...workspace.flow.layout,
            numbering: !workspace.flow.layout.numbering,
          },
        },
      });
      return;
    }
    setBusy("Numerando páginas…");
    try {
      const pages: Page[] = [];
      for (const [i, p] of workspace.pages.entries()) {
        const s = workspace.sources.find((s) => s.id === p.sourceId)!,
          pg = await (await getPdf(s)).getPage(p.index + 1),
          v = pg.getViewport({
            scale: 1,
            rotation: rotation(pg.rotate + p.rotation),
          });
        pages.push({
          ...p,
          marks: [
            ...p.marks,
            {
              id: uid(),
              type: "text",
              x: v.width - 78,
              y: v.height - 32,
              width: 62,
              height: 15,
              size: 9,
              color: "#74788b",
              font: "PrismaSans",
              text: `${i + 1} / ${workspace.pages.length}`,
              viewRotation: p.rotation,
            },
          ],
        });
      }
      commit({ ...workspace, pages });
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  }
  function trackPage() {
    if (!stage.current) return;
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      if (!stage.current) return;
      if (writing) {
        const paper = stage.current.querySelector<HTMLElement>(".paged-paper");
        if (!paper) return;
        const rect = paper.getBoundingClientRect();
        const scale = rect.width / paper.offsetWidth;
        const stride = ((pageSize(currentLayout)[1] * 4) / 3 + 28) * scale;
        setWritingActivePage(
          Math.max(
            0,
            Math.min(
              writingPages - 1,
              Math.floor(
                (stage.current.getBoundingClientRect().top + 80 - rect.top) /
                  stride,
              ),
            ),
          ),
        );
        return;
      }
      const top = stage.current.getBoundingClientRect().top + 80;
      let closest: HTMLElement | null = null;
      let distance = Infinity;
      for (const el of stage.current.querySelectorAll<HTMLElement>(
        ".page-section",
      )) {
        const rect = el.getBoundingClientRect();
        const d =
          rect.top <= top && rect.bottom > top ? 0 : Math.abs(rect.top - top);
        if (d < distance) {
          distance = d;
          closest = el;
        }
      }
      if (closest) setActiveId(closest.id.slice(5));
    });
  }
  const rw = fit
      ? Math.min(800, Math.max(240, stageWidth - 72))
      : (595.28 * zoom) / 100,
    sf =
      rich?.getAttributes("textStyle").fontFamily ??
      rich?.getAttributes(rich.isActive("heading") ? "heading" : "paragraph")
        .fontFamily ??
      selected?.font ??
      font,
    ss =
      parseFloat(rich?.getAttributes("textStyle").fontSize ?? "") ||
      Number(
        rich?.getAttributes(rich.isActive("heading") ? "heading" : "paragraph")
          .fontSize,
      ) ||
      selected?.size ||
      size;
  const currentSection = workspace.flow
    ? selectedSection(rich, workspace.flow.layout)
    : null;
  const currentLayout = currentSection?.layout ?? workspace.layout ?? layout;
  const icon = (
    label: string,
    Icon: React.ComponentType<{ size?: number }>,
    fn: () => void,
    disabled = false,
    on = false,
  ) => (
    <Button
      title={label}
      disabled={disabled}
      className={on ? "active" : ""}
      onClick={fn}
    >
      <Icon size={17} />
    </Button>
  );
  return (
    <div
      className={
        (home ? "app home-app" : "app studio-app") +
        (product.writer ? " writer-app" : "")
      }
    >
      {pdfWorkbench&&<PdfWorkbench getBytes={()=>buildPdf(state.current)} onClose={()=>setPdfWorkbench(false)} onApply={async bytes=>{const next=await appendPdf(emptyWorkspace(),bytes,state.current.name+'.pdf');commit({...next,name:state.current.name,fonts:state.current.fonts});setView('pdf');inform('Transformación aplicada. Puedes deshacerla.');}}/>}
      {ocrOpen&&<OcrDialog getBytes={()=>buildPdf(state.current)} onClose={()=>setOcrOpen(false)} onApply={async bytes=>{const next=await appendPdf(emptyWorkspace(),bytes,state.current.name+'.pdf');commit({...next,name:state.current.name,fonts:state.current.fonts});setView('pdf');inform('Capa OCR aplicada al PDF.');}} onText={async text=>{const {importText}=await import('./document-import');const flow=importText(text);commit({...state.current,flow});setView('write');inform('Texto OCR preparado para editar. Revisa el formato y la ortografía.');}}/>}
      <input
        ref={openInput}
        hidden
        type="file"
        accept=".pdf,.docx,.txt,.prisma,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        onChange={(e) => void openFiles(e.target.files)}
      />
      <input
        ref={mergeInput}
        hidden
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={(e) => void openFiles(e.target.files, true)}
      />
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => void loadImage(e.target.files?.[0])}
      />
      <input
        ref={imagesInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(e) => void imagesToPdf(e.target.files)}
      />
      {home ? (
        <>
          <header className="home-header">
            <a href="#" className="brand" onClick={(e) => e.preventDefault()}>
              <img src="./logo.svg" alt={product.name} />
              <span>
                Prisma <b>{product.writer ? "Writer" : "PDF"}</b>
              </span>
            </a>
            <div>
              <span className="private-badge">
                <LockKeyhole size={14} />
                100 % local
              </span>
              <InstallApp />
              <Updates
                beforeReload={() => saveSession(state.current)}
                onError={fail}
              />
            </div>
          </header>
          <main className="home-main">
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="live-dot" /> UN ESPACIO PARA TUS IDEAS
                </span>
                <h1>
                  {product.writer ? "Tus palabras." : "De documento"}
                  <br />
                  {product.writer ? (
                    <span>Tu próxima idea.</span>
                  ) : (
                    <>
                      a <span>posibilidad.</span>
                    </>
                  )}
                </h1>
                <p>
                  {product.writer
                    ? "Un espacio para escribir, dar formato y presentar tus trabajos. Abre documentos de Word y guarda todo en tu dispositivo."
                    : "Escribe desde cero, transforma tus PDF y continúa cuando quieras. Tu trabajo se queda contigo."}
                </p>
                <div className="hero-actions">
                  <Button
                    className="primary"
                    onClick={() => void newDocument()}
                  >
                    <Plus size={19} />
                    Crear documento
                    <ArrowRight size={18} />
                  </Button>
                  <Button onClick={() => openInput.current?.click()}>
                    <FolderOpen size={18} />
                    {product.writer
                      ? "Abrir documento"
                      : "Abrir PDF o documento"}
                  </Button>
                </div>
                <div className="hero-trust">
                  <ShieldCheck size={17} />
                  <span>Sin cuentas. Sin subir tus archivos.</span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orb orb-one" />
                <div className="orb orb-two" />
                <div className="floating-doc">
                  <div className="doc-brand">
                    <img src="./logo.svg" />
                    <span>PRISMA STUDIO</span>
                    <span>01</span>
                  </div>
                  <div className="art-pill">IDEAS QUE TOMAN FORMA</div>
                  <h3>
                    Todo empieza
                    <br />
                    con una página.
                  </h3>
                  <div className="art-line long" />
                  <div className="art-line" />
                  <div className="art-highlight">
                    Tu próxima gran idea, aquí.
                  </div>
                  <div className="art-columns">
                    <div />
                    <div />
                    <div />
                  </div>
                  <div className="art-footer">
                    CREADO POR TI <Sparkles size={16} />
                  </div>
                </div>
                <div className="floating-chip chip-one">
                  <Type size={17} />
                  Diseña cada palabra
                </div>
                <div className="floating-chip chip-two">
                  <Check size={17} />
                  Solo en tu dispositivo
                </div>
                <div className="floating-cursor">
                  <MousePointer2 size={26} />
                  <span>Tú</span>
                </div>
              </div>
            </section>
            <section className="start-grid">
              <Button className="start-card" onClick={() => void newDocument()}>
                <div className="card-icon violet">
                  <FilePlus2 />
                </div>
                <div>
                  <h3>Una página en blanco</h3>
                  <p>Texto, tablas, imágenes y tu estilo.</p>
                </div>
                <ArrowRight size={18} />
              </Button>
              <Button
                className="start-card"
                onClick={() => openInput.current?.click()}
              >
                <div className="card-icon blue">
                  <ScanText />
                </div>
                <div>
                  <h3>
                    {product.writer
                      ? "Continúa un documento de Word"
                      : "Dale otra vida a un PDF"}
                  </h3>
                  <p>
                    {product.writer
                      ? "Importa DOCX y exporta a Word o PDF."
                      : "Edita palabras y mueve imágenes."}
                  </p>
                </div>
                <ArrowRight size={18} />
              </Button>
              <Button
                className="start-card"
                disabled={!last}
                onClick={() => last && void enter(last)}
              >
                <div className="card-icon rose">
                  <BookOpen />
                </div>
                <div>
                  <h3>Continúa donde quedaste</h3>
                  <p>{last?.name ?? "Tu última sesión aparecerá aquí."}</p>
                </div>
                <ArrowRight size={18} />
              </Button>
            </section>
            <section className="project-library">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">TU BIBLIOTECA LOCAL</span>
                  <h2>Trabajo que sigue contigo.</h2>
                </div>
                <Button
                  onClick={() =>
                    void (product.writer
                      ? enter({
                          ...emptyWorkspace(),
                          name: "Mi primer documento",
                          flow: writerExample(),
                        })
                      : demoWorkspace().then(enter))
                  }
                >
                  <Sparkles size={16} />
                  Explorar un ejemplo
                </Button>
              </div>
              {projects.length ? (
                <div className="project-grid">
                  {projects.map((p) => (
                    <article className="project-card" key={p.id}>
                      <Button
                        className="project-open"
                        onClick={() => {
                          setBusy("Abriendo proyecto…");
                          void loadProject(p.id)
                            .then(enter)
                            .catch(fail)
                            .finally(() => setBusy(""));
                        }}
                      >
                        <FileText size={32} />
                        <h3>{p.name}</h3>
                        <p>
                          {p.pageCount} páginas ·{" "}
                          {new Date(p.updatedAt).toLocaleDateString("es-CO")}
                        </p>
                      </Button>
                      <Button
                        title={"Eliminar proyecto " + p.name}
                        onClick={() =>
                          void deleteProject(p.id).then(refresh).catch(fail)
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="library-empty">
                  <Layers3 size={25} />
                  <p>
                    Guarda un proyecto desde el editor para verlo aquí.
                    <small>
                      También puedes llevarte una copia .prisma y abrirla en
                      otro dispositivo.
                    </small>
                  </p>
                </div>
              )}
            </section>
          </main>
          <footer className="home-footer">
            <span>
              {product.name} {product.version} · Hecho para crear.
            </span>
            <a
              href={
                product.writer
                  ? "https://oscard0823.github.io/prisma-pdf/"
                  : "https://oscard0823.github.io/prisma-pdf/writer/"
              }
            >
              {product.writer ? "Abrir Prisma PDF" : "Abrir Prisma Writer"}{" "}
              <ArrowRight size={13} />
            </a>
            <a
              href="https://github.com/OscarD0823/prisma-pdf"
              target="_blank"
              rel="noreferrer"
            >
              Código abierto
              <ArrowRight size={13} />
            </a>
            <a href="https://oscard0823.github.io/prisma-pdf/sheets/">
              Abrir Prisma Sheets <ArrowRight size={13} />
            </a>
          </footer>
        </>
      ) : (
        <>
          <header className="editor-header">
            <div className="editor-identity">
              <Button
                title="Volver al inicio"
                onClick={() => {
                  void saveSession(state.current).catch(fail);
                  setLast(state.current);
                  setHome(true);
                  clear();
                  void refresh();
                }}
              >
                <img src="./logo.svg" alt={product.name} />
              </Button>
              <div>
                <input
                  aria-label="Nombre del documento"
                  value={workspace.name}
                  onChange={(e) =>
                    commit({ ...workspace, name: e.target.value }, false)
                  }
                />
                <span>
                  <Check size={12} />
                  {saved}
                </span>
              </div>
            </div>
            <div className="header-actions">
              {icon("Deshacer", Undo2, undo)}
              {icon("Rehacer", Redo2, redo)}
              <span className="header-divider" />
              {icon("Guardar proyecto", Save, () => void saveNamed())}
              {icon("Imprimir", Printer, () => void beginPrint())}
              <InstallApp />
              <Updates
                beforeReload={() => saveSession(state.current)}
                onError={fail}
              />
              <Button
                title="Exportar documento"
                className="primary"
                onClick={beginExport}
              >
                <Download size={16} />
                <span>Exportar</span>
              </Button>
            </div>
          </header>
          <nav className="ribbon-tabs">
            <div>
              {[
                "Inicio",
                "Insertar",
                "Diseño",
                "Referencias",
                "Revisar",
                "Vista",
                "Páginas",
                ...(["image", "equation", "chart", "shape", "video"].some(
                  (type) => rich?.isActive(type),
                ) || selected?.type === "image"
                  ? ["Formato de imagen"]
                  : []),
                ...(rich?.isActive("table") ? ["Diseño de tabla"] : []),
              ].map((t) => (
                <Button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            <div>
              {workspace.flow && (
                <div className="view-switch">
                  <Button
                    className={view === "write" ? "active" : ""}
                    onClick={() => {
                      setView("write");
                      if (
                        ["Formato de imagen", "Diseño de tabla"].includes(tab)
                      )
                        setTab("Inicio");
                      clear();
                    }}
                  >
                    Escribir
                  </Button>
                  <Button
                    className={view === "pdf" ? "active" : ""}
                    onClick={() => {
                      setView("pdf");
                      if (
                        ["Formato de imagen", "Diseño de tabla"].includes(tab)
                      )
                        setTab("Inicio");
                      clear();
                    }}
                  >
                    Vista PDF
                  </Button>
                </div>
              )}
              <span className="privacy-label">
                <LockKeyhole size={12} />
                Tus archivos no salen de aquí
              </span>
            </div>
          </nav>
          <div
            className="ribbon"
            role="toolbar"
            aria-label="Herramientas del documento"
            data-format-tick={tick}
            data-tab={tab}
          >
            {["Inicio", "Insertar", "Diseño", "Páginas"].includes(tab) &&
              (tab === "Inicio" ? (
                <>
                  {!workspace.flow && (
                    <div className="ribbon-group tools-group">
                      <div className="tool-buttons">
                        {tools.map((t) => (
                          <Button
                            key={t.id}
                            title={t.label}
                            className={tool === t.id ? "active" : ""}
                            onClick={() => choose(t.id)}
                          >
                            <t.icon size={20} />
                            <span>{t.label}</span>
                          </Button>
                        ))}
                      </div>
                      <small>Editar documento</small>
                    </div>
                  )}
                  <div className="ribbon-group font-group">
                    <div className="ribbon-row">
                      <FontPicker
                        value={sf}
                        fonts={workspace.fonts}
                        onChange={(value) => format("font", value)}
                        onAcademicFont={(value, points) => {
                          if (rich && !rich.isDestroyed) {
                            rich
                              .chain()
                              .focus()
                              .setFontFamily(value)
                              .setFontSize(points + "pt")
                              .run();
                            setFont(value);
                            setSize(points);
                            setTick((v) => v + 1);
                          } else {
                            setFont(value);
                            setSize(points);
                            if (selected)
                              for (const page of workspace.pages)
                                if (page.marks.some((m) => m.id === selectedId))
                                  changeMark(page.id, {
                                    ...selected,
                                    font: value,
                                    size: points,
                                    richText: selected.richText
                                      ? formatRichNode(
                                          formatRichNode(
                                            selected.richText,
                                            "font",
                                            value,
                                          ),
                                          "size",
                                          String(points),
                                        )
                                      : undefined,
                                  });
                          }
                        }}
                        onImport={importFonts}
                        onError={fail}
                      />
                      <input
                        aria-label="Tamaño de letra"
                        type="number"
                        min="6"
                        max="144"
                        key={ss}
                        defaultValue={ss}
                        onBlur={(e) =>
                          format(
                            "size",
                            String(
                              Math.max(
                                6,
                                Math.min(144, Number(e.target.value) || 12),
                              ),
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="ribbon-row">
                      {icon(
                        "Negrita",
                        Bold,
                        () => format("bold"),
                        false,
                        rich?.isActive("bold") ??
                          (selected?.richText
                            ? hasRichMark(selected.richText, "bold")
                            : selected?.bold),
                      )}
                      {icon(
                        "Cursiva",
                        Italic,
                        () => format("italic"),
                        false,
                        rich?.isActive("italic") ??
                          (selected?.richText
                            ? hasRichMark(selected.richText, "italic")
                            : selected?.italic),
                      )}
                      {icon(
                        "Subrayado",
                        Underline,
                        () => format("underline"),
                        false,
                        rich?.isActive("underline") ??
                          (selected?.richText
                            ? hasRichMark(selected.richText, "underline")
                            : selected?.underline),
                      )}
                      {icon(
                        "Tachado",
                        Strikethrough,
                        () => format("strike"),
                        false,
                        rich?.isActive("strike") ??
                          (selected?.richText
                            ? hasRichMark(selected.richText, "strike")
                            : selected?.strike),
                      )}
                      <label className="color-control">
                        <span>A</span>
                        <input
                          aria-label="Color de texto"
                          type="color"
                          value={color}
                          onChange={(e) => format("color", e.target.value)}
                        />
                      </label>
                      {icon("Color de resaltado", Highlighter, () =>
                        rich ? format("highlight") : choose("highlight"),
                      )}
                    </div>
                    <small>Tipografía</small>
                  </div>
                  <div className="ribbon-group paragraph-group">
                    <div className="ribbon-row">
                      {icon("Alinear izquierda", AlignLeft, () =>
                        format("align", "left"),
                      )}
                      {icon("Centrar", AlignCenter, () =>
                        format("align", "center"),
                      )}
                      {icon("Alinear derecha", AlignRight, () =>
                        format("align", "right"),
                      )}
                      {icon("Justificar", AlignJustify, () =>
                        format("align", "justify"),
                      )}
                      {icon(
                        "Lista con viñetas",
                        List,
                        () => format("bullet"),
                        !rich || !writing,
                      )}
                      {icon(
                        "Lista numerada",
                        ListOrdered,
                        () => format("ordered"),
                        !rich || !writing,
                      )}
                    </div>
                    <div className="ribbon-row">
                      {icon(
                        "Reducir sangría",
                        IndentDecrease,
                        () => format("outdent"),
                        !rich,
                      )}
                      {icon(
                        "Aumentar sangría",
                        IndentIncrease,
                        () => format("indent"),
                        !rich,
                      )}
                      <select
                        aria-label="Interlineado"
                        onChange={(e) => format("spacing", e.target.value)}
                        defaultValue="1.45"
                      >
                        {["1", "1.25", "1.45", "1.5", "2"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <small>Párrafo</small>
                  </div>
                  <div className="ribbon-group">
                    {!writing && (
                      <select
                        aria-label="Estilo de párrafo"
                        disabled={!rich || !writing}
                        onChange={(e) => format("heading", e.target.value)}
                        defaultValue="0"
                      >
                        <option value="0">Normal</option>
                        <option value="1">Título</option>
                        <option value="2">Subtítulo</option>
                        <option value="3">Encabezado</option>
                      </select>
                    )}
                    <div className="ribbon-row">
                      {icon(
                        "Superíndice",
                        Superscript,
                        () => format("superscript"),
                        !rich,
                      )}
                      {icon(
                        "Subíndice",
                        Subscript,
                        () => format("subscript"),
                        !rich,
                      )}
                      {icon(
                        "Borrar formato",
                        Eraser,
                        () => format("clear"),
                        !rich,
                      )}
                    </div>
                    <small>Efectos</small>
                  </div>
                </>
              ) : tab === "Insertar" ? (
                <>
                  <div className="ribbon-group">
                    <div className="large-tools">
                      <Button onClick={() => imageInput.current?.click()}>
                        <ImagePlus />
                        <span>Imagen</span>
                      </Button>
                      <Button onClick={() => setDialog("signature")}>
                        <PenLine />
                        <span>Firma</span>
                      </Button>
                      <Button
                        disabled={!rich || !writing}
                        onClick={() => setDialog("table")}
                      >
                        <Table2 />
                        <span>Tabla</span>
                      </Button>
                      <Button
                        disabled={!rich || !writing}
                        onClick={() => setDialog("link")}
                      >
                        <Link2 />
                        <span>Enlace</span>
                      </Button>
                    </div>
                    <small>Elementos</small>
                  </div>
                  {rich?.isActive("table") && (
                    <div className="ribbon-group">
                      <div className="ribbon-row">
                        <Button
                          onClick={() =>
                            rich.chain().focus().addRowAfter().run()
                          }
                        >
                          + Fila
                        </Button>
                        <Button
                          onClick={() =>
                            rich.chain().focus().addColumnAfter().run()
                          }
                        >
                          + Columna
                        </Button>
                        <Button
                          onClick={() =>
                            rich.chain().focus().mergeOrSplit().run()
                          }
                        >
                          Unir / separar
                        </Button>
                      </div>
                      <div className="ribbon-row">
                        <Button
                          onClick={() => rich.chain().focus().deleteRow().run()}
                        >
                          Quitar fila
                        </Button>
                        <Button
                          onClick={() =>
                            rich.chain().focus().deleteColumn().run()
                          }
                        >
                          Quitar columna
                        </Button>
                        <Button
                          onClick={() =>
                            rich.chain().focus().deleteTable().run()
                          }
                        >
                          Quitar tabla
                        </Button>
                      </div>
                      <small>Tabla seleccionada</small>
                    </div>
                  )}
                  {!workspace.flow && (
                    <div className="ribbon-group">
                      <div className="large-tools">
                        {[
                          {
                            id: "objects",
                            icon: ImagePlus,
                            label: "Imágenes originales",
                          },
                          {
                            id: "rectangle",
                            icon: Square,
                            label: "Rectángulo",
                          },
                          { id: "ellipse", icon: Circle, label: "Elipse" },
                          { id: "arrow", icon: ArrowRight, label: "Flecha" },
                          { id: "draw", icon: PenLine, label: "Dibujo" },
                          { id: "redact", icon: Eraser, label: "Borrar área" },
                        ].map((t) => (
                          <Button
                            key={t.id}
                            className={tool === t.id ? "active" : ""}
                            onClick={() => choose(t.id as Tool)}
                          >
                            <t.icon />
                            <span>{t.label}</span>
                          </Button>
                        ))}
                      </div>
                      <small>Objetos y formas</small>
                    </div>
                  )}
                </>
              ) : tab === "Diseño" ? (
                <>
                  <div className="ribbon-group">
                    <div className="large-tools">
                      <Button
                        onClick={() => {
                          setLayout(workspace.flow?.layout ?? layout);
                          setDialog("layout");
                        }}
                      >
                        <Maximize2 />
                        <span>Márgenes y tamaño</span>
                      </Button>
                      <Button
                        onClick={() => {
                          setLayout(workspace.flow?.layout ?? layout);
                          setDialog("layout");
                        }}
                      >
                        <FileText />
                        <span>Encabezado y pie</span>
                      </Button>
                      <Button onClick={() => void numbering()}>
                        <ListOrdered />
                        <span>Numeración</span>
                      </Button>
                    </div>
                    <small>Diseño de página</small>
                  </div>
                  <div className="ribbon-group">
                    <div className="palette">
                      {palette.map((c) => (
                        <button
                          key={c}
                          aria-label={"Usar color " + c}
                          style={{ background: c }}
                          onClick={() => {
                            setColor(c);
                            if (rich) format("color", c);
                          }}
                        />
                      ))}
                    </div>
                    <small>Colores del documento</small>
                  </div>
                  <p className="ribbon-note">
                    {workspace.flow
                      ? "El texto continúa en nuevas páginas según tus márgenes."
                      : "Los márgenes ajustan la página completa y conservan el diseño del PDF."}
                  </p>
                </>
              ) : (
                <>
                  <div className="ribbon-group">
                    <div className="large-tools">
                      <Button onClick={() => mergeInput.current?.click()}>
                        <Layers3 />
                        <span>Unir PDF</span>
                      </Button>
                      <Button onClick={()=>setPdfWorkbench(true)}><Sparkles/><span>Taller PDF</span></Button>
                      <Button onClick={()=>setOcrOpen(true)}><FileText/><span>Reconocer texto OCR</span></Button>
                      <Button
                        onClick={() => {
                          setScope("range");
                          setExportName(workspace.name);
                          setDialog("export");
                        }}
                      >
                        <Scissors />
                        <span>Extraer páginas</span>
                      </Button>
                      <Button
                        disabled={!!workspace.flow}
                        onClick={() => imagesInput.current?.click()}
                      >
                        <ImagePlus />
                        <span>Imágenes a PDF</span>
                      </Button>
                    </div>
                    <small>Organizar</small>
                  </div>
                  <div className="ribbon-group">
                    <div className="large-tools">
                      <Button
                        disabled={!!workspace.flow}
                        onClick={() => pageAction("rotate")}
                      >
                        <RotateCw />
                        <span>Girar</span>
                      </Button>
                      <Button
                        disabled={!!workspace.flow}
                        onClick={() => pageAction("copy")}
                      >
                        <Copy />
                        <span>Duplicar</span>
                      </Button>
                      <Button
                        disabled={
                          !!workspace.flow || workspace.pages.length < 2
                        }
                        onClick={() => pageAction("delete")}
                      >
                        <Trash2 />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                    <small>Página actual</small>
                  </div>
                  <div className="ribbon-group">
                    <div className="ribbon-row">
                      {icon(
                        "Subir página",
                        ArrowUp,
                        () => pageAction("up"),
                        !!workspace.flow,
                      )}
                      {icon(
                        "Bajar página",
                        ArrowDown,
                        () => pageAction("down"),
                        !!workspace.flow,
                      )}
                    </div>
                    <Button onClick={() => void portable()}>
                      <Save size={16} />
                      Copia editable
                    </Button>
                    <small>Continuar después</small>
                  </div>
                </>
              ))}
            <WordTools
              tab={tab}
              flow={workspace.flow}
              editor={rich}
              layout={currentLayout}
              onFlow={(flow) => {
                commit({ ...state.current, flow });
                setView("write");
              }}
              onLayout={(next) => {
                void updateDocumentLayout(next).catch(fail);
              }}
              onConvert={flexibleDocument}
              onBlank={blank}
              showMarks={showMarks}
              onShowMarks={setShowMarks}
              autoCorrect={autoCorrect}
              onAutoCorrect={setAutoCorrect}
              showRuler={showRuler}
              onShowRuler={setShowRuler}
              onNavigate={() => {
                setNavigation(true);
                setSidebar(true);
              }}
              onReview={setReviewPanel}
              onLocate={(blockId) => {
                setView("write");
                setTimeout(
                  () =>
                    document
                      .getElementById("block-" + blockId)
                      ?.scrollIntoView({ block: "center", behavior: "smooth" }),
                  0,
                );
              }}
              onError={fail}
              selected={selected}
              onDeleteSelected={removeSelected}
              onSelected={(m) => {
                const p = workspace.pages.find((p) =>
                  p.marks.some((n) => n.id === m.id),
                );
                if (p) changeMark(p.id, m);
              }}
            />
          </div>
          <div className="workspace">
            <aside
              className={`pages-sidebar ${sidebar ? "" : "collapsed"} ${navigation ? "navigating" : ""}`}
            >
              <div className="sidebar-title">
                <span>
                  Páginas <b>{workspace.pages.length}</b>
                </span>
                {icon("Ocultar páginas", PanelLeftClose, () =>
                  setSidebar(false),
                )}
              </div>
              {navigation && (
                <DocumentNavigation
                  workspace={workspace}
                  editor={rich}
                  onPage={(id) => {
                    setActiveId(id);
                    if (workspace.flow) setView("pdf");
                    setTimeout(
                      () =>
                        document.getElementById("page-" + id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                      0,
                    );
                  }}
                  onQuery={setSearchQuery}
                  onClose={() => {
                    setNavigation(false);
                    setSearchQuery("");
                  }}
                  onError={fail}
                />
              )}
              <div
                className="page-list"
                style={navigation ? { display: "none" } : undefined}
              >
                {workspace.pages.map((p, i) => (
                  <button
                    key={p.id}
                    className={active?.id === p.id ? "active" : ""}
                    aria-label={"Ir a la página " + (i + 1)}
                    onClick={() => {
                      if (writing) {
                        document
                          .getElementById("writing-page-" + i)
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        return;
                      }
                      setActiveId(p.id);
                      if (workspace.flow) setView("pdf");
                      setTimeout(
                        () =>
                          document
                            .getElementById("page-" + p.id)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                        0,
                      );
                    }}
                  >
                    <div className="thumbnail">
                      <PageThumbnail
                        source={
                          workspace.sources.find((s) => s.id === p.sourceId)!
                        }
                        page={p}
                        width={112}
                      />
                    </div>
                    <span>{i + 1}</span>
                  </button>
                ))}
              </div>
              <Button
                className="sidebar-open"
                title="Mostrar páginas"
                onClick={() => setSidebar(true)}
              >
                <Layers3 size={18} />
              </Button>
            </aside>
            <main
              ref={stage}
              className="document-stage"
              onScroll={trackPage}
              onClick={(e) => {
                if (e.target === e.currentTarget) clear();
              }}
            >
              <div className="stage-topline">
                <span>
                  {writing
                    ? "DOCUMENTO DE TEXTO"
                    : tool === "edit"
                      ? "ESCRIBE DIRECTAMENTE EN EL DOCUMENTO"
                      : tool === "highlight"
                        ? "SELECCIONA LAS PALABRAS PARA RESALTAR"
                        : pending
                          ? "HAZ CLIC PARA COLOCAR TU ELEMENTO"
                          : "TU DOCUMENTO, PÁGINA A PÁGINA"}
                </span>
                <span>
                  {writing
                    ? documentStatistics(workspace.flow!.content).words +
                      " palabras"
                    : workspace.pages.length + " páginas"}
                </span>
              </div>
              {writing && workspace.flow ? (
                <div
                  className="flow-paper paged-paper"
                  style={{
                    width: (pageSize(currentLayout)[0] * 4) / 3,
                    zoom: rw / ((pageSize(currentLayout)[0] * 4) / 3),
                    minHeight: (pageSize(currentLayout)[1] * 4) / 3,
                    height:
                      writingPages *
                        ((pageSize(currentLayout)[1] * 4) / 3 + 28) -
                      28,
                    padding: `${currentLayout.top}mm ${currentLayout.right}mm ${currentLayout.bottom}mm ${currentLayout.left}mm`,
                  }}
                >
                  <div className="writing-page-backgrounds" aria-hidden="true">
                    {Array.from({ length: writingPages }, (_, i) => (
                      <div
                        key={i}
                        id={"writing-page-" + i}
                        className="writing-page-sheet"
                        style={{
                          top: i * ((pageSize(currentLayout)[1] * 4) / 3 + 28),
                          height: (pageSize(currentLayout)[1] * 4) / 3,
                        }}
                      >
                        <span
                          className="writing-page-header"
                          style={{
                            left: currentLayout.left + "mm",
                            right: currentLayout.right + "mm",
                          }}
                        >
                          {currentLayout.differentFirst && i === 0
                            ? currentLayout.headerFirst
                            : currentLayout.oddEven && i % 2 === 1
                              ? (currentLayout.headerEven ??
                                currentLayout.header)
                              : currentLayout.header}
                        </span>
                        <span
                          className="writing-page-footer"
                          style={{
                            left: currentLayout.left + "mm",
                            right: currentLayout.right + "mm",
                          }}
                        >
                          {currentLayout.differentFirst && i === 0
                            ? currentLayout.footerFirst
                            : currentLayout.oddEven && i % 2 === 1
                              ? (currentLayout.footerEven ??
                                currentLayout.footer)
                              : currentLayout.footer}
                        </span>
                        {currentLayout.numbering && (
                          <span
                            className={
                              "writing-page-number " +
                              (currentLayout.pageNumberPosition ??
                                "footer-right")
                            }
                          >
                            {i + (currentLayout.pageNumberStart ?? 1)}
                          </span>
                        )}
                        {currentLayout.watermark?.text && (
                          <div
                            className="flow-watermark"
                            style={{
                              color: currentLayout.watermark.color,
                              opacity: currentLayout.watermark.opacity,
                              transform: `translate(-50%,-50%) rotate(${-currentLayout.watermark.angle}deg)`,
                              fontSize: currentLayout.watermark.size + "pt",
                            }}
                          >
                            {currentLayout.watermark.text}
                          </div>
                        )}
                        <span className="writing-page-label">
                          Página {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  {showRuler && (
                    <DocumentRuler
                      layout={currentLayout}
                      onChange={(next) => {
                        void updateDocumentLayout(next).catch(fail);
                      }}
                      firstLine={
                        Number(
                          rich?.getAttributes("paragraph").firstLineIndent,
                        ) || 0
                      }
                      hanging={
                        Number(
                          rich?.getAttributes("paragraph").hangingIndent,
                        ) || 0
                      }
                      onIndent={(first, hanging) =>
                        rich
                          ?.chain()
                          .focus()
                          .updateAttributes(
                            rich.isActive("heading") ? "heading" : "paragraph",
                            { firstLineIndent: first, hangingIndent: hanging },
                          )
                          .run()
                      }
                    />
                  )}
                  {showRuler && (
                    <div
                      className="writing-rulers"
                      style={{
                        top:
                          writingActivePage *
                          ((pageSize(currentLayout)[1] * 4) / 3 + 28),
                      }}
                    >
                      <VerticalDocumentRuler
                        layout={currentLayout}
                        onChange={(next) =>
                          void updateDocumentLayout(next).catch(fail)
                        }
                      />
                      <VerticalDocumentRuler
                        side="right"
                        layout={currentLayout}
                        onChange={(next) =>
                          void updateDocumentLayout(next).catch(fail)
                        }
                      />
                    </div>
                  )}
                  {currentSection && (
                    <div className="active-section-label">
                      {currentSection.title} ·{" "}
                      {currentLayout.orientation === "portrait"
                        ? "Vertical"
                        : "Horizontal"}{" "}
                      · {currentLayout.columns || 1} columna(s)
                    </div>
                  )}
                  <RichEditor
                    autoFocus
                    pageLayout={currentLayout}
                    onPages={setWritingPages}
                    showMarks={showMarks}
                    autoCorrect={autoCorrect}
                    searchQuery={searchQuery}
                    content={workspace.flow.content}
                    onFocus={setEditor}
                    onChange={(content) =>
                      commit(
                        {
                          ...state.current,
                          flow: {
                            ...state.current.flow!,
                            content: normalizeAcademicDocument(
                              content,
                              state.current.flow!.references ?? [],
                              state.current.flow!.academicStyle ?? "free",
                            ),
                          },
                        },
                        false,
                      )
                    }
                  />
                </div>
              ) : (
                <div className="continuous-pages">
                  {workspace.pages.map((p, i) => (
                    <PageFrame
                      key={p.id}
                      page={p}
                      source={
                        workspace.sources.find((s) => s.id === p.sourceId)!
                      }
                      number={i + 1}
                      width={rw}
                      tool={tool}
                      color={color}
                      size={size}
                      selected={selectedId}
                      editing={editing}
                      readonly={!!workspace.flow}
                      rulerLayout={
                        showRuler
                          ? (workspace.flow?.pageLayouts?.[i] ??
                            workspace.layout ??
                            layout)
                          : undefined
                      }
                      onRulerLayout={(next) =>
                        void updateDocumentLayout(
                          next,
                          workspace.flow?.pageSections?.[i],
                        ).catch(fail)
                      }
                      watermark={
                        !workspace.flow
                          ? workspace.layout?.watermark
                          : undefined
                      }
                      onActive={() => setActiveId(p.id)}
                      onSelect={select}
                      onEditor={setEditor}
                      showMarks={showMarks}
                      autoCorrect={autoCorrect}
                      searchQuery={searchQuery}
                      onTextPage={(marks) =>
                        commit(
                          {
                            ...state.current,
                            pages: state.current.pages.map((a) =>
                              a.id === p.id
                                ? {
                                    ...a,
                                    marks: [
                                      ...a.marks.filter(
                                        (m) => m.type !== "text",
                                      ),
                                      ...marks,
                                    ],
                                  }
                                : a,
                            ),
                          },
                          false,
                        )
                      }
                      onMark={(m) => changeMark(p.id, m)}
                      onAdd={(m) => addMarks(p.id, [m])}
                      onNative={(o) => promote(p, o)}
                      onArea={(r) => void redact(p, r)}
                      onHighlight={(ms) => addMarks(p.id, ms)}
                      onError={fail}
                      onPlace={(x, y) => place(p, x, y)}
                    />
                  ))}
                </div>
              )}
            </main>
            {reviewPanel === "spelling" && (
              <SpellingReview
                editor={workspace.flow ? rich : null}
                onClose={() => setReviewPanel("")}
                onConvert={flexibleDocument}
              />
            )}
            {reviewPanel === "characters" && (
              <CharacterInspector
                editor={workspace.flow ? rich : null}
                fonts={workspace.fonts ?? []}
                family={sf}
                onClose={() => setReviewPanel("")}
                onConvert={flexibleDocument}
              />
            )}
          </div>
          <footer className="editor-status">
            <span>
              <span className="live-dot" />
              {writing
                ? "Modo escritura"
                : `Página ${Math.max(1, workspace.pages.indexOf(active) + 1)} de ${workspace.pages.length}`}
            </span>
            {writing && workspace.flow && (
              <span className="document-statistics">
                {documentStatistics(
                  workspace.flow.content,
                ).words.toLocaleString("es-CO")}{" "}
                palabras ·{" "}
                {documentStatistics(
                  workspace.flow.content,
                ).characters.toLocaleString("es-CO")}{" "}
                caracteres
              </span>
            )}
            {selected && (
              <div className="selection-toolbar">
                <span>
                  {selected.type === "text" ? "Texto" : "Elemento"} seleccionado
                </span>
                {selected.type === "text" && (
                  <Button onClick={() => select(selected.id, true)}>
                    <Type size={13} />
                    Editar
                  </Button>
                )}
                {icon("Eliminar elemento", Trash2, removeSelected)}
                <label>
                  Ancho
                  <input
                    type="number"
                    aria-label="Ancho del elemento"
                    value={Math.round(selected.width)}
                    min="20"
                    onChange={(e) => {
                      for (const p of workspace.pages)
                        if (p.marks.some((m) => m.id === selectedId))
                          changeMark(p.id, {
                            ...selected,
                            width: Math.max(20, Number(e.target.value)),
                            height: ["image", "signature"].includes(
                              selected.type,
                            )
                              ? (Math.max(20, Number(e.target.value)) *
                                  selected.height) /
                                selected.width
                              : selected.height,
                          });
                    }}
                  />
                </label>
              </div>
            )}
            <div>
              {icon("Alejar", Minus, () => {
                setFit(false);
                setZoom((z) => Math.max(30, z - 10));
              })}
              <Button onClick={() => setFit((f) => !f)}>
                {fit ? "Ajustar" : zoom + " %"}
              </Button>
              {icon("Acercar", Plus, () => {
                setFit(false);
                setZoom((z) => Math.min(200, z + 10));
              })}
              <Button onClick={() => setDialog("help")}>Ayuda</Button>
            </div>
          </footer>
        </>
      )}
      {notice && (
        <div className="toast success" role="status">
          <Check size={17} />
          {notice}
          <Button title="Cerrar aviso" onClick={() => setNotice("")}>
            <X size={15} />
          </Button>
        </div>
      )}
      {error && (
        <div className="toast error" role="alert">
          {error}
          <Button title="Cerrar error" onClick={() => setError("")}>
            <X size={15} />
          </Button>
        </div>
      )}
      {busy && (
        <div className="busy-overlay" role="status">
          <LoaderCircle className="spin" />
          {busy}
        </div>
      )}
      {dialog === "signature" && (
        <Signature
          onClose={() => setDialog(null)}
          onSave={(data) => {
            setDialog(null);
            const img = new Image();
            img.src = data;
            img.onload = () => {
              if (writing && rich)
                rich
                  .chain()
                  .focus()
                  .setImage({
                    src: data,
                    width: 180,
                    height: (180 * img.height) / img.width,
                  })
                  .run();
              else {
                setPending({
                  data,
                  ratio: img.width / img.height,
                  type: "signature",
                });
                setTool("signature");
              }
            };
          }}
        />
      )}
      {dialog && dialog !== "signature" && (
        <div className="modal-backdrop">
          <section
            className={`modal ${dialog === "print" ? "print-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="modal-heading">
              <span className="eyebrow">PRISMA PDF</span>
              <Button title="Cerrar ventana" onClick={() => setDialog(null)}>
                <X size={20} />
              </Button>
            </div>
            {dialog === "export" ? (
              <>
                <h2 id="dialog-title">Tu documento, listo.</h2>
                <p>
                  Exporta tus cambios en el formato que necesites. La copia
                  .prisma conserva el proyecto para continuar editándolo.
                </p>
                <label className="field">
                  Formato
                  <select
                    aria-label="Formato de exportación"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="pdf">PDF · diseño final</option>
                    <option value="docx">Word · DOCX editable</option>
                    <option value="html">
                      HTML · documento con fuentes e imágenes
                    </option>
                    <option value="md">Markdown · MD</option>
                    <option value="txt">Texto sin formato · TXT</option>
                    <option value="png">Imágenes · PNG / ZIP</option>
                  </select>
                </label>
                {!["pdf", "png"].includes(exportFormat) && (
                  <p className="export-limit">
                    Se exporta todo el documento. En DOCX el texto y las tablas
                    son editables; las ecuaciones y gráficos se conservan como
                    imágenes. HTML ofrece una lectura continua; Markdown y TXT
                    priorizan el contenido. PDF conserva el diseño final. Al
                    convertir un PDF de posiciones fijas, revisa el orden de
                    lectura y los saltos en el archivo exportado.
                  </p>
                )}
                <label className="field">
                  Nombre
                  <input
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                  />
                </label>
                {["pdf", "png"].includes(exportFormat) && (
                  <label className="field">
                    Páginas
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                    >
                      <option value="all">Todo el documento</option>
                      <option value="current">Página actual</option>
                      <option value="range">Un rango de páginas</option>
                    </select>
                  </label>
                )}
                {["pdf", "png"].includes(exportFormat) && scope === "range" && (
                  <label className="field">
                    Rango
                    <input
                      placeholder="1-3, 5"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    />
                  </label>
                )}
                {exportFormat === "pdf" && (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={compress}
                      onChange={(e) => setCompress(e.target.checked)}
                    />
                    Optimizar tamaño
                  </label>
                )}
                <div className="modal-actions">
                  <Button onClick={() => void portable()}>
                    <Save size={16} />
                    Copia editable .prisma
                  </Button>
                  <Button className="primary" onClick={() => void exportPdf()}>
                    <Download size={16} />
                    Exportar {exportFormat.toUpperCase()}
                  </Button>
                </div>
              </>
            ) : dialog === "layout" ? (
              <>
                <h2 id="dialog-title">Espacio para tus ideas.</h2>
                <p>
                  {workspace.flow
                    ? "El texto se redistribuye según los márgenes."
                    : "Se ajusta la página completa al área útil, conservando su diseño."}
                </p>
                <div className="field-grid">
                  <label className="field">
                    Tamaño
                    <select
                      value={layout.format}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          format: e.target.value as PageLayout["format"],
                        })
                      }
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Carta</option>
                      <option value="legal">Oficio</option>
                    </select>
                  </label>
                  <label className="field">
                    Orientación
                    <select
                      value={layout.orientation}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          orientation: e.target
                            .value as PageLayout["orientation"],
                        })
                      }
                    >
                      <option value="portrait">Vertical</option>
                      <option value="landscape">Horizontal</option>
                    </select>
                  </label>
                  {(["top", "bottom", "left", "right"] as const).map((k, i) => (
                    <label className="field" key={k}>
                      {["Superior", "Inferior", "Izquierdo", "Derecho"][i]} (mm)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={layout[k]}
                        onChange={(e) =>
                          setLayout({
                            ...layout,
                            [k]: Math.max(
                              0,
                              Math.min(100, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                {workspace.flow && (
                  <>
                    <label className="field">
                      Encabezado
                      <input
                        value={layout.header}
                        onChange={(e) =>
                          setLayout({ ...layout, header: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Pie de página
                      <input
                        value={layout.footer}
                        onChange={(e) =>
                          setLayout({ ...layout, footer: e.target.value })
                        }
                      />
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={layout.numbering}
                        onChange={(e) =>
                          setLayout({ ...layout, numbering: e.target.checked })
                        }
                      />
                      Numerar páginas
                    </label>
                  </>
                )}
                <div className="modal-actions">
                  <Button
                    className="primary"
                    onClick={() => void applyLayout()}
                  >
                    Aplicar diseño
                    <Check size={16} />
                  </Button>
                </div>
              </>
            ) : dialog === "print" ? (
              <>
                <h2 id="dialog-title">Vista de impresión.</h2>
                <p>
                  {printCount} páginas con tus cambios. Abre el diálogo del
                  dispositivo para elegir la impresora.
                </p>
                <label className="field">
                  Páginas para imprimir
                  <select
                    value={printScope}
                    onChange={(e) => setPrintScope(e.target.value)}
                  >
                    <option value="all">Todo el documento</option>
                    <option value="range">Un rango de páginas</option>
                  </select>
                </label>
                {printScope === "range" && (
                  <label className="field">
                    Rango de impresión
                    <input
                      placeholder="1-3, 5"
                      value={printRange}
                      onChange={(e) => setPrintRange(e.target.value)}
                    />
                  </label>
                )}
                {printCount > 3 && (
                  <p className="print-note">
                    La vista muestra las primeras 3 páginas. Se imprimirá la
                    selección indicada.
                  </p>
                )}
                <div className="print-preview">
                  {printPages.map((p, i) => (
                    <img
                      key={i}
                      src={p.data}
                      loading="lazy"
                      decoding="async"
                      alt={"Vista de impresión, página " + (i + 1)}
                    />
                  ))}
                </div>
                <div className="modal-actions">
                  <Button onClick={() => setDialog(null)}>
                    Volver al documento
                  </Button>
                  <Button className="primary" onClick={() => void print()}>
                    <Printer size={17} />
                    Imprimir
                  </Button>
                </div>
              </>
            ) : dialog === "table" ? (
              <>
                <h2 id="dialog-title">Ordena tus ideas.</h2>
                <div className="field-grid">
                  <label className="field">
                    Filas
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={rows}
                      onChange={(e) =>
                        setRows(
                          Math.max(1, Math.min(30, Number(e.target.value))),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Columnas
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={cols}
                      onChange={(e) =>
                        setCols(
                          Math.max(1, Math.min(12, Number(e.target.value))),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <Button
                    className="primary"
                    onClick={() => {
                      rich
                        ?.chain()
                        .focus()
                        .insertTable({ rows, cols, withHeaderRow: true })
                        .run();
                      setDialog(null);
                    }}
                  >
                    Insertar tabla
                  </Button>
                </div>
              </>
            ) : dialog === "link" ? (
              <>
                <h2 id="dialog-title">Conecta una idea.</h2>
                <label className="field">
                  Dirección
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </label>
                <div className="modal-actions">
                  <Button
                    className="primary"
                    onClick={() => {
                      if (!/^(https?:\/\/|mailto:)/i.test(link)) {
                        fail(new Error("Usa https://, http:// o mailto:."));
                        return;
                      }
                      rich?.chain().focus().setLink({ href: link }).run();
                      setDialog(null);
                    }}
                  >
                    Aplicar enlace
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dialog-title">Un poco de orientación.</h2>
                <p>
                  <b>PDF cargado:</b> pulsa Editar palabras para preparar todo
                  el texto del documento. Escribe directamente sobre la página.
                  Selecciona imágenes para moverlas y cambia su tamaño desde la
                  esquina.
                </p>
                <p>
                  <b>Resaltar:</b> arrastra sobre el texto para seleccionar
                  palabras. El resaltado sigue las líneas del PDF.
                </p>
                <p>
                  <b>Documento nuevo:</b> usa las pestañas de la cinta para
                  formato, tablas, imágenes, ecuaciones y gráficos. Referencias
                  aplica APA, IEEE o ISO 690 y crea índices y citas. Vista PDF
                  muestra las páginas finales.
                </p>
                <p>
                  <b>Continuar después:</b> la última sesión se guarda
                  automáticamente. Guarda proyectos en la biblioteca o una copia
                  .prisma para abrirla en otro dispositivo.
                </p>
                <p>
                  <b>Atajos:</b> Ctrl+S guarda el proyecto; Ctrl+Mayús+S guarda
                  una copia editable; Ctrl+P imprime. Las letras normales
                  escriben.
                </p>
                <small>
                  Los PDF escaneados requieren OCR para convertirse en texto. Al
                  sustituir palabras se usan tipografías locales equivalentes.
                  Los datos locales se borran al limpiar los datos del
                  navegador.
                </small>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
