import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Clipboard,
  Columns3,
  FilePlus2,
  Heading1,
  Image,
  Link2,
  List,
  MessageSquare,
  Paintbrush,
  Pilcrow,
  Ruler,
  Sigma,
  Sparkles,
  Table2,
  Video,
  X,
  ChartColumn,
  Shapes,
  Quote,
  Search,
} from "lucide-react";
import { Button } from "./components";
import type { RichEditorInstance } from "./LazyRichEditor";
import {
  academicPresets,
  applyAcademicStyle,
  normalizeAcademicDocument,
  referenceFromUrl,
  formatReference,
  collectCitationOccurrences,
  missingReferenceFields,
  type AcademicStyle,
  type ReferenceRecord,
  type IndexKind,
} from "./academic";
import {
  pageSize,
  type FlowDocument,
  type PageLayout,
  type RichNode,
} from "./flow";
import {
  chartImage,
  equationImage,
  shapeImage,
  symbolGroups,
} from "./graphics";
import { textStatistics, documentStatistics } from "./document-tools";
import { uid, type Mark } from "./pdf";
import {
  changeSection,
  documentSections,
  selectedSection,
  sectionKinds,
  type SectionKind,
} from "./sections";
import { replaceText, replacementMatches } from "./find-replace";
type Props = {
  tab: string;
  flow?: FlowDocument;
  editor: RichEditorInstance | null;
  layout: PageLayout;
  onFlow: (flow: FlowDocument) => void;
  onLayout: (layout: PageLayout) => void;
  onConvert: () => Promise<void>;
  onBlank: (placement: string) => Promise<void>;
  showMarks: boolean;
  onShowMarks: (show: boolean) => void;
  autoCorrect: boolean;
  onAutoCorrect: (enabled: boolean) => void;
  showRuler: boolean;
  onShowRuler: (show: boolean) => void;
  onNavigate: () => void;
  onLocate: (blockId: string) => void;
  onError: (e: unknown) => void;
  selected?: Mark;
  onSelected: (mark: Mark) => void;
  onDeleteSelected: () => void;
};
const indexLabels: Record<IndexKind, string> = {
  contents: "Tabla de contenido",
  figures: "Tabla de figuras",
  tables: "Tabla de tablas",
  appendices: "Tabla de apéndices",
  references: "Bibliografía",
};
const emptyRef = (): ReferenceRecord => ({
  id: uid(),
  type: "web",
  author: "",
  title: "",
  year: "",
  url: "",
  site: "",
  language: "es-ES",
  accessed: new Date().toISOString().slice(0, 10),
});
export function WordTools(p: Props) {
  const [dialog, setDialog] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [ref, setRef] = useState<ReferenceRecord>(emptyRef),
    [working, setWorking] = useState(false),
    [referenceTab, setReferenceTab] = useState("list");
  const [citationPage, setCitationPage] = useState("");
  const [symbolGroup, setSymbolGroup] = useState("Matemáticas"),
    [character, setCharacter] = useState(""),
    [selectedStats, setSelectedStats] = useState(""),
    fileInput = useRef<HTMLInputElement>(null),
    [videoData, setVideoData] = useState("");
  const editor = p.editor && !p.editor.isDestroyed ? p.editor : null,
    style = p.flow?.academicStyle ?? "free";
  const sections = p.flow
    ? documentSections(p.flow.content, p.flow.layout)
    : [];
  const sectionDialog = (name: string) => {
    const section = p.flow ? selectedSection(editor, p.flow.layout) : null;
    open(name, {
      sectionId: section?.id ?? "",
      title:
        name === "new-section"
          ? "Sección " + (sections.length + 1)
          : (section?.title ?? ""),
      kind: section?.kind ?? "nextPage",
      link: String(name === "new-section" || section?.linkToPrevious === true),
      restart: String(
        name !== "new-section" && section?.restartNumbering === true,
      ),
      start: String(section?.layout.pageNumberStart ?? 1),
    });
  };
  const mediaType =
    ["image", "equation", "chart", "shape", "video"].find((type) =>
      editor?.isActive(type),
    ) ?? "image";
  const group = (title: string, children: React.ReactNode) => (
    <div className="ribbon-group word-group">
      <div className="word-group-controls">{children}</div>
      <small>{title}</small>
    </div>
  );
  const action = (
    title: string,
    Icon: typeof Quote,
    onClick: () => void,
    disabled = false,
  ) => (
    <Button title={title} onClick={onClick} disabled={disabled}>
      <Icon size={18} />
      <span>{title}</span>
    </Button>
  );
  const needsEditor = () => {
    if (!editor)
      throw new Error(
        "Coloca el cursor dentro del texto para insertar este elemento.",
      );
    return editor;
  };
  const insert = (node: RichNode | RichNode[]) => {
    try {
      const block =
        !Array.isArray(node) &&
        [
          "generatedIndex",
          "appendix",
          "equation",
          "chart",
          "shape",
          "video",
        ].includes(node.type ?? "");
      needsEditor()
        .chain()
        .focus()
        .insertContent(block ? [node, { type: "paragraph" }] : node)
        .run();
    } catch (e) {
      p.onError(e);
    }
  };
  const open = (name: string, defaults: Record<string, string> = {}) => {
    setFields(defaults);
    setDialog(name);
  };
  const field = (
    name: string,
    label: string,
    type = "text",
    options?: [string, string][],
  ) => (
    <label>
      {label}
      {options ? (
        <select
          value={fields[name] ?? ""}
          onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
        >
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={fields[name] ?? ""}
          onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
        />
      ) : (
        <input
          type={type}
          value={fields[name] ?? ""}
          onChange={(e) => setFields({ ...fields, [name]: e.target.value })}
        />
      )}
    </label>
  );
  const apply = (layout: PageLayout) => {
    p.onLayout(layout);
  };
  const updateAttributes = (attrs: Record<string, unknown>) => {
    const e = needsEditor();
    e.chain()
      .focus()
      .updateAttributes(e.isActive("heading") ? "heading" : "paragraph", attrs)
      .run();
  };
  const selectedObject = () => {
    const e = needsEditor();
    const selection = e.state.selection;
    const node = e.state.doc.nodeAt(selection.from);
    if (
      node &&
      ["image", "table", "equation", "chart", "shape", "video"].includes(
        node.type.name,
      )
    )
      return { node, pos: selection.from };
    for (let d = selection.$from.depth; d > 0; d--) {
      const n = selection.$from.node(d);
      if (n.type.name === "table")
        return { node: n, pos: selection.$from.before(d) };
    }
    throw new Error("Selecciona una tabla, imagen o gráfico del documento.");
  };
  const captionDialog = () => {
    try {
      const { node } = selectedObject(),
        caption = p.flow?.content.content?.find(
          (n) => n.type === "caption" && n.attrs?.targetId === node.attrs.id,
        );
      open("caption", {
        title: String(caption?.attrs?.title ?? node.attrs.title ?? ""),
        note: String(caption?.attrs?.note ?? ""),
        targetId: node.attrs.id,
        kind: node.type.name === "table" ? "table" : "figure",
      });
    } catch (e) {
      p.onError(e);
    }
  };
  const academic = (next: AcademicStyle) => {
    if (!p.flow) {
      p.onError(
        new Error(
          "Activa la escritura flexible para aplicar el formato a todo el documento.",
        ),
      );
      return;
    }
    const preset = academicPresets[next];
    p.onFlow({
      ...p.flow,
      academicStyle: next,
      layout: preset.layout
        ? {
            ...p.flow.layout,
            ...preset.layout,
            pageNumberPosition:
              preset.pageNumberPosition ?? p.flow.layout.pageNumberPosition,
          }
        : p.flow.layout,
      content: normalizeAcademicDocument(
        applyAcademicStyle(p.flow.content, next),
        p.flow.references ?? [],
        next,
      ),
    });
  };
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelectedStats("");
        return;
      }
      const text = editor.state.doc.textBetween(from, to, " "),
        stats = textStatistics(text);
      setSelectedStats(
        `${stats.words} palabras seleccionadas${stats.numbers ? ` · ${stats.numbers} números · suma ${stats.sum.toLocaleString("es-CO", { maximumFractionDigits: 10 })}` : ""}`,
      );
    };
    update();
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);
  useEffect(() => {
    if (!dialog) return;
    const el = document.querySelector<HTMLElement>(".word-dialog");
    const before = document.activeElement as HTMLElement;
    el?.querySelector<HTMLElement>("input,textarea,button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialog("");
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea,select,a",
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
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [dialog]);
  async function submit() {
    setWorking(true);
    try {
      if (dialog === "new-section" || dialog === "sections") {
        const flow = p.flow;
        if (!flow)
          throw new Error(
            "Convierte el PDF a documento de texto para crear secciones.",
          );
        const existing =
          sections.find((s) => s.id === fields.sectionId) ?? sections[0];
        const attrs = {
          title: fields.title.trim() || "Sección " + (sections.length + 1),
          kind: fields.kind as SectionKind,
          linkToPrevious: fields.link === "true",
          restartNumbering: fields.restart === "true",
          layout: {
            ...(dialog === "new-section" ? p.layout : existing.layout),
            pageNumberStart: Math.max(
              1,
              Math.min(100000, Number(fields.start) || 1),
            ),
          },
        };
        if (dialog === "new-section") {
          const e = needsEditor(),
            from = e.state.selection.$from,
            pos = from.depth ? from.after(1) : from.pos;
          e.chain()
            .focus()
            .insertContentAt(pos, [
              { type: "sectionBreak", attrs: { ...attrs, id: uid() } },
              { type: "paragraph" },
            ])
            .run();
        } else if (existing.id)
          p.onFlow({
            ...flow,
            content: changeSection(flow.content, existing.id, attrs),
          });
        else p.onFlow({ ...flow, layout: attrs.layout });
      }
      if (dialog === "paragraph")
        updateAttributes({
          firstLineIndent: Number(fields.first),
          hangingIndent: Number(fields.hanging),
          lineHeight: Number(fields.line),
          spaceBefore: Number(fields.before),
          spaceAfter: Number(fields.after),
        });
      if (dialog === "list") {
        const e = needsEditor();
        const type = fields.kind === "bullet" ? "bulletList" : "orderedList";
        if (!e.isActive(type))
          fields.kind === "bullet"
            ? e.chain().focus().toggleBulletList().run()
            : e.chain().focus().toggleOrderedList().run();
        e.chain()
          .focus()
          .updateAttributes(type, {
            listStyle: fields.style,
            start: Number(fields.start) || 1,
          })
          .run();
      }
      if (dialog === "caption") {
        const e = needsEditor(),
          { node, pos } = selectedObject();
        if (node.attrs.id !== fields.targetId)
          throw new Error(
            "Vuelve a seleccionar el elemento para añadir su título.",
          );
        const cap = {
          type: "caption",
          attrs: {
            id: uid(),
            kind: fields.kind,
            targetId: fields.targetId,
            title: fields.title,
            note: fields.note,
          },
          content: [],
        };
        const found = p.flow?.content.content?.find(
          (n) => n.type === "caption" && n.attrs?.targetId === fields.targetId,
        );
        if (found && p.flow)
          p.onFlow({
            ...p.flow,
            content: normalizeAcademicDocument(
              {
                ...p.flow.content,
                content: p.flow.content.content?.map((n) =>
                  n === found
                    ? {
                        ...cap,
                        attrs: { ...cap.attrs, id: String(found.attrs?.id) },
                      }
                    : n,
                ),
              },
              p.flow.references ?? [],
              style,
            ),
          });
        else e.chain().focus().insertContentAt(pos, cap).run();
      }
      if (dialog === "equation") {
        const img = await equationImage(fields.latex);
        insert({
          type: "equation",
          attrs: {
            id: uid(),
            latex: fields.latex,
            src: img.src,
            width: Math.min(600, img.width),
            alt: "Ecuación: " + fields.latex,
          },
        });
      }
      if (dialog === "chart") {
        const src = await chartImage(
          fields.values,
          fields.kind,
          fields.title,
          fields.color,
        );
        insert({
          type: "chart",
          attrs: { id: uid(), src, width: 520, ...fields },
        });
      }
      if (dialog === "shape") {
        const src = await shapeImage(fields.kind, fields.title, fields.color);
        insert({
          type: "shape",
          attrs: { id: uid(), src, width: 300, ...fields },
        });
      }
      if (dialog === "video") {
        if (!videoData && !/^https?:\/\//i.test(fields.url))
          throw new Error(
            "Introduce un enlace http/https o elige un video local.",
          );
        const src = await shapeImage("rectangle", "▶ VIDEO", "#20273a");
        insert({
          type: "video",
          attrs: {
            id: uid(),
            src,
            width: 400,
            url: fields.url,
            data: videoData,
            title: fields.title,
            alt: fields.title || "Video",
          },
        });
        setVideoData("");
      }
      if (dialog === "comment") {
        const e = needsEditor();
        if (e.state.selection.empty)
          throw new Error("Selecciona el texto que deseas comentar.");
        e.chain()
          .focus()
          .setMark("comment", {
            id: uid(),
            text: fields.text,
            author: fields.author || "Autor",
            date: new Date().toISOString(),
          })
          .run();
      }
      if (dialog === "appendix")
        insert({
          type: "appendix",
          attrs: { id: uid(), title: fields.title },
          content: [{ type: "text", text: fields.title || "Apéndice" }],
        });
      if (dialog === "blank") await p.onBlank(fields.placement);
      if (dialog === "watermark")
        apply({
          ...p.layout,
          watermark: fields.text
            ? {
                text: fields.text,
                color: fields.color,
                opacity: Number(fields.opacity),
                angle: Number(fields.angle),
                size: Number(fields.size),
              }
            : undefined,
        });
      if (dialog === "layout")
        apply({
          ...p.layout,
          format: fields.format as PageLayout["format"],
          orientation: fields.orientation as PageLayout["orientation"],
          customWidth: Number(fields.width) || 210,
          customHeight: Number(fields.height) || 297,
          left: Number(fields.left),
          right: Number(fields.right),
          top: Number(fields.top),
          bottom: Number(fields.bottom),
          columns: Number(fields.columns),
          columnGap: Number(fields.gap),
        });
      if (dialog === "headers")
        apply({
          ...p.layout,
          header: fields.header,
          footer: fields.footer,
          differentFirst: fields.first === "true",
          headerFirst: fields.headerFirst,
          footerFirst: fields.footerFirst,
          oddEven: fields.even === "true",
          headerEven: fields.headerEven,
          footerEven: fields.footerEven,
          numbering: fields.numbering === "true",
          pageNumberPosition:
            fields.position as PageLayout["pageNumberPosition"],
          pageNumberStart: Number(fields.start) || 1,
        });
      if (dialog === "reference") {
        if (!ref.title.trim() && !ref.url?.trim())
          throw new Error("Añade el título o la URL de la fuente.");
        if (!p.flow) throw new Error("Activa la escritura flexible.");
        const references = [
          ...(p.flow.references ?? []).filter((r) => r.id !== ref.id),
          ref,
        ];
        p.onFlow({
          ...p.flow,
          references,
          content: normalizeAcademicDocument(p.flow.content, references, style),
        });
        setDialog("references");
        setReferenceTab("list");
        return;
      }
      setDialog("");
    } catch (e) {
      p.onError(e);
    } finally {
      setWorking(false);
    }
  }
  const tools = (
    <>
      {!p.flow &&
        ["Referencias", "Revisar", "Insertar"].includes(p.tab) &&
        group(
          "Documento flexible",
          action(
            "Activar escritura flexible",
            BookOpen,
            () => void p.onConvert(),
          ),
        )}
      {p.tab === "Inicio" && (
        <>
          {group(
            "Portapapeles",
            <>
              {action("Copiar", Clipboard, () => {
                try {
                  const e = needsEditor(),
                    { from, to } = e.state.selection;
                  void navigator.clipboard
                    .writeText(e.state.doc.textBetween(from, to, "\n"))
                    .catch(() =>
                      p.onError(
                        new Error(
                          "Usa Ctrl+C o el menú de copiar del dispositivo.",
                        ),
                      ),
                    );
                } catch (err) {
                  p.onError(err);
                }
              })}
              {action("Pegar", Clipboard, () => {
                void navigator.clipboard
                  .readText()
                  .then((text) => {
                    const e = needsEditor();
                    e.chain()
                      .focus()
                      .insertContent(
                        text.split("\n").map((t) => ({
                          type: "paragraph",
                          content: t ? [{ type: "text", text: t }] : [],
                        })),
                      )
                      .run();
                  })
                  .catch(() =>
                    p.onError(
                      new Error(
                        "Usa Ctrl+V o el menú de pegar del dispositivo.",
                      ),
                    ),
                  );
              })}
              {action("Cortar", Clipboard, () => {
                try {
                  const e = needsEditor(),
                    { from, to } = e.state.selection;
                  void navigator.clipboard
                    .writeText(e.state.doc.textBetween(from, to, "\n"))
                    .then(() => e.chain().focus().deleteSelection().run())
                    .catch(() =>
                      p.onError(
                        new Error(
                          "Usa Ctrl+X o el menú de cortar del dispositivo.",
                        ),
                      ),
                    );
                } catch (err) {
                  p.onError(err);
                }
              })}
            </>,
          )}
          {group(
            "Estilos",
            <div className="style-gallery">
              {[
                "Normal",
                "Título 1",
                "Título 2",
                "Título 3",
                "Título 4",
                "Título 5",
                "Título 6",
                "Cita",
                "Código",
              ].map((label, i) => (
                <button
                  key={label}
                  disabled={!editor}
                  onClick={() => {
                    if (!editor) return;
                    const chain = editor.chain().focus();
                    i === 0
                      ? chain.setParagraph().run()
                      : i <= 6
                        ? chain
                            .toggleHeading({
                              level: i as 1 | 2 | 3 | 4 | 5 | 6,
                            })
                            .run()
                        : i === 7
                          ? chain.toggleBlockquote().run()
                          : chain.toggleCodeBlock().run();
                  }}
                >
                  <span className={"sample-style style-" + i}>
                    {i ? "Aa" : "Normal"}
                  </span>
                  <small>{label}</small>
                </button>
              ))}
            </div>,
          )}
          {group(
            "Párrafo",
            <>
              {action(
                "Espaciado y sangría",
                Paintbrush,
                () => {
                  const a =
                    editor?.getAttributes(
                      editor.isActive("heading") ? "heading" : "paragraph",
                    ) ?? {};
                  open("paragraph", {
                    first: String(a.firstLineIndent || 0),
                    hanging: String(a.hangingIndent || 0),
                    line: String(a.lineHeight || 1.45),
                    before: String(a.spaceBefore || 0),
                    after: String(a.spaceAfter ?? 7),
                  });
                },
                !editor,
              )}
              {action(
                "Viñetas y numeración",
                List,
                () =>
                  open("list", { kind: "bullet", style: "disc", start: "1" }),
                !editor,
              )}
            </>,
          )}
        </>
      )}
      {p.tab === "Insertar" && (
        <>
          {group(
            "Ilustraciones",
            <>
              {action(
                "Gráfico",
                ChartColumn,
                () =>
                  open("chart", {
                    title: "Mi gráfico",
                    kind: "bar",
                    values: "Categoría A; 25\nCategoría B; 40\nCategoría C; 30",
                    color: "#6554d8",
                  }),
                !editor,
              )}
              {action(
                "Formas e íconos",
                Shapes,
                () =>
                  open("shape", {
                    kind: "rectangle",
                    title: "",
                    color: "#6554d8",
                  }),
                !editor,
              )}
              {action(
                "Video",
                Video,
                () => open("video", { url: "", title: "" }),
                !editor,
              )}
            </>,
          )}
          {group(
            "Símbolos",
            <>
              {action(
                "Ecuación",
                Sigma,
                () => open("equation", { latex: "E = mc^2" }),
                !editor,
              )}
              {action("Símbolo", Sigma, () => open("symbol"), !editor)}
            </>,
          )}
          {group(
            "Saltos",
            <>
              {action(
                "Salto de línea",
                Pilcrow,
                () => editor?.chain().focus().setHardBreak().run(),
                !editor,
              )}
              {action(
                "Salto de página",
                FilePlus2,
                () => insert({ type: "pageBreak" }),
                !editor,
              )}
              {action(
                "Salto de columna",
                Columns3,
                () => insert({ type: "columnBreak" }),
                !editor,
              )}
              {action("Página en blanco", FilePlus2, () =>
                open("blank", { placement: "below" }),
              )}
            </>,
          )}
        </>
      )}
      {p.tab === "Diseño" && (
        <>
          {group(
            "Disposición",
            <>
              {action("Papel, márgenes y columnas", Columns3, () =>
                open(
                  "layout",
                  Object.fromEntries(
                    Object.entries({
                      ...p.layout,
                      width: p.layout.customWidth || 210,
                      height: p.layout.customHeight || 297,
                      columns: p.layout.columns || 1,
                      gap: p.layout.columnGap ?? 6.35,
                    }).map(([k, v]) => [k, String(v)]),
                  ),
                ),
              )}
              {action("Encabezados y pies", Heading1, () =>
                open("headers", {
                  header: p.layout.header,
                  footer: p.layout.footer,
                  first: String(!!p.layout.differentFirst),
                  headerFirst: p.layout.headerFirst || "",
                  footerFirst: p.layout.footerFirst || "",
                  even: String(!!p.layout.oddEven),
                  headerEven: p.layout.headerEven || "",
                  footerEven: p.layout.footerEven || "",
                  numbering: String(p.layout.numbering),
                  position: p.layout.pageNumberPosition || "footer-right",
                  start: String(p.layout.pageNumberStart ?? 1),
                }),
              )}
            </>,
          )}
          {group(
            "Fondo",
            action("Marca de agua", Image, () =>
              open("watermark", {
                text: p.layout.watermark?.text ?? "BORRADOR",
                color: p.layout.watermark?.color ?? "#9298a5",
                opacity: String(p.layout.watermark?.opacity ?? 0.14),
                angle: String(p.layout.watermark?.angle ?? 35),
                size: String(p.layout.watermark?.size ?? 60),
              }),
            ),
          )}
          {group(
            "Secciones",
            <>
              {action(
                "Salto de sección",
                FilePlus2,
                () => sectionDialog("new-section"),
                !editor || !p.flow,
              )}
              {action(
                "Administrar secciones",
                BookOpen,
                () => sectionDialog("sections"),
                !p.flow,
              )}
              <span className="section-current">
                {p.flow
                  ? selectedSection(editor, p.flow.layout).title
                  : "Documento PDF"}
              </span>
            </>,
          )}
        </>
      )}
      {p.tab === "Referencias" && (
        <>
          {group(
            "Formato del trabajo",
            <label className="academic-selector">
              Estilo
              <select
                aria-label="Estilo académico"
                value={style}
                disabled={!p.flow}
                onChange={(e) => academic(e.target.value as AcademicStyle)}
              >
                {Object.entries(academicPresets).map(([v, preset]) => (
                  <option value={v} key={v}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>,
          )}
          {group(
            "Índices automáticos",
            <div className="index-buttons">
              {Object.entries(indexLabels).map(([kind, label]) => (
                <Button
                  key={kind}
                  disabled={!editor || !p.flow}
                  onClick={() =>
                    insert({
                      type: "generatedIndex",
                      attrs: { id: uid(), kind },
                      content: [],
                    })
                  }
                >
                  {label}
                </Button>
              ))}
            </div>,
          )}
          {group(
            "Fuentes y títulos",
            <>
              {action(
                "Citas y referencias",
                Quote,
                () => setDialog("references"),
                !p.flow,
              )}
              {action("Título y nota", Table2, captionDialog, !editor)}
              {action(
                "Apéndice",
                BookOpen,
                () => open("appendix", { title: "" }),
                !editor,
              )}
            </>,
          )}
        </>
      )}
      {p.tab === "Revisar" && (
        <>
          {group(
            "Revisión",
            <>
              {action(
                "Comentario",
                MessageSquare,
                () => open("comment", { text: "", author: "" }),
                !editor,
              )}
              {action("Buscar en documento", Search, p.onNavigate)}
              {action(
                "Buscar y reemplazar",
                Search,
                () => {
                  setSelectedStats("");
                  open("replace", {
                    query: "",
                    replacement: "",
                    case: "false",
                    word: "false",
                  });
                },
                !editor,
              )}
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={p.autoCorrect}
                  onChange={(e) => p.onAutoCorrect(e.target.checked)}
                />
                Autocorrección local
              </label>
            </>,
          )}
          {group(
            "Selección",
            <div className="word-count">
              <span>
                {selectedStats ||
                  "Selecciona texto para contar palabras y sumar números."}
              </span>
              <Button onClick={() => open("statistics")}>
                Estadísticas del documento
              </Button>
            </div>,
          )}
        </>
      )}
      {p.tab === "Vista" && (
        <>
          {group(
            "Mostrar",
            <>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={p.showRuler}
                  onChange={(e) => p.onShowRuler(e.target.checked)}
                />
                <Ruler size={16} />
                Regla
              </label>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={p.showMarks}
                  onChange={(e) => p.onShowMarks(e.target.checked)}
                />
                <Pilcrow size={16} />
                Caracteres de formato
              </label>
              {action("Panel de navegación", Search, p.onNavigate)}
            </>,
          )}
          {group(
            "Estilo actual",
            <p className="ribbon-note">
              {academicPresets[style].label}
              <br />
              {p.layout.columns ?? 1} columna(s) ·{" "}
              {p.layout.format.toUpperCase()}
            </p>,
          )}
        </>
      )}
      {p.tab === "Formato de imagen" &&
        group(
          "Imagen seleccionada",
          <>
            <label>
              Ancho (px)
              <input
                type="number"
                min="24"
                max="2400"
                value={
                  p.selected
                    ? Math.round(p.selected.width / 0.75)
                    : Number(editor?.getAttributes(mediaType).width) || 400
                }
                onChange={(e) => {
                  const width = Math.max(
                    24,
                    Math.min(2400, Number(e.target.value)),
                  );
                  if (p.selected)
                    p.onSelected({
                      ...p.selected,
                      width: width * 0.75,
                      height:
                        (width * 0.75 * p.selected.height) / p.selected.width,
                    });
                  else
                    editor
                      ?.chain()
                      .focus()
                      .updateAttributes(mediaType, { width })
                      .run();
                }}
              />
            </label>
            <select
              aria-label="Alineación de imagen"
              disabled={!!p.selected}
              onChange={(e) =>
                editor
                  ?.chain()
                  .focus()
                  .updateAttributes(mediaType, { align: e.target.value })
                  .run()
              }
              value={String(editor?.getAttributes(mediaType).align ?? "left")}
            >
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
            {action("Título y nota", Quote, captionDialog, !editor)}
            {action(
              "Eliminar imagen",
              X,
              () =>
                p.selected
                  ? p.onDeleteSelected()
                  : editor?.chain().focus().deleteSelection().run(),
              !editor && !p.selected,
            )}
          </>,
        )}
      {p.tab === "Diseño de tabla" &&
        group(
          "Tabla seleccionada",
          <>
            <div className="index-buttons">
              {[
                ["Fila arriba", "addRowBefore"],
                ["Fila abajo", "addRowAfter"],
                ["Columna izquierda", "addColumnBefore"],
                ["Columna derecha", "addColumnAfter"],
                ["Eliminar fila", "deleteRow"],
                ["Eliminar columna", "deleteColumn"],
                ["Unir celdas", "mergeCells"],
                ["Dividir celda", "splitCell"],
                ["Fila de encabezado", "toggleHeaderRow"],
                ["Eliminar tabla", "deleteTable"],
              ].map(([label, command]) => (
                <Button
                  key={command}
                  disabled={!editor}
                  onClick={() => {
                    if (!editor) return;
                    const chain = editor.chain().focus() as unknown as Record<
                      string,
                      () => { run: () => boolean }
                    >;
                    chain[command]().run();
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            {action("Título y nota", Quote, captionDialog, !editor)}
          </>,
        )}
    </>
  );
  const modal =
    dialog &&
    createPortal(
      <div className="modal-shade word-modal-shade">
        <section
          className="word-dialog modal"
          role="dialog"
          aria-modal="true"
          aria-label={
            dialog === "references"
              ? "Citas y referencias"
              : "Herramientas del documento"
          }
        >
          <header>
            <h2>
              {
                {
                  paragraph: "Párrafo",
                  list: "Viñetas y numeración",
                  caption: "Título y nota",
                  equation: "Insertar ecuación",
                  chart: "Crear gráfico",
                  shape: "Formas e íconos",
                  video: "Insertar video",
                  comment: "Nuevo comentario",
                  appendix: "Nuevo apéndice",
                  blank: "Página en blanco",
                  watermark: "Marca de agua",
                  layout: "Papel y disposición",
                  headers: "Encabezados, pies y numeración",
                  reference: "Crear referencia",
                  references: "Citas y referencias",
                  symbol: "Símbolos y caracteres",
                  statistics: "Estadísticas",
                  replace: "Buscar y reemplazar",
                  "new-section": "Crear sección",
                  sections: "Secciones del documento",
                }[dialog]
              }
            </h2>
            <Button title="Cerrar" onClick={() => setDialog("")}>
              <X size={19} />
            </Button>
          </header>
          {(dialog === "new-section" || dialog === "sections") && (
            <>
              <p>
                Las secciones permiten cambiar papel, orientación, columnas,
                márgenes, encabezados y numeración dentro del mismo documento.
              </p>
              {dialog === "sections" && (
                <label>
                  Sección
                  <select
                    aria-label="Seleccionar sección"
                    value={fields.sectionId}
                    onChange={(e) => {
                      const s = sections.find((s) => s.id === e.target.value)!;
                      setFields({
                        sectionId: s.id,
                        title: s.title,
                        kind: s.kind,
                        link: String(s.linkToPrevious),
                        restart: String(s.restartNumbering),
                        start: String(s.layout.pageNumberStart ?? 1),
                      });
                    }}
                  >
                    {sections.map((s, i) => (
                      <option key={s.id || "first"} value={s.id}>
                        {i + 1}. {s.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="form-grid">
                {(dialog === "new-section" || fields.sectionId) &&
                  field("title", "Nombre de la sección")}
                {(dialog === "new-section" || fields.sectionId) && (
                  <>
                    {field(
                      "kind",
                      "Tipo de salto",
                      "text",
                      Object.entries(sectionKinds) as [string, string][],
                    )}
                    {field("link", "Encabezados y pies", "text", [
                      ["true", "Vincular a la sección anterior"],
                      ["false", "Independientes"],
                    ])}
                    {field("restart", "Numeración", "text", [
                      ["false", "Continuar numeración"],
                      ["true", "Reiniciar en esta sección"],
                    ])}
                  </>
                )}
                {field("start", "Número inicial", "number")}
              </div>
              {dialog === "new-section" && (
                <p>
                  Se insertará después del párrafo o bloque actual. Coloca luego
                  el cursor en la nueva sección para configurar su diseño.
                  Cambiar el tamaño de papel u orientación requiere una página
                  nueva.
                </p>
              )}
              {dialog === "sections" && fields.sectionId && (
                <div className="section-actions">
                  <Button
                    onClick={() => {
                      p.onLocate(fields.sectionId);
                      if (editor) {
                        let found = -1;
                        editor.state.doc.forEach((n, pos) => {
                          if (n.attrs.id === fields.sectionId) found = pos;
                        });
                        if (found >= 0)
                          editor
                            .chain()
                            .focus()
                            .setTextSelection(found + 1)
                            .run();
                      }
                      setDialog("");
                    }}
                  >
                    Ir a la sección
                  </Button>
                  <Button
                    onClick={() => {
                      if (p.flow)
                        p.onFlow({
                          ...p.flow,
                          content: {
                            ...p.flow.content,
                            content: p.flow.content.content?.filter(
                              (n) =>
                                !(
                                  n.type === "sectionBreak" &&
                                  n.attrs?.id === fields.sectionId
                                ),
                            ),
                          },
                        });
                      setDialog("");
                    }}
                  >
                    Eliminar salto y unir secciones
                  </Button>
                </div>
              )}
            </>
          )}
          {dialog === "replace" && (
            <>
              <div className="form-grid">
                {field("query", "Buscar texto")}
                {field("replacement", "Reemplazar por")}
                {field("case", "Mayúsculas y minúsculas", "text", [
                  ["false", "No distinguir"],
                  ["true", "Distinguir"],
                ])}
                {field("word", "Coincidencia", "text", [
                  ["false", "Cualquier coincidencia"],
                  ["true", "Palabra completa"],
                ])}
              </div>
              <p>
                {editor
                  ? replacementMatches(
                      editor.state.doc,
                      fields.query ?? "",
                      fields.case === "true",
                      fields.word === "true",
                    ).length
                  : 0}{" "}
                coincidencia(s) en el texto editable. Las citas, imágenes y
                textos de índices automáticos se conservan.
              </p>
              <div className="section-actions">
                {[false, true].map((all) => (
                  <Button
                    key={String(all)}
                    disabled={!fields.query || !editor}
                    onClick={() => {
                      try {
                        if (!editor) return;
                        const count = replaceText(
                          editor,
                          fields.query,
                          fields.replacement ?? "",
                          {
                            caseSensitive: fields.case === "true",
                            wholeWord: fields.word === "true",
                            all,
                          },
                        );
                        setSelectedStats(count + " reemplazo(s) realizado(s)");
                      } catch (e) {
                        p.onError(e);
                      }
                    }}
                  >
                    {all ? "Reemplazar todo" : "Reemplazar siguiente"}
                  </Button>
                ))}
              </div>
              <p role="status">{selectedStats}</p>
            </>
          )}
          {dialog === "paragraph" && (
            <div className="form-grid">
              {field("first", "Primera línea (pt)", "number")}
              {field("hanging", "Sangría francesa (pt)", "number")}
              {field("line", "Interlineado", "number")}
              {field("before", "Espacio antes (pt)", "number")}
              {field("after", "Espacio después (pt)", "number")}
            </div>
          )}
          {dialog === "list" && (
            <div className="form-grid">
              {field("kind", "Tipo", "text", [
                ["bullet", "Viñetas"],
                ["ordered", "Numeración"],
              ])}
              {field(
                "style",
                "Estilo",
                "text",
                fields.kind === "bullet"
                  ? [
                      ["disc", "• Punto"],
                      ["circle", "◦ Círculo"],
                      ["square", "▪ Cuadrado"],
                      ["check", "✓ Marca"],
                      ["arrow", "→ Flecha"],
                    ]
                  : [
                      ["decimal", "1, 2, 3"],
                      ["lower-alpha", "a, b, c"],
                      ["upper-alpha", "A, B, C"],
                      ["lower-roman", "i, ii, iii"],
                      ["upper-roman", "I, II, III"],
                    ],
              )}
              {field("start", "Comenzar en", "number")}
            </div>
          )}
          {dialog === "caption" && (
            <>
              {field("title", "Nombre de la tabla o figura")}
              {field("note", "Nota o procedencia", "textarea")}
              <p>
                El número se actualiza al añadir, eliminar o reordenar
                elementos. El estilo académico determina la posición del título
                y la nota.
              </p>
            </>
          )}
          {dialog === "equation" && (
            <>
              {field("latex", "Ecuación en LaTeX", "textarea")}
              <div className="equation-examples">
                {[
                  "\\frac{a}{b}",
                  "\\sum_{i=1}^{n} x_i",
                  "\\int_0^1 x^2 dx",
                  "\\sqrt{x^2+y^2}",
                  "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}",
                ].map((v) => (
                  <Button
                    key={v}
                    onClick={() => setFields({ ...fields, latex: v })}
                  >
                    {v}
                  </Button>
                ))}
              </div>
              <p>
                Se representa localmente y se incluye como imagen nítida en el
                PDF.
              </p>
            </>
          )}
          {dialog === "chart" && (
            <>
              {field("title", "Título")}
              {field("kind", "Tipo", "text", [
                ["bar", "Barras"],
                ["line", "Líneas"],
                ["pie", "Circular"],
              ])}
              {field("values", "Datos: una fila «Nombre; 25»", "textarea")}
              {field("color", "Color", "color")}
            </>
          )}
          {dialog === "shape" && (
            <>
              {field("kind", "Forma", "text", [
                ["rectangle", "Rectángulo"],
                ["ellipse", "Elipse"],
                ["triangle", "Triángulo"],
                ["arrow", "Flecha"],
                ["star", "Estrella"],
                ["heart", "Corazón"],
              ])}
              {field("title", "Texto interior")}
              {field("color", "Color", "color")}
              <Button onClick={() => setDialog("symbol")}>
                Insertar un ícono como carácter
              </Button>
            </>
          )}
          {dialog === "video" && (
            <>
              {field("title", "Título")}
              {field("url", "Enlace del video")}
              <Button onClick={() => fileInput.current?.click()}>
                Elegir video local (máx. 25 MB)
              </Button>
              <input
                ref={fileInput}
                hidden
                type="file"
                accept="video/mp4,video/webm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 25 * 1024 * 1024) {
                    p.onError(new Error("El video supera 25 MB."));
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setVideoData(String(reader.result));
                  reader.readAsDataURL(f);
                }}
              />
              {videoData && (
                <video controls src={videoData} style={{ width: "100%" }} />
              )}
              <p>
                El proyecto conserva el video local. El PDF incluye una portada
                y, cuando existe, un enlace para abrirlo.
              </p>
            </>
          )}
          {dialog === "comment" && (
            <>
              {field("text", "Comentario", "textarea")}
              {field("author", "Autor (opcional)")}
            </>
          )}
          {dialog === "appendix" && field("title", "Nombre del apéndice")}
          {dialog === "blank" &&
            field("placement", "Añadir página", "text", [
              ["above", "Encima de la actual"],
              ["below", "Debajo de la actual"],
              ["end", "Al final"],
            ])}
          {dialog === "watermark" && (
            <>
              {field("text", "Texto (vacío para quitar)")}
              <div className="form-grid">
                {field("color", "Color", "color")}
                {field("opacity", "Opacidad de 0 a 1", "number")}
                {field("angle", "Ángulo (grados)", "number")}
                {field("size", "Tamaño (pt)", "number")}
              </div>
              <p>Las páginas nuevas heredan esta marca de agua.</p>
            </>
          )}
          {dialog === "layout" && (
            <div className="form-grid">
              {field("format", "Tamaño de papel", "text", [
                ["a4", "A4"],
                ["letter", "Carta"],
                ["legal", "Oficio"],
                ["a3", "A3"],
                ["a5", "A5"],
                ["b5", "B5"],
                ["tabloid", "Tabloide"],
                ["custom", "Personalizado"],
              ])}
              {field("orientation", "Orientación", "text", [
                ["portrait", "Vertical"],
                ["landscape", "Horizontal"],
              ])}
              {fields.format === "custom" && (
                <>
                  {field("width", "Ancho (mm)", "number")}
                  {field("height", "Alto (mm)", "number")}
                </>
              )}
              {["top", "bottom", "left", "right"].map((key, i) => (
                <div key={key}>
                  {field(
                    key,
                    [
                      "Superior (mm)",
                      "Inferior (mm)",
                      "Izquierdo (mm)",
                      "Derecho (mm)",
                    ][i],
                    "number",
                  )}
                </div>
              ))}
              {field("columns", "Columnas", "text", [
                ["1", "Una"],
                ["2", "Dos"],
                ["3", "Tres"],
              ])}
              {field("gap", "Separación de columnas (mm)", "number")}
            </div>
          )}
          {dialog === "headers" && (
            <>
              {field("header", "Encabezado")}
              {field("footer", "Pie de página")}
              <div className="form-grid">
                {field("first", "Primera página diferente", "text", [
                  ["false", "No"],
                  ["true", "Sí"],
                ])}
                {field("even", "Pares e impares diferentes", "text", [
                  ["false", "No"],
                  ["true", "Sí"],
                ])}
                {fields.first === "true" && (
                  <>
                    {field("headerFirst", "Encabezado primera")}
                    {field("footerFirst", "Pie primera")}
                  </>
                )}
                {fields.even === "true" && (
                  <>
                    {field("headerEven", "Encabezado pares")}
                    {field("footerEven", "Pie pares")}
                  </>
                )}
                {field("numbering", "Números de página", "text", [
                  ["false", "Ocultar"],
                  ["true", "Mostrar"],
                ])}
                {field("position", "Posición", "text", [
                  ["header-right", "Arriba a la derecha"],
                  ["footer-center", "Abajo al centro"],
                  ["footer-right", "Abajo a la derecha"],
                ])}
                {field("start", "Número inicial", "number")}
              </div>
            </>
          )}
          {dialog === "references" && (
            <>
              <label>
                Página o localizador de la próxima cita (opcional)
                <input
                  aria-label="Página de la cita"
                  placeholder="Ejemplo: 25–27"
                  value={citationPage}
                  onChange={(e) => setCitationPage(e.target.value)}
                />
              </label>
              <div className="reference-actions">
                <Button
                  className="primary"
                  onClick={() => {
                    setRef(emptyRef());
                    setDialog("reference");
                  }}
                >
                  Nueva fuente / URL
                </Button>
                <Button
                  onClick={() =>
                    insert({
                      type: "generatedIndex",
                      attrs: { id: uid(), kind: "references" },
                      content: [],
                    })
                  }
                >
                  Insertar bibliografía
                </Button>
              </div>
              {!p.flow?.references?.length && (
                <p>
                  Añade una URL, un libro, un artículo u otra fuente. Los datos
                  se guardan en tu proyecto.
                </p>
              )}
              {(p.flow?.references ?? []).map((r, i) => {
                const occurrences = collectCitationOccurrences(
                  p.flow!.content,
                  r.id,
                );
                return (
                  <article className="reference-card" key={r.id}>
                    <p>{formatReference(r, style, i + 1)}</p>
                    <small>{occurrences.length} cita(s) en el documento</small>
                    <div>
                      <Button
                        onClick={() => {
                          insert({
                            type: "citation",
                            attrs: {
                              id: uid(),
                              refId: r.id,
                              locator: citationPage,
                            },
                          });
                          setDialog("");
                        }}
                      >
                        Citar aquí
                      </Button>
                      <Button
                        onClick={() => {
                          setRef(r);
                          setDialog("reference");
                        }}
                      >
                        Editar fuente
                      </Button>
                      <Button
                        onClick={() =>
                          setReferenceTab(referenceTab === r.id ? "list" : r.id)
                        }
                      >
                        Ver citas
                      </Button>
                      <Button
                        disabled={!!occurrences.length}
                        onClick={() => {
                          const references = p.flow!.references!.filter(
                            (n) => n.id !== r.id,
                          );
                          p.onFlow({
                            ...p.flow!,
                            references,
                            content: normalizeAcademicDocument(
                              p.flow!.content,
                              references,
                              style,
                            ),
                          });
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                    {referenceTab === r.id &&
                      occurrences.map((o) => (
                        <button
                          className="citation-result"
                          key={o.id}
                          onClick={() => {
                            setDialog("");
                            p.onLocate(o.blockId);
                          }}
                        >
                          {o.label} · {o.context}
                        </button>
                      ))}
                  </article>
                );
              })}
              <p className="reference-hint">
                {academicPresets[style].description}
              </p>
            </>
          )}
          {dialog === "reference" && (
            <>
              <label>
                URL de la fuente
                <div className="url-builder">
                  <input
                    value={ref.url ?? ""}
                    onChange={(e) => setRef({ ...ref, url: e.target.value })}
                  />
                  <Button
                    onClick={() => {
                      try {
                        const base = referenceFromUrl(ref.url ?? "", ref.id);
                        setRef({
                          ...base,
                          ...ref,
                          url: base.url,
                          site: ref.site || base.site,
                        });
                      } catch (e) {
                        p.onError(e);
                      }
                    }}
                  >
                    Preparar desde URL
                  </Button>
                </div>
              </label>
              <p>
                Introduce autor, título y fecha comprobados. La URL se analiza
                localmente; no consulta ni envía tu documento.
              </p>
              <div className="form-grid">
                <label>
                  Tipo
                  <select
                    value={ref.type}
                    onChange={(e) =>
                      setRef({
                        ...ref,
                        type: e.target.value as ReferenceRecord["type"],
                      })
                    }
                  >
                    {[
                      ["web", "Página web"],
                      ["book", "Libro"],
                      ["article", "Artículo"],
                      ["report", "Informe"],
                      ["thesis", "Tesis"],
                      ["video", "Video"],
                      ["dataset", "Datos"],
                      ["other", "Otro"],
                    ].map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                {(
                  [
                    "author",
                    "title",
                    "year",
                    "site",
                    "publisher",
                    "journal",
                    "volume",
                    "issue",
                    "pages",
                    "doi",
                    "accessed",
                    "edition",
                    "place",
                  ] as const
                ).map((key, i) => (
                  <label key={key}>
                    {
                      [
                        "Autor(es): Apellido, Iniciales; otro autor",
                        "Título",
                        "Año o s. f.",
                        "Sitio web",
                        "Editorial / institución",
                        "Revista",
                        "Volumen",
                        "Número",
                        "Páginas",
                        "DOI",
                        "Fecha de consulta",
                        "Edición",
                        "Lugar",
                      ][i]
                    }
                    <input
                      value={String(ref[key] ?? "")}
                      onChange={(e) =>
                        setRef({ ...ref, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="reference-preview">
                <label>
                  Idioma del título
                  <select
                    aria-label="Idioma de la referencia"
                    value={ref.language ?? "es-ES"}
                    onChange={(e) =>
                      setRef({ ...ref, language: e.target.value })
                    }
                  >
                    <option value="es-ES">Español</option>
                    <option value="en-US">Inglés</option>
                    <option value="pt-BR">Portugués</option>
                    <option value="fr-FR">Francés</option>
                    <option value="de-DE">Alemán</option>
                  </select>
                </label>
                <small>Vista previa · {academicPresets[style].label}</small>
                <p>{formatReference(ref, style, 1)}</p>
                <small>
                  {missingReferenceFields(ref).length
                    ? "Datos pendientes: " +
                      missingReferenceFields(ref).join(", ")
                    : "Datos básicos completos"}
                </small>
              </div>
            </>
          )}
          {dialog === "symbol" && (
            <>
              <select
                value={symbolGroup}
                onChange={(e) => setSymbolGroup(e.target.value)}
              >
                {Object.keys(symbolGroups).map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <div className="symbol-grid">
                {symbolGroups[symbolGroup].map((s) => (
                  <Button
                    key={s}
                    title={
                      s + " · U+" + s.codePointAt(0)!.toString(16).toUpperCase()
                    }
                    onClick={() => insert({ type: "text", text: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <label>
                Otro carácter o código Unicode (ej. U+221E)
                <div className="url-builder">
                  <input
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      try {
                        const match = character.match(/^U\+([\da-f]{1,6})$/i);
                        insert({
                          type: "text",
                          text: match
                            ? String.fromCodePoint(parseInt(match[1], 16))
                            : character,
                        });
                      } catch (e) {
                        p.onError(e);
                      }
                    }}
                  >
                    Insertar
                  </Button>
                </div>
              </label>
            </>
          )}
          {dialog === "statistics" && (
            <>
              {Object.entries(
                p.flow
                  ? documentStatistics(p.flow.content)
                  : textStatistics(editor?.getText() ?? ""),
              ).map(([key, value]) => (
                <p key={key}>
                  {
                    (
                      {
                        words: "Palabras",
                        characters: "Caracteres",
                        withoutSpaces: "Caracteres sin espacios",
                        numbers: "Números",
                        sum: "Suma de números",
                      } as Record<string, string>
                    )[key]
                  }
                  : <strong>{value.toLocaleString("es-CO")}</strong>
                </p>
              ))}
              <p>{selectedStats}</p>
            </>
          )}
          {!["references", "symbol", "statistics", "replace"].includes(
            dialog,
          ) && (
            <footer>
              <Button onClick={() => setDialog("")}>Cancelar</Button>
              <Button
                disabled={working}
                className="primary"
                onClick={() => void submit()}
              >
                {working
                  ? "Preparando…"
                  : dialog === "reference"
                    ? "Guardar fuente"
                    : "Aplicar"}
              </Button>
            </footer>
          )}
        </section>
      </div>,
      document.body,
    );
  return (
    <>
      {tools}
      {modal}
    </>
  );
}
