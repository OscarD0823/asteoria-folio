import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowRight, Trash2, X } from "lucide-react";
import { rotation, turnPoint, type Mark, type Page, type Source } from "./pdf";
import { getPdf } from "./renderer";
import { fontCss } from "./fonts";
import { canvasRatio } from "./performance";
export function PageThumbnail({
  source,
  page,
  width = 112,
}: {
  source: Source;
  page: Page;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [visible, setVisible] = useState(false),
    [dimensions, setDimensions] = useState<[number, number]>([595, 842]);
  const [w, h] = dimensions;
  useEffect(() => {
    const o = new IntersectionObserver(
      (es) => setVisible(es[0].isIntersecting),
      { rootMargin: "150px" },
    );
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ position: "relative", width, height: (width * h) / w }}
    >
      {visible && (
        <>
          <PageCanvas
            source={source}
            page={page}
            width={width}
            onSize={(w, h) =>
              setDimensions((old) =>
                old[0] === w && old[1] === h ? old : [w, h],
              )
            }
          />
          {page.marks.map((m) => (
            <MarkView
              key={m.id}
              mark={m}
              page={page}
              w={w}
              h={h}
              scale={width / w}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function Button({
  children,
  title,
  onClick,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}
export function PageCanvas({
  source,
  page,
  width,
  onSize,
  onError,
}: {
  source: Source;
  page: Page;
  width: number;
  onSize?: (w: number, h: number) => void;
  onError?: (msg: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    let cancelled = false;
    let task: { cancel: () => void } | undefined;
    (async () => {
      try {
        const pdf = await getPdf(source);
        const p = await pdf.getPage(page.index + 1);
        if (cancelled) return;
        const viewport = p.getViewport({
          scale: 1,
          rotation: rotation(p.rotate + page.rotation),
        });
        onSize?.(viewport.width, viewport.height);
        const memory = (navigator as Navigator & { deviceMemory?: number })
          .deviceMemory;
        const budget =
          window.innerWidth < 850 || (memory && memory <= 4)
            ? 2_000_000
            : 6_000_000;
        const ratio = canvasRatio(
          width,
          (width * viewport.height) / viewport.width,
          window.devicePixelRatio || 1,
          budget,
        );
        const view = p.getViewport({
          scale: (width / viewport.width) * ratio,
          rotation: rotation(p.rotate + page.rotation),
        });
        const canvas = ref.current;
        if (!canvas || cancelled) return;
        canvas.width = view.width;
        canvas.height = view.height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${(width * viewport.height) / viewport.width}px`;
        const context = canvas.getContext("2d")!;
        task = p.render({ canvas, canvasContext: context, viewport: view });
        await (task as { promise?: Promise<void> }).promise;
      } catch (e) {
        if (
          !cancelled &&
          !(e instanceof Error && e.name === "RenderingCancelledException")
        ) {
          setFailed(true);
          onError?.("No pudimos dibujar esta página. Prueba con otro PDF.");
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
      if (ref.current) ref.current.width = ref.current.height = 0;
    };
  }, [source.id, page.index, page.rotation, width]);
  return (
    <>
      {failed && (
        <div className="page-render-error">No se pudo mostrar la página</div>
      )}
      <canvas
        ref={ref}
        className="pdf-canvas"
        style={{ display: failed ? "none" : undefined }}
        aria-label={`Vista de la página ${page.index + 1}`}
      />
    </>
  );
}
export function MarkView({
  mark,
  page,
  w,
  h,
  scale,
  selected,
  onDown,
}: {
  mark: Mark;
  page: Page;
  w: number;
  h: number;
  scale: number;
  selected?: boolean;
  onDown?: (e: ReactPointerEvent) => void;
}) {
  const delta = rotation(page.rotation - mark.viewRotation);
  const [baseW, baseH] = delta % 180 ? [h, w] : [w, h];
  const [x, y] = turnPoint(mark.x, mark.y, baseW, baseH, delta);
  return (
    <div
      className={`mark mark-${mark.type} ${selected ? "selected" : ""}`}
      data-mark={mark.id}
      onPointerDown={onDown}
      style={{
        left: x * scale,
        top: y * scale,
        width: mark.width * scale,
        height: mark.height * scale,
        transform: `rotate(${delta}deg)`,
        transformOrigin: "0 0",
        color: mark.color,
        fontSize: mark.size * scale,
        lineHeight: 1.25,
        fontFamily: fontCss(mark.font),
        fontWeight: mark.bold ? 700 : 400,
        fontStyle: mark.italic ? "italic" : "normal",
        opacity: mark.opacity ?? 1,
        pointerEvents: onDown ? "auto" : "none",
      }}
    >
      {mark.type === "text" ? (
        <span>{mark.text}</span>
      ) : mark.type === "highlight" || mark.type === "redact" ? (
        <div
          style={{
            backgroundColor: mark.type === "redact" ? "#ef5c63" : mark.color,
            opacity: 0.3,
            width: "100%",
            height: "100%",
          }}
        />
      ) : mark.type === "draw" ? (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${mark.width} ${mark.height}`}
          overflow="visible"
        >
          <polyline
            points={mark.points?.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={mark.color}
            strokeWidth={mark.size}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : ["rectangle", "ellipse", "underline", "strikeout", "arrow"].includes(
          mark.type,
        ) ? (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${mark.width} ${mark.height}`}
          overflow="visible"
        >
          {mark.type === "rectangle" ? (
            <rect
              x="0"
              y="0"
              width={mark.width}
              height={mark.height}
              fill="none"
              stroke={mark.color}
              strokeWidth={mark.size}
            />
          ) : mark.type === "ellipse" ? (
            <ellipse
              cx={mark.width / 2}
              cy={mark.height / 2}
              rx={mark.width / 2}
              ry={mark.height / 2}
              fill="none"
              stroke={mark.color}
              strokeWidth={mark.size}
            />
          ) : (
            <>
              <line
                x1="0"
                y1={
                  mark.type === "underline"
                    ? mark.height
                    : mark.type === "strikeout"
                      ? mark.height / 2
                      : 0
                }
                x2={mark.width}
                y2={
                  mark.type === "arrow" || mark.type === "underline"
                    ? mark.height
                    : mark.height / 2
                }
                stroke={mark.color}
                strokeWidth={mark.size}
              />
              {mark.type === "arrow" && (
                <polyline
                  points={`${mark.width - 9},${mark.height - 1} ${mark.width},${mark.height} ${mark.width - 2},${mark.height - 9}`}
                  fill="none"
                  stroke={mark.color}
                  strokeWidth={mark.size}
                />
              )}
            </>
          )}
        </svg>
      ) : (
        <img
          src={mark.data}
          draggable={false}
          alt={mark.type === "signature" ? "Firma añadida" : "Imagen añadida"}
        />
      )}
    </div>
  );
}
export function Signature({
  onSave,
  onClose,
}: {
  onSave: (data: string) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const last = useRef<[number, number] | null>(null);
  const position = (e: ReactPointerEvent) => {
    const c = canvas.current!,
      r = c.getBoundingClientRect();
    return [
      ((e.clientX - r.left) * c.width) / r.width,
      ((e.clientY - r.top) * c.height) / r.height,
    ] as [number, number];
  };
  const move = (e: ReactPointerEvent) => {
    if (!drawing.current) return;
    const p = position(e),
      ctx = canvas.current!.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#173c38";
    ctx.beginPath();
    ctx.moveTo(...last.current!);
    ctx.lineTo(...p);
    ctx.stroke();
    last.current = p;
    hasInk.current = true;
  };
  const save = () => {
    if (!hasInk.current) return;
    const c = canvas.current!,
      ctx = c.getContext("2d")!,
      d = ctx.getImageData(0, 0, c.width, c.height);
    let minX = c.width,
      minY = c.height,
      maxX = 0,
      maxY = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (d.data[(y * c.width + x) * 4 + 3]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
    const out = document.createElement("canvas");
    out.width = maxX - minX + 20;
    out.height = maxY - minY + 20;
    out
      .getContext("2d")!
      .drawImage(
        c,
        minX - 9,
        minY - 9,
        out.width,
        out.height,
        0,
        0,
        out.width,
        out.height,
      );
    onSave(out.toDataURL("image/png"));
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-title"
      >
        <div className="modal-heading">
          <span className="eyebrow">UN TOQUE PERSONAL</span>
          <Button title="Cerrar firma" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        <h2 id="signature-title">Tu firma, aquí.</h2>
        <p>
          Dibuja con el mouse o con el dedo. Después, haz clic en el documento
          para colocarla.
        </p>
        <canvas
          className="signature-canvas"
          ref={canvas}
          width={620}
          height={220}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = position(e);
          }}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
        />
        <div className="modal-actions">
          <Button
            onClick={() => {
              canvas.current!.getContext("2d")!.clearRect(0, 0, 620, 220);
              hasInk.current = false;
            }}
          >
            <Trash2 size={16} />
            Limpiar
          </Button>
          <Button className="primary" onClick={save}>
            Usar firma
            <ArrowRight size={17} />
          </Button>
        </div>
        <small>Firma dibujada. No es una firma digital certificada.</small>
      </section>
    </div>
  );
}
