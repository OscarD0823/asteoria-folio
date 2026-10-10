import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import {
  academicPresets,
  applyAcademicStyle,
  type AcademicStyle,
} from "./academic";
import { fontFamilies } from "./fonts";
const labels = [
  "Normal",
  "Título",
  "Subtítulo",
  "Título 1",
  "Título 2",
  "Título 3",
  "Título 4",
  "Título 5",
  "Título 6",
  "Cita",
  "Código",
];
export function StyleGallery({
  editor,
  academicStyle,
}: {
  editor: Editor | null;
  academicStyle: AcademicStyle;
}) {
  const [open, setOpen] = useState(false);
  const modal = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    modal.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      trigger.current?.focus();
    };
  }, [open]);
  const preset = academicPresets[academicStyle];
  const font =
    fontFamilies.find((f) => f.value === preset.fontFamily)?.css ??
    "PrismaSans, sans-serif";
  const active = (i: number) =>
    !!editor &&
    (i === 0
      ? editor.isActive("paragraph") &&
        !editor.getAttributes("paragraph").paragraphStyle
      : i === 1 || i === 2
        ? editor.isActive("paragraph", {
            paragraphStyle: i === 1 ? "title" : "subtitle",
          })
        : i < 9
          ? editor.isActive("heading", { level: i - 2 })
          : editor.isActive(i === 9 ? "blockquote" : "codeBlock"));
  function choose(i: number) {
    if (!editor) return;
    let chain = editor.chain().focus();
    if (i < 3) {
      chain = chain.setParagraph().updateAttributes("paragraph", {
        paragraphStyle: i === 1 ? "title" : i === 2 ? "subtitle" : null,
        fontSize: i === 1 ? 30 : i === 2 ? 18 : (preset.fontSize ?? 12),
        firstLineIndent: i === 0 ? (preset.firstLineIndent ?? 0) : 0,
        spaceAfter: i === 0 ? 6 : 12,
      });
    } else if (i < 9) {
      const heading = applyAcademicStyle(
        {
          type: "doc",
          content: [{ type: "heading", attrs: { level: i - 2 }, content: [] }],
        },
        academicStyle,
      ).content![0];
      chain = chain
        .setHeading({ level: (i - 2) as 1 | 2 | 3 | 4 | 5 | 6 })
        .updateAttributes("heading", {
          paragraphStyle: null,
          fontFamily: null,
          fontSize: null,
          firstLineIndent: 0,
          hangingIndent: 0,
          spaceBefore: 12,
          spaceAfter: 6,
          ...heading.attrs,
        });
    } else chain = i === 9 ? chain.setBlockquote() : chain.setCodeBlock();
    chain.run();
    setOpen(false);
  }
  const card = (i: number) => (
    <button
      key={i}
      disabled={!editor}
      aria-label={"Aplicar estilo " + labels[i]}
      aria-pressed={active(i)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => choose(i)}
    >
      <span
        style={{
          fontFamily: i === 10 ? "PrismaMono, monospace" : font,
          fontSize:
            i === 1
              ? 25
              : i === 2
                ? 19
                : academicStyle === "apa"
                  ? 16
                  : Math.max(13, 24 - Math.max(0, i - 3) * 2),
          fontWeight: i >= 3 && i < 9 ? 700 : 400,
          fontStyle:
            i === 9 || (academicStyle === "apa" && (i === 5 || i === 7))
              ? "italic"
              : "normal",
        }}
      >
        {labels[i]}
      </span>
      <small>
        {i === 0
          ? "Texto del documento"
          : i < 3
            ? "Portada y presentación"
            : i < 9
              ? "Nivel " + (i - 2) + " · incluido en el índice"
              : i === 9
                ? "Cita destacada"
                : "Texto monoespaciado"}
      </small>
    </button>
  );
  return (
    <>
      <div className="style-gallery style-gallery-refined">
        {[0, 3, 4, 5].map(card)}
        <button
          className="more-styles"
          aria-label="Ver todos los estilos"
          ref={trigger}
          onClick={() => setOpen(true)}
          disabled={!editor}
        >
          Más estilos ▾
        </button>
      </div>
      {open &&
        createPortal(
          <div
            className="modal-shade word-modal-shade"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <section
              className="modal style-library"
              ref={modal}
              role="dialog"
              aria-modal="true"
              aria-label="Galería de estilos"
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Tab") {
                  const items = Array.from(
                    e.currentTarget.querySelectorAll<HTMLButtonElement>(
                      "button:not(:disabled)",
                    ),
                  );
                  if (e.shiftKey && document.activeElement === items[0]) {
                    e.preventDefault();
                    items.at(-1)?.focus();
                  } else if (
                    !e.shiftKey &&
                    document.activeElement === items.at(-1)
                  ) {
                    e.preventDefault();
                    items[0]?.focus();
                  }
                }
              }}
            >
              <header>
                <div>
                  <small>FORMATO DEL TEXTO</small>
                  <h2>Galería de estilos</h2>
                </div>
                <button
                  aria-label="Cerrar estilos"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </header>
              <p>
                {preset.label} · Aplica un estilo al párrafo o a los párrafos
                seleccionados. Los títulos organizan la navegación y la tabla de
                contenido.
              </p>
              <div className="paragraph-style-cards">
                {labels.map((_, i) => card(i))}
              </div>
              <footer>
                Los formatos académicos completos se eligen en Referencias →
                Formato del trabajo.
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
