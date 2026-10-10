import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fontFamilies } from "./fonts";
import { localFontFamilies, type LocalFont } from "./local-fonts";
import { readPreference, writePreference } from "./preferences";
const essentials = [
  ["Arial · 11 pt", "Arimo", "Arimo"],
  ["Calibri · 11 pt", "Carlito", "Carlito"],
  ["Times New Roman · 12 pt", "PrismaSerif", "Liberation Serif"],
  ["Georgia · 11 pt", "Gelasio", "Gelasio"],
  ["Computer Modern · 10 pt", "LatinModernRoman", "Latin Modern Roman"],
] as const;
export function FontPicker({
  value,
  fonts = [],
  onChange,
  onAcademicFont,
  onImport,
  onError,
}: {
  value: string;
  fonts?: LocalFont[];
  onChange: (value: string) => void;
  onAcademicFont: (font: string, size: number) => void;
  onImport: (files: File[]) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() =>
    readPreference("favorite-fonts", []),
  );
  const [recent, setRecent] = useState<string[]>(() =>
    readPreference("recent-fonts", []),
  );
  const [sample, setSample] = useState(
    "El arte de escribir. ÁÉÍÓÚ ñ · 0123456789",
  );
  const [previewSize, setPreviewSize] = useState(24);
  const [preview, setPreview] = useState(value);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [bold, setBold] = useState(false),
    [italic, setItalic] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const families = [
      ...fontFamilies.filter((f) => f.file || f.styles),
      ...localFontFamilies(fonts),
    ],
    selected = [...fontFamilies, ...localFontFamilies(fonts)].find(
      (f) => f.value === value,
    );
  const filter = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("es");
  const shown = families
    .filter(
      (f) =>
        (category === "all" ||
          (category === "favorites"
            ? favorites.includes(f.value)
            : category === "recent"
              ? recent.includes(f.value)
              : category === "local"
                ? f.value.startsWith("local-")
                : f.category === category)) &&
        filter(f.label).includes(filter(query)),
    )
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [open]);
  const choose = (font: string) => {
    const next = [font, ...recent.filter((f) => f !== font)].slice(0, 12);
    setRecent(next);
    writePreference("recent-fonts", next);
    onChange(font);
    setOpen(false);
    button.current?.focus();
  };
  return (
    <>
      <button
        className="font-picker-button"
        ref={button}
        aria-label="Tipo de letra"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {selected?.label ?? "Elegir fuente"} <span>▾</span>
      </button>
      {open &&
        createPortal(
          <div
            className="modal-shade font-modal-shade"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <section
              className="modal font-library"
              role="dialog"
              aria-modal="true"
              aria-labelledby="font-library-title"
              onKeyDown={(e) => {
                if (e.key !== "Tab") return;
                const items = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled),input:not([hidden]):not([type=hidden]),select,a[href]",
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
              }}
            >
              <header>
                <div>
                  <small>TIPOGRAFÍA</small>
                  <h2 id="font-library-title">Biblioteca de fuentes</h2>
                </div>
                <button
                  aria-label="Cerrar fuentes"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </header>
              <p>
                {
                  families.filter(
                    (f) => f.styles || f.file || f.value.startsWith("local-"),
                  ).length
                }{" "}
                familias disponibles en tu dispositivo. Vista previa y PDF
                utilizan los mismos archivos.
              </p>
              <div className="font-search">
                <input
                  aria-label="Buscar fuentes"
                  placeholder="Busca por nombre…"
                  ref={searchInput}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="Categoría de fuentes"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="favorites">Favoritas</option>
                  <option value="recent">Usadas recientemente</option>
                  <option value="serif">Con remates · serif</option>
                  <option value="sans-serif">Sin remates · sans serif</option>
                  <option value="monospace">Monoespaciadas</option>
                  <option value="local">Mis fuentes</option>
                </select>
              </div>
              <div className="font-preview-controls">
                <input
                  aria-label="Texto de vista previa de fuentes"
                  value={sample}
                  maxLength={160}
                  onChange={(e) => setSample(e.target.value)}
                />
                <label>
                  Tamaño{" "}
                  <input
                    aria-label="Tamaño de vista previa"
                    type="range"
                    min="16"
                    max="40"
                    value={previewSize}
                    onChange={(e) => setPreviewSize(Number(e.target.value))}
                  />
                  <output>{previewSize}</output>
                </label>
                <button
                  aria-label="Vista previa en negrita"
                  aria-pressed={bold}
                  onClick={() => setBold(!bold)}
                >
                  <b>B</b>
                </button>
                <button
                  aria-label="Vista previa en cursiva"
                  aria-pressed={italic}
                  onClick={() => setItalic(!italic)}
                >
                  <i>I</i>
                </button>
                <button
                  aria-label="Vista en tarjetas"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  ▦
                </button>
                <button
                  aria-label="Vista en lista"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  ☷
                </button>
              </div>
              <details className="essential-fonts">
                <summary>Fuentes para entregas académicas</summary>
                <p>
                  APA permite varias fuentes legibles. IEEE suele usar Times New
                  Roman según la plantilla. Estos accesos eligen alternativas
                  libres; importa el archivo original si tu institución exige la
                  tipografía exacta.
                </p>
                <div>
                  {essentials.map(([label, preferred, alternate]) => {
                    const font =
                      families.find((f) => f.value === preferred) ??
                      families.find((f) => f.label === alternate);
                    return font ? (
                      <button
                        key={label}
                        onClick={() => {
                          onAcademicFont(
                            font.value,
                            Number(label.match(/(\d+) pt/)?.[1] ?? 12),
                          );
                          setOpen(false);
                          button.current?.focus();
                        }}
                      >
                        {label}
                        <small>Alternativa: {font.label}</small>
                      </button>
                    ) : null;
                  })}
                </div>
                <p>
                  Aptos 12 pt y Lucida Sans Unicode 10 pt: importa tus archivos
                  autorizados. También puedes importar Arial, Calibri, Georgia y
                  Times New Roman.
                </p>
                <a
                  href="https://apastyle.apa.org/style-grammar-guidelines/paper-format/font"
                  target="_blank"
                  rel="noreferrer"
                >
                  Guía de fuentes APA
                </a>
              </details>
              <div
                className={"font-catalog font-catalog-" + view}
                role="group"
                aria-label="Fuentes disponibles"
              >
                {shown.map((f) => (
                  <div
                    className={
                      "font-card " + (f.value === value ? "selected" : "")
                    }
                    key={f.value}
                  >
                    <button
                      key={f.value}
                      aria-label={"Usar " + f.label}
                      className={f.value === value ? "selected" : ""}
                      onClick={() => choose(f.value)}
                      onFocus={() => setPreview(f.value)}
                      onMouseEnter={() => setPreview(f.value)}
                    >
                      <strong>{f.label}</strong>
                      <span
                        style={{
                          fontFamily: f.css,
                          fontSize: previewSize,
                          fontWeight: bold ? 700 : 400,
                          fontStyle: italic ? "italic" : "normal",
                        }}
                      >
                        {sample || "Aa Bb Cc · ÁÉÍÓÚ ñ 123"}
                      </span>
                      <small>
                        {f.value.startsWith("local-")
                          ? "Fuente personal · incluida en el proyecto"
                          : f.category === "serif"
                            ? "Serif"
                            : f.category === "monospace"
                              ? "Monoespaciada"
                              : "Sans serif"}
                      </small>
                    </button>
                    <button
                      className="font-favorite"
                      aria-label={
                        (favorites.includes(f.value)
                          ? "Quitar de favoritas "
                          : "Agregar a favoritas ") + f.label
                      }
                      aria-pressed={favorites.includes(f.value)}
                      onClick={() => {
                        const next = favorites.includes(f.value)
                          ? favorites.filter((v) => v !== f.value)
                          : [...favorites, f.value];
                        setFavorites(next);
                        writePreference("favorite-fonts", next);
                      }}
                    >
                      {favorites.includes(f.value) ? "★" : "☆"}
                    </button>
                  </div>
                ))}
                {!shown.length && <p>No hay fuentes con ese nombre.</p>}
              </div>
              <footer>
                <span className="font-result-count">
                  {shown.length} fuentes ·{" "}
                  {families.find((f) => f.value === preview)?.label ??
                    selected?.label}
                  <small>
                    Selecciona una tarjeta para aplicar. Las estrellas guardan
                    tus favoritas.
                  </small>
                </span>
                <button
                  disabled={loading}
                  onClick={() => fileInput.current?.click()}
                >
                  {loading ? "Leyendo fuentes…" : "Importar TTF / OTF"}
                </button>
                <small>
                  Se guardan en este proyecto, sin subirlas a ningún servidor.
                </small>
              </footer>
              <input
                type="file"
                hidden
                multiple
                accept=".ttf,.otf"
                ref={fileInput}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  setLoading(true);
                  try {
                    await onImport(files);
                  } catch (error) {
                    onError(error);
                  } finally {
                    setLoading(false);
                  }
                }}
              />
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
