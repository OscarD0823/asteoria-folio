import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  formattingCharacter,
  graphemeCount,
  inspectCharacters,
  loadCharacterNames,
} from "./characters";
import { replacementMatches } from "./find-replace";
import { fontFile, readFontFile } from "./fonts";
import { decodeFont, type LocalFont } from "./local-fonts";
export function CharacterInspector({
  editor,
  fonts,
  family,
  onClose,
  onConvert,
}: {
  editor: Editor | null;
  fonts: LocalFont[];
  family: string;
  onClose: () => void;
  onConvert: () => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [names, setNames] = useState(new Map<number, string>()),
    [coverage, setCoverage] = useState<Set<number>>(),
    [message, setMessage] = useState("");
  const [occurrence, setOccurrence] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!editor) return;
    const update = () =>
      setText(
        editor.state.doc.textBetween(
          0,
          editor.state.doc.content.size,
          "\n",
          "\uFFFC",
        ),
      );
    update();
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);
  useEffect(() => {
    let live = true;
    void loadCharacterNames()
      .then((v) => {
        if (live) setNames(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    setCoverage(undefined);
    const local = fonts.find((f) => f.value === family),
      file = fontFile(family);
    if (local || file)
      void Promise.all([
        import("@pdf-lib/fontkit"),
        local ? Promise.resolve(decodeFont(local.bytes)) : readFontFile(file!),
      ])
        .then(([kit, bytes]) => {
          const parsed = kit.default.create(bytes) as {
            characterSet: number[];
          };
          if (live) setCoverage(new Set(parsed.characterSet));
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [family, fonts]);
  const all = useMemo(() => inspectCharacters(text, names), [text, names]);
  const shown = all.filter(
    (c) =>
      (category === "all" || category === "unsupported"
        ? category !== "unsupported" ||
          (!!coverage && !coverage.has(c.point) && !formattingCharacter(c.char))
        : c.category === category) &&
      (c.char + c.code + c.name)
        .toLocaleLowerCase("es")
        .includes(query.toLocaleLowerCase("es")),
  );
  function locate(char: string, point: number) {
    if (!editor) return;
    const matches = replacementMatches(editor.state.doc, char);
    const i = (occurrence[point] ?? -1) + 1,
      target = matches[i % matches.length];
    if (!target) return;
    setOccurrence((v) => ({ ...v, [point]: i % matches.length }));
    editor
      .chain()
      .focus()
      .setTextSelection({ from: target.from, to: target.to })
      .scrollIntoView()
      .run();
    setMessage(`Ubicación ${(i % matches.length) + 1} de ${matches.length}`);
  }
  return (
    <aside
      className="review-panel character-panel"
      aria-label="Inspector de caracteres"
    >
      <header>
        <div>
          <small>REVISAR</small>
          <h2>Caracteres</h2>
        </div>
        <button aria-label="Cerrar caracteres" onClick={onClose}>
          ✕
        </button>
      </header>
      {!editor ? (
        <>
          <p>
            Activa la escritura flexible para inspeccionar todos los caracteres
            del documento.
          </p>
          <button onClick={() => void onConvert()}>
            Inspeccionar documento completo
          </button>
        </>
      ) : (
        <>
          <p>
            {graphemeCount(text).toLocaleString("es")} caracteres visuales ·{" "}
            {Array.from(text).length.toLocaleString("es")} puntos Unicode
          </p>
          <input
            aria-label="Buscar carácter o código Unicode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Letra, nombre o U+200B…"
          />
          <select
            aria-label="Tipo de caracteres"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todos los caracteres</option>
            {[
              "Formato e invisibles",
              "Espacios",
              "Marcas combinantes",
              "Letras",
              "Números",
              "Puntuación",
              "Símbolos y otros",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
            <option value="unsupported">Requieren otra fuente</option>
          </select>
          <p role="status">
            {message || `${shown.length} caracteres diferentes`}
          </p>
          <div className="character-inventory">
            {shown.map((c) => (
              <button
                key={c.point}
                onClick={() => locate(c.char, c.point)}
                aria-label={`Localizar ${c.name}, ${c.code}`}
              >
                <span className="character-symbol">{c.mark}</span>
                <span>
                  <strong>
                    {c.code} <small>×{c.count}</small>
                  </strong>
                  <small>{c.name}</small>
                  {coverage &&
                    !coverage.has(c.point) &&
                    !formattingCharacter(c.char) && (
                      <small>Usa una fuente de respaldo</small>
                    )}
                </span>
              </button>
            ))}
            {!shown.length && <p>No hay caracteres en esta categoría.</p>}
          </div>
        </>
      )}
      <footer>
        Selecciona un carácter para recorrer sus apariciones. ZWJ, marcas
        combinantes y selectores de variación pueden formar parte de letras y
        emojis; se conservan en el documento.
      </footer>
    </aside>
  );
}
