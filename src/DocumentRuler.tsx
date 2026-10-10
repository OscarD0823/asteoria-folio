import { useRef } from "react";
import { pageSize, type PageLayout } from "./flow";
export function DocumentRuler({
  layout,
  onChange,
  firstLine = 0,
  hanging = 0,
  onIndent,
}: {
  layout: PageLayout;
  onChange: (layout: PageLayout) => void;
  firstLine?: number;
  hanging?: number;
  onIndent: (first: number, hanging: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    width = (pageSize(layout)[0] * 25.4) / 72;
  const start = (e: React.PointerEvent, kind: string) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent, kind: string) => {
    if (
      !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId) ||
      !root.current
    )
      return;
    const rect = root.current.getBoundingClientRect(),
      value =
        Math.round(((e.clientX - rect.left) / rect.width) * width * 2) / 2;
    if (kind === "left")
      onChange({
        ...layout,
        left: Math.max(5, Math.min(width - layout.right - 35, value)),
      });
    if (kind === "right")
      onChange({
        ...layout,
        right: Math.max(5, Math.min(width - layout.left - 35, width - value)),
      });
    if (kind === "first")
      onIndent(
        Math.max(-72, Math.min(144, ((value - layout.left) * 72) / 25.4)),
        hanging,
      );
    if (kind === "hanging")
      onIndent(
        firstLine,
        Math.max(0, Math.min(144, ((value - layout.left) * 72) / 25.4)),
      );
  };
  return (
    <div
      className="document-ruler"
      ref={root}
      aria-label="Regla horizontal en centímetros"
    >
      <div
        className="ruler-content"
        style={{
          left: (layout.left / width) * 100 + "%",
          right: (layout.right / width) * 100 + "%",
        }}
      />
      {Array.from({ length: Math.floor(width / 5) + 1 }, (_, i) => (
        <span
          key={i}
          className={i % 2 ? "ruler-tick minor" : "ruler-tick"}
          style={{ left: ((i * 5) / width) * 100 + "%" }}
        >
          {i % 2 ? "" : i / 2}
        </span>
      ))}
      {[
        ["left", layout.left, "Margen izquierdo"],
        ["right", width - layout.right, "Margen derecho"],
        [
          "first",
          layout.left + (firstLine * 25.4) / 72,
          "Sangría de primera línea",
        ],
        ["hanging", layout.left + (hanging * 25.4) / 72, "Sangría francesa"],
      ].map(([kind, value, label]) => (
        <button
          key={kind}
          className={"ruler-handle " + kind}
          style={{ left: (Number(value) / width) * 100 + "%" }}
          aria-label={String(label)}
          title={String(label)}
          onPointerDown={(e) => start(e, String(kind))}
          onPointerMove={(e) => move(e, String(kind))}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const d = e.key === "ArrowRight" ? 1 : -1;
            if (kind === "left")
              onChange({
                ...layout,
                left: Math.max(
                  5,
                  Math.min(width - layout.right - 35, layout.left + d),
                ),
              });
            else if (kind === "right")
              onChange({
                ...layout,
                right: Math.max(
                  5,
                  Math.min(width - layout.left - 35, layout.right - d),
                ),
              });
            else
              onIndent(
                kind === "first" ? firstLine + d : firstLine,
                kind === "hanging" ? Math.max(0, hanging + d) : hanging,
              );
          }}
        />
      ))}
    </div>
  );
}
