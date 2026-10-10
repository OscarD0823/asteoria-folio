import { useRef, type PointerEvent, type KeyboardEvent } from "react";
import { pageSize, type PageLayout } from "./flow";
export const rulerMargin = (
  layout: PageLayout,
  kind: "left" | "right" | "top" | "bottom",
  value: number,
): PageLayout => {
  const [w, h] = pageSize(layout).map((pt) => (pt * 25.4) / 72),
    other =
      kind === "left"
        ? "right"
        : kind === "right"
          ? "left"
          : kind === "top"
            ? "bottom"
            : "top";
  const extent = kind === "left" || kind === "right" ? w : h,
    minBody =
      kind === "left" || kind === "right"
        ? ((80 * 25.4) / 72) * (layout.columns || 1) +
          (layout.columnGap ?? 6.35) * ((layout.columns || 1) - 1)
        : (100 * 25.4) / 72;
  return {
    ...layout,
    [kind]:
      Math.round(
        Math.max(0, Math.min(100, extent - layout[other] - minBody, value)) * 2,
      ) / 2,
  };
};
const capture = (e: PointerEvent) => {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.setPointerCapture(e.pointerId);
};
const release = (e: PointerEvent) => {
  if (e.currentTarget.hasPointerCapture(e.pointerId))
    e.currentTarget.releasePointerCapture(e.pointerId);
  e.stopPropagation();
};
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
  onIndent?: (first: number, hanging: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    width = (pageSize(layout)[0] * 25.4) / 72;
  const update = (kind: string, value: number) => {
    if (kind === "left" || kind === "right")
      onChange(
        rulerMargin(layout, kind, kind === "right" ? width - value : value),
      );
    else if (kind === "first")
      onIndent?.(
        Math.max(-72, Math.min(144, ((value - layout.left) * 72) / 25.4)),
        hanging,
      );
    else
      onIndent?.(
        firstLine,
        Math.max(0, Math.min(144, ((value - layout.left) * 72) / 25.4)),
      );
  };
  const handles = [
    ["left", layout.left, "Margen izquierdo"],
    ["right", width - layout.right, "Margen derecho"],
    [
      "first",
      layout.left + (firstLine * 25.4) / 72,
      "Sangría de primera línea",
    ],
    ["hanging", layout.left + (hanging * 25.4) / 72, "Sangría francesa"],
  ] as const;
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
          className={"ruler-tick" + (i % 2 ? " minor" : "")}
          style={{ left: ((i * 5) / width) * 100 + "%" }}
        >
          {i % 2 ? "" : i / 2}
        </span>
      ))}
      {handles
        .filter(([kind]) => onIndent || kind === "left" || kind === "right")
        .map(([kind, value, label]) => (
          <button
            key={kind}
            className={"ruler-handle " + kind}
            style={{ left: (value / width) * 100 + "%" }}
            aria-label={label}
            title={label}
            onPointerDown={capture}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerMove={(e) => {
              if (
                !e.currentTarget.hasPointerCapture(e.pointerId) ||
                !root.current
              )
                return;
              const r = root.current.getBoundingClientRect();
              update(
                kind,
                Math.round(((e.clientX - r.left) / r.width) * width * 2) / 2,
              );
            }}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
              e.preventDefault();
              update(kind, value + (e.key === "ArrowRight" ? 1 : -1));
            }}
          />
        ))}
    </div>
  );
}
export function VerticalDocumentRuler({
  layout,
  onChange,
  side = "left",
  height,
}: {
  layout: PageLayout;
  onChange: (layout: PageLayout) => void;
  side?: "left" | "right";
  height?: number;
}) {
  const root = useRef<HTMLDivElement>(null),
    extent = (pageSize(layout)[1] * 25.4) / 72;
  const key = (e: KeyboardEvent, kind: "top" | "bottom") => {
    if (!["ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    onChange(
      rulerMargin(
        layout,
        kind,
        layout[kind] +
          (e.key === "ArrowDown" ? 1 : -1) * (kind === "bottom" ? -1 : 1),
      ),
    );
  };
  return (
    <div
      ref={root}
      className={"vertical-ruler " + side}
      aria-label={
        "Regla vertical " +
        (side === "left" ? "izquierda" : "derecha") +
        " en centímetros"
      }
      style={{ height: height ?? (pageSize(layout)[1] * 4) / 3 }}
    >
      <div
        className="vertical-ruler-content"
        style={{
          top: (layout.top / extent) * 100 + "%",
          bottom: (layout.bottom / extent) * 100 + "%",
        }}
      />
      {Array.from({ length: Math.floor(extent / 5) + 1 }, (_, i) => (
        <span
          key={i}
          className={"vertical-tick" + (i % 2 ? " minor" : "")}
          style={{ top: ((i * 5) / extent) * 100 + "%" }}
        >
          {i % 2 ? "" : i / 2}
        </span>
      ))}
      {(["top", "bottom"] as const).map((kind) => (
        <button
          key={kind}
          className={"vertical-handle " + kind}
          role="slider"
          aria-label={
            (kind === "top" ? "Margen superior" : "Margen inferior") +
            " · regla " +
            (side === "left" ? "izquierda" : "derecha")
          }
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={Math.min(
            100,
            extent - layout[kind === "top" ? "bottom" : "top"] - 40,
          )}
          aria-valuenow={layout[kind]}
          aria-valuetext={layout[kind] + " milímetros"}
          title={
            (kind === "top" ? "Margen superior: " : "Margen inferior: ") +
            layout[kind] +
            " mm"
          }
          style={{
            top:
              ((kind === "top" ? layout.top : extent - layout.bottom) /
                extent) *
                100 +
              "%",
          }}
          onPointerDown={capture}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerMove={(e) => {
            if (
              !e.currentTarget.hasPointerCapture(e.pointerId) ||
              !root.current
            )
              return;
            const r = root.current.getBoundingClientRect(),
              value = ((e.clientY - r.top) / r.height) * extent;
            onChange(
              rulerMargin(
                layout,
                kind,
                kind === "bottom" ? extent - value : value,
              ),
            );
          }}
          onKeyDown={(e) => key(e, kind)}
        />
      ))}
    </div>
  );
}
