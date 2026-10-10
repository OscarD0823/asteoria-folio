import { useEffect, useRef, useState, type PointerEvent } from "react";
import { PageCanvas, MarkView } from "./components";
import { RichEditor, type RichEditorInstance } from "./LazyRichEditor";
import { getPdf, pdfjs } from "./renderer";
import { runNative, type Inspection, type NativeObject } from "./native";
import { fontCss } from "./fonts";
import { plainText, type RichNode } from "./flow";
import {
  rotation,
  turnPoint,
  uid,
  type Mark,
  type Page,
  type Source,
  type Tool,
} from "./pdf";

export type FrameProps = {
  page: Page;
  source: Source;
  number: number;
  width: number;
  tool: Tool;
  color: string;
  size: number;
  selected: string;
  editing: string;
  onActive: () => void;
  onSelect: (id: string, edit?: boolean) => void;
  onEditor: (editor: RichEditorInstance) => void;
  onMark: (mark: Mark) => void;
  onAdd: (mark: Mark) => void;
  onNative: (object: NativeObject) => Promise<void>;
  onArea: (rect: [number, number, number, number]) => void;
  onHighlight: (marks: Mark[]) => void;
  onError: (error: unknown) => void;
  onPlace: (x: number, y: number) => void;
  readonly?: boolean;
};
function RichView({ node }: { node: RichNode }) {
  if (node.type === "text") {
    let element: React.ReactNode = node.text;
    for (const m of node.marks ?? []) {
      if (m.type === "bold") element = <strong>{element}</strong>;
      else if (m.type === "italic") element = <em>{element}</em>;
      else if (m.type === "underline") element = <u>{element}</u>;
      else if (m.type === "strike") element = <s>{element}</s>;
      else if (m.type === "superscript") element = <sup>{element}</sup>;
      else if (m.type === "subscript") element = <sub>{element}</sub>;
      else if (m.type === "code") element = <code>{element}</code>;
      else if (m.type === "link")
        element = <u style={{ color: "#5146cc" }}>{element}</u>;
      else if (m.type === "textStyle")
        element = (
          <span
            style={{
              fontFamily: fontCss(String(m.attrs?.fontFamily)),
              fontSize: m.attrs?.fontSize as string,
              color: m.attrs?.color as string,
              backgroundColor: m.attrs?.backgroundColor as string,
            }}
          >
            {element}
          </span>
        );
    }
    return element;
  }
  if (node.type === "hardBreak") return <br />;
  return (
    <div
      style={{
        textAlign: node.attrs?.textAlign as React.CSSProperties["textAlign"],
        lineHeight: node.attrs?.lineHeight as string,
      }}
    >
      {node.content?.map((n, i) => (
        <RichView key={i} node={n} />
      ))}
    </div>
  );
}
function markContent(m: Mark): RichNode {
  if (m.richText) return m.richText;
  return {
    type: "doc",
    content: (m.text ?? "").split("\n").map((text) => ({
      type: "paragraph",
      content: text
        ? [
            {
              type: "text",
              text,
              marks: [
                ...(m.bold ? [{ type: "bold" }] : []),
                ...(m.italic ? [{ type: "italic" }] : []),
                ...(m.underline ? [{ type: "underline" }] : []),
                ...(m.strike ? [{ type: "strike" }] : []),
                {
                  type: "textStyle",
                  attrs: {
                    fontFamily: m.font ?? "PrismaSans",
                    fontSize: m.size + "pt",
                    color: m.color,
                  },
                },
              ],
            },
          ]
        : [],
    })),
  };
}
export function PageFrame(props: FrameProps) {
  const { page, source, number, width, tool, selected, editing, readonly } =
    props;
  const root = useRef<HTMLDivElement>(null),
    textLayer = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<[number, number]>([595, 842]),
    [inspection, setInspection] = useState<Inspection | null>(null),
    [visible, setVisible] = useState(false),
    [draft, setDraft] = useState<Mark | null>(null);
  const [w, h] = dimensions,
    scale = width / w;
  const inspectEnabled =
    !readonly && ["select", "edit", "objects"].includes(tool);
  const gesture = useRef<{
    mode: "move" | "resize" | "draw" | "area";
    start: [number, number];
    mark: Mark;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await (await getPdf(source)).getPage(page.index + 1),
        v = p.getViewport({
          scale: 1,
          rotation: rotation(p.rotate + page.rotation),
        });
      if (!cancelled) setDimensions([v.width, v.height]);
    })().catch(props.onError);
    return () => {
      cancelled = true;
    };
  }, [source.id, page.index, page.rotation]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries[0].isIntersecting);
      },
      { rootMargin: "150px", threshold: 0.1 },
    );
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [page.id]);
  useEffect(() => {
    let cancelled = false;
    setInspection(null);
    if (!visible || !inspectEnabled) return;
    runNative({ action: "inspect", bytes: source.bytes, index: page.index })
      .then((v) => {
        if (!cancelled) setInspection(v as Inspection);
      })
      .catch(props.onError);
    return () => {
      cancelled = true;
    };
  }, [source.id, page.index, visible, inspectEnabled]);
  useEffect(() => {
    let cancelled = false;
    let layer: InstanceType<typeof pdfjs.TextLayer> | undefined;
    const container = textLayer.current;
    if (!container) return;
    container.replaceChildren();
    if (
      !visible ||
      readonly ||
      !["select", "highlight", "underline", "strikeout"].includes(tool)
    )
      return;
    (async () => {
      const p = await (await getPdf(source)).getPage(page.index + 1);
      if (cancelled) return;
      const viewport = p.getViewport({
        scale: width / w,
        rotation: rotation(p.rotate + page.rotation),
      });
      container.style.setProperty("--scale-factor", String(width / w));
      container.style.setProperty("--total-scale-factor", String(width / w));
      layer = new pdfjs.TextLayer({
        textContentSource: await p.getTextContent(),
        container,
        viewport,
      });
      if (cancelled) return;
      await layer.render();
    })().catch(props.onError);
    return () => {
      cancelled = true;
      layer?.cancel();
    };
  }, [source.id, page.index, page.rotation, width, w, visible, tool, readonly]);
  function point(e: PointerEvent): [number, number] {
    const rect = root.current!.getBoundingClientRect();
    return [
      Math.max(0, Math.min(w, (e.clientX - rect.left) / scale)),
      Math.max(0, Math.min(h, (e.clientY - rect.top) / scale)),
    ];
  }
  function markDown(e: PointerEvent, m: Mark, resize = false) {
    if (readonly || editing === m.id) return;
    e.stopPropagation();
    props.onActive();
    props.onSelect(m.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {
      mode: resize ? "resize" : "move",
      start: point(e),
      mark: m,
    };
    setDraft(m);
  }
  function down(e: PointerEvent) {
    if (readonly || e.button !== 0) return;
    props.onActive();
    if (
      [
        "select",
        "edit",
        "objects",
        "highlight",
        "underline",
        "strikeout",
      ].includes(tool)
    ) {
      if (e.target === e.currentTarget) props.onSelect("");
      return;
    }
    const [x, y] = point(e);
    if (["text", "image", "signature"].includes(tool)) {
      props.onPlace(x, y);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const mark: Mark = {
      id: uid(),
      type: tool as Mark["type"],
      x,
      y,
      width: 1,
      height: 1,
      color: props.color,
      size: props.size,
      viewRotation: page.rotation,
      points: tool === "draw" ? [[0, 0]] : undefined,
    };
    gesture.current = {
      mode: tool === "draw" ? "draw" : "area",
      start: [x, y],
      mark,
    };
    setDraft(mark);
  }
  function move(e: PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const [x, y] = point(e),
      dx = x - g.start[0],
      dy = y - g.start[1];
    let m = { ...g.mark };
    if (g.mode === "move") {
      const delta = rotation(page.rotation - m.viewRotation);
      const local =
        delta === 90
          ? [dy, -dx]
          : delta === 180
            ? [-dx, -dy]
            : delta === 270
              ? [-dy, dx]
              : [dx, dy];
      m.x += local[0];
      m.y += local[1];
    } else if (g.mode === "resize") {
      const delta = rotation(page.rotation - m.viewRotation);
      const local =
        delta === 90
          ? [dy, -dx]
          : delta === 180
            ? [-dx, -dy]
            : delta === 270
              ? [-dy, dx]
              : [dx, dy];
      m.width = Math.max(20, m.width + local[0]);
      m.height =
        ["image", "signature"].includes(m.type) && !e.shiftKey
          ? (m.width * g.mark.height) / g.mark.width
          : Math.max(12, m.height + local[1]);
    } else if (g.mode === "draw") {
      m.points = [...(draft?.points ?? m.points ?? []), [x - m.x, y - m.y]];
      m.width = Math.max(m.width, x - m.x, 1);
      m.height = Math.max(m.height, y - m.y, 1);
    } else {
      m.x = Math.min(x, g.start[0]);
      m.y = Math.min(y, g.start[1]);
      m.width = Math.abs(dx);
      m.height = Math.abs(dy);
    }
    setDraft(m);
  }
  function up() {
    const g = gesture.current,
      m = draft;
    gesture.current = null;
    setDraft(null);
    if (!g || !m) return;
    if (g.mode === "move" || g.mode === "resize") props.onMark(m);
    else if (m.width > 2 && m.height > 2) {
      if (m.type === "redact")
        props.onArea([m.x, m.y, m.x + m.width, m.y + m.height]);
      else props.onAdd(m);
    }
  }
  function selectedText() {
    if (!["highlight", "underline", "strikeout"].includes(tool)) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!textLayer.current?.contains(range.commonAncestorContainer)) return;
    const rect = root.current!.getBoundingClientRect();
    const marks: Array<Mark> = Array.from(range.getClientRects())
      .filter((r) => r.width > 1 && r.height > 1)
      .map((r) => ({
        id: uid(),
        type: tool as Mark["type"],
        x: (r.left - rect.left) / scale,
        y: (r.top - rect.top) / scale,
        width: r.width / scale,
        height: r.height / scale,
        color: props.color,
        size: Math.max(0.7, props.size / 8),
        viewRotation: page.rotation,
      }));
    if (marks.length) props.onHighlight(marks);
    selection.removeAllRanges();
  }
  return (
    <section
      className="page-section"
      id={"page-" + page.id}
      data-page-number={number}
    >
      <div className="page-caption">
        <span>PÁGINA {number}</span>
        <span>
          {Math.round(w)} × {Math.round(h)} pt
        </span>
      </div>
      <div
        ref={root}
        className={`page-surface tool-${tool}`}
        style={{ width, height: (width * h) / w }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => {
          up();
          selectedText();
        }}
        onPointerCancel={() => {
          gesture.current = null;
          setDraft(null);
        }}
      >
        {visible && (
          <PageCanvas
            source={source}
            page={page}
            width={width}
            onSize={(pw, ph) =>
              setDimensions((old) =>
                old[0] === pw && old[1] === ph ? old : [pw, ph],
              )
            }
            onError={props.onError}
          />
        )}
        <div
          ref={textLayer}
          className="textLayer"
          style={{
            pointerEvents:
              ["select", "highlight", "underline", "strikeout"].includes(
                tool,
              ) && !readonly
                ? "auto"
                : "none",
          }}
        />
        {inspection?.objects
          .filter((o) =>
            tool === "edit"
              ? o.kind === "text"
              : tool === "objects"
                ? o.kind === "image"
                : o.kind === "image",
          )
          .map((o) => {
            const [bw, bh] = page.rotation % 180 ? [h, w] : [w, h];
            const [x, y] = turnPoint(o.x, o.y, bw, bh, page.rotation);
            return (
              <button
                key={o.id}
                className={`native-object ${o.kind}`}
                aria-label={
                  o.kind === "text"
                    ? `Editar texto: ${o.text}`
                    : "Seleccionar imagen original"
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (o.editable) void props.onNative(o);
                  else
                    props.onError(
                      new Error(
                        "Este texto está girado. Puedes reemplazarlo por área.",
                      ),
                    );
                }}
                style={{
                  left: x * scale,
                  top: y * scale,
                  width: o.width * scale,
                  height: o.height * scale,
                  transform: `rotate(${page.rotation}deg)`,
                  transformOrigin: "0 0",
                }}
              />
            );
          })}
        {(visible ? page.marks : []).map((original) => {
          const m = draft?.id === original.id ? draft : original;
          const delta = rotation(page.rotation - m.viewRotation),
            [bw, bh] = delta % 180 ? [h, w] : [w, h],
            [x, y] = turnPoint(m.x, m.y, bw, bh, delta);
          return (
            <div key={m.id}>
              {m.type === "text" ? (
                <div
                  className={`text-mark ${selected === m.id ? "selected" : ""} ${editing === m.id ? "editing" : ""}`}
                  style={{
                    left: x * scale,
                    top: y * scale,
                    width: m.width * scale,
                    minHeight: m.height * scale,
                    transform: `rotate(${delta}deg)`,
                    transformOrigin: "0 0",
                  }}
                  onPointerDown={(e) => markDown(e, m)}
                  onDoubleClick={() => props.onSelect(m.id, true)}
                >
                  <div
                    style={{
                      width: m.width / 0.75,
                      zoom: scale * 0.75,
                      fontSize: `${m.size}pt`,
                      fontFamily: fontCss(m.font),
                      fontWeight:
                        !m.richText && editing !== m.id && m.bold ? 700 : 400,
                      fontStyle:
                        !m.richText && editing !== m.id && m.italic
                          ? "italic"
                          : "normal",
                      color: m.color,
                      lineHeight: m.lineHeight ?? 1.25,
                    }}
                  >
                    {editing === m.id ? (
                      <RichEditor
                        inline
                        autoFocus
                        content={markContent(m)}
                        onFocus={props.onEditor}
                        onChange={(node) =>
                          props.onMark({
                            ...m,
                            bold: false,
                            italic: false,
                            underline: false,
                            strike: false,
                            richText: node,
                            text: plainText(node),
                          })
                        }
                      />
                    ) : m.richText ? (
                      <RichView node={m.richText} />
                    ) : (
                      <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                    )}
                  </div>
                </div>
              ) : (
                <MarkView
                  mark={m}
                  page={page}
                  w={w}
                  h={h}
                  scale={scale}
                  selected={selected === m.id}
                  onDown={
                    readonly || !["select", "edit", "objects"].includes(tool)
                      ? undefined
                      : (e) => markDown(e, m)
                  }
                />
              )}
              {selected === m.id && !readonly && (
                <button
                  className="resize-handle"
                  aria-label="Cambiar tamaño"
                  style={{
                    left: (x + m.width) * scale - 5,
                    top: (y + m.height) * scale - 5,
                  }}
                  onPointerDown={(e) => markDown(e, m, true)}
                />
              )}
            </div>
          );
        })}
        {draft && !page.marks.some((m) => m.id === draft.id) && (
          <MarkView mark={draft} page={page} w={w} h={h} scale={scale} />
        )}
      </div>
    </section>
  );
}
