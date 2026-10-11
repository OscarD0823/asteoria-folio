import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { PluginKey, type Transaction } from "@tiptap/pm/state";
import {
  canonicalWord,
  spellingWords,
  spellRequest,
  type WordLocation,
} from "./spelling";
import { readPreference, writePreference } from "./preferences";
import { LexiconManager } from "./LexiconManager";
import { loadLexicon, saveLexicon, mergeLexicon, spellingTerm, type LexiconEntry } from "./lexicon";
export const spellingKey = new PluginKey("prismaSpelling");
export function SpellingReview({
  editor,
  onClose,
  onConvert,
}: {
  editor: Editor | null;
  onClose: () => void;
  onConvert: () => Promise<void>;
}) {
  const [issues, setIssues] = useState<WordLocation[]>([]),
    [index, setIndex] = useState(0),
    [status, setStatus] = useState(""),
    [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [accepted, setAccepted] = useState<string[]>(() => {
    const value = readPreference<unknown>("personal-dictionary", []);
    return Array.isArray(value) ? value.filter((word): word is string => typeof word === "string" && spellingTerm(word)).slice(0, 5000) : [];
  });
  const [lexicon, setLexicon] = useState<LexiconEntry[]>([]), [lexiconOpen, setLexiconOpen] = useState(false),
    [lexiconReady, setLexiconReady] = useState(false), [lexiconBusy, setLexiconBusy] = useState(false), [lexiconError, setLexiconError] = useState("");
  const [ignored, setIgnored] = useState<string[]>([]),
    [refresh, setRefresh] = useState(0);
  const revision = useRef(0),
    current = issues[index];
  useEffect(() => {
    let live = true;
    void loadLexicon().then(async entries => {
      const legacy = readPreference<unknown>("personal-dictionary", []);
      const words = Array.isArray(legacy) ? legacy.filter((word): word is string => typeof word === "string" && spellingTerm(word)).slice(0, 5000) : [];
      // Migrate the previous personal word list without replacing existing definitions.
      const next = mergeLexicon(entries, words.map(term => ({ term, definition: "", spelling: true })));
      if (words.length) { await saveLexicon(next); writePreference("personal-dictionary", []); }
      if (live) { setLexicon(next); setAccepted(next.filter(entry => entry.spelling).map(entry => entry.term)); setLexiconReady(true); }
    }).catch(error => { if (live) setLexiconError(error instanceof Error ? error.message : "No se pudo abrir el diccionario local."); });
    return () => { live = false; };
  }, []);
  async function updateLexicon(entries: LexiconEntry[]) {
    await saveLexicon(entries);
    setLexicon(entries);
    setAccepted(entries.filter(entry => entry.spelling).map(entry => entry.term));
    writePreference("personal-dictionary", []);
  }
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    let timer: ReturnType<typeof setTimeout>;
    const scan = () => {
      const id = ++revision.current;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const snapshot = editor.state.doc,
          locations = spellingWords(snapshot);
        setStatus("Revisando en este dispositivo…");
        try {
          const bad = new Set(
            (
              await spellRequest("check", [
                ...new Set(locations.map((w) => w.word)),
              ])
            ).map(canonicalWord),
          );
          if (
            id !== revision.current ||
            editor.isDestroyed ||
            editor.state.doc !== snapshot
          )
            return;
          const allowed = new Set([...accepted, ...ignored].map(canonicalWord));
          const next = locations.filter(
            (w) =>
              bad.has(canonicalWord(w.word)) &&
              !allowed.has(canonicalWord(w.word)),
          );
          setIssues(next);
          setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
          setStatus(
            next.length
              ? `${next.length} ${next.length === 1 ? "posible error" : "posibles errores"}`
              : "Revisión terminada. No se encontraron errores ortográficos.",
          );
          editor.view.dispatch(editor.state.tr.setMeta(spellingKey, next));
        } catch (error) {
          if (id === revision.current)
            setStatus(
              error instanceof Error
                ? error.message
                : "No se pudo completar la revisión.",
            );
        }
      }, 450);
    };
    const changed = ({ transaction }: { transaction: Transaction }) => {
      if (transaction.docChanged) scan();
    };
    scan();
    editor.on("transaction", changed);
    return () => {
      ++revision.current;
      clearTimeout(timer);
      editor.off("transaction", changed);
    };
  }, [editor, accepted, ignored, refresh]);
  useEffect(() => {
    setSuggestions([]);
    setLoadingSuggestions(!!current);
    if (!current) return;
    let live = true;
    void spellRequest("suggest", [current.word])
      .then((result) => {
        if (live) {
          setSuggestions(result);
          setLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (live) setLoadingSuggestions(false);
      });
    return () => {
      live = false;
    };
  }, [current?.word]);
  const locate = (issue: WordLocation) => {
    if (!editor || editor.isDestroyed) return;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: issue.from, to: issue.to })
      .scrollIntoView()
      .run();
  };
  function correct(word: string) {
    if (
      !editor ||
      !current ||
      editor.isDestroyed ||
      editor.state.doc.textBetween(current.from, current.to) !== current.word
    ) {
      setRefresh((v) => v + 1);
      return;
    }
    const marks = editor.state.doc.resolve(current.from).marks();
    editor.view.dispatch(
      editor.state.tr
        .replaceWith(current.from, current.to, editor.schema.text(word, marks))
        .scrollIntoView(),
    );
  }
  return (
    <aside className="review-panel" aria-label="Revisor de ortografía">
      <header>
        <div>
          <small>REVISAR</small>
          <h2>Ortografía</h2>
        </div>
        <button aria-label="Cerrar revisor" onClick={onClose}>
          ✕
        </button>
      </header>
      <p className="review-language">Español · diccionario local</p>
      <button disabled={!lexiconReady || lexiconBusy} onClick={() => setLexiconOpen(true)}>Diccionario personal · {lexicon.length} entradas</button>
      {lexiconError && <p role="alert">{lexiconError}</p>}
      {lexiconOpen && <LexiconManager entries={lexicon} onSave={updateLexicon} onClose={() => setLexiconOpen(false)} />}
      {!editor ? (
        <>
          <p>
            Activa la escritura flexible para revisar el documento completo y
            corregir sus palabras.
          </p>
          <button className="primary" onClick={() => void onConvert()}>
            Revisar documento completo
          </button>
        </>
      ) : (
        <>
          <p role="status">{status}</p>
          {current && (
            <>
              <button
                className="spelling-current"
                onClick={() => locate(current)}
              >
                {current.word}
                <small>Mostrar en el documento</small>
              </button>
              <strong>Sugerencias</strong>
              <div className="spelling-suggestions">
                {suggestions.map((word) => (
                  <button key={word} onClick={() => correct(word)}>
                    {word}
                  </button>
                ))}
                {loadingSuggestions && (
                  <small>Buscando sugerencias en el diccionario…</small>
                )}
                {!loadingSuggestions && !suggestions.length && (
                  <small>
                    No hay sugerencias disponibles. Puedes editar la palabra
                    directamente.
                  </small>
                )}
              </div>
              <div className="review-actions">
                <button
                  onClick={() => {
                    setIgnored((a) => [...a, current.word]);
                  }}
                >
                  Omitir esta palabra
                </button>
                <button
                  disabled={!lexiconReady || lexiconBusy}
                  onClick={async () => {
                    setLexiconBusy(true); setLexiconError("");
                    try { await updateLexicon(mergeLexicon(lexicon, [{ term: current.word, definition: "", spelling: true }])); }
                    catch (error) { setLexiconError(error instanceof Error ? error.message : "No se pudo guardar la palabra."); }
                    finally { setLexiconBusy(false); }
                  }}
                >
                  Agregar al diccionario
                </button>
              </div>
              <div className="review-pagination">
                <button
                  disabled={index === 0}
                  onClick={() => {
                    setIndex(index - 1);
                    locate(issues[index - 1]);
                  }}
                >
                  Anterior
                </button>
                <span>
                  {index + 1} / {issues.length}
                </span>
                <button
                  disabled={index + 1 >= issues.length}
                  onClick={() => {
                    setIndex(index + 1);
                    locate(issues[index + 1]);
                  }}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </>
      )}
      <footer>
        La revisión usa un diccionario de español. Las decisiones sobre
        gramática y contexto requieren tu revisión.
      </footer>
    </aside>
  );
}
