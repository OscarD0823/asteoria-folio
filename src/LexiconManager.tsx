import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportLexicon, lexiconEntry, lookupKey, mergeLexicon, parseLexicon, spellingTerm, termKey, type LexiconEntry } from "./lexicon";
import {DictionaryLibrary} from './DictionaryLibrary';
export function LexiconManager({ entries, onSave, onClose }: {
  entries: LexiconEntry[]; onSave: (entries: LexiconEntry[]) => Promise<void>; onClose: () => void;
}) {
  const [library,setLibrary]=useState(false);
  const [query, setQuery] = useState(""), [term, setTerm] = useState(""), [definition, setDefinition] = useState(""),
    [spelling, setSpelling] = useState(true), [editing, setEditing] = useState<string | null>(null),
    [page, setPage] = useState(0), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const search = useRef<HTMLInputElement>(null), input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    search.current?.focus(); return () => previous?.focus();
  }, []);
  const shown = entries.filter(entry => lookupKey(entry.term + " " + entry.definition).includes(lookupKey(query)));
  const lastPage = Math.max(0, Math.ceil(shown.length / 50) - 1), currentPage = Math.min(page, lastPage);
  async function persist(next: LexiconEntry[], success: string) {
    setBusy(true); setMessage("");
    try { await onSave(next); setMessage(success); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar. Exporta una copia e inténtalo de nuevo."); return false; }
    finally { setBusy(false); }
  }
  function reset() { setTerm(""); setDefinition(""); setSpelling(true); setEditing(null); }
  if(library)return <DictionaryLibrary onClose={()=>setLibrary(false)} onAccept={term=>onSave(mergeLexicon(entries,[{term,definition:'',spelling:true}]))}/>;
  return createPortal(<div className="modal-backdrop">
    <section className="modal lexicon-modal" role="dialog" aria-modal="true" aria-labelledby="lexicon-title" onKeyDown={event => {
      if (event.key === "Escape") { event.stopPropagation(); if (!busy) onClose(); }
      if (event.key !== "Tab") return;
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),input:not([hidden]),textarea,a[href]"));
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    }}>
      <header className="lexicon-heading"><div><span className="eyebrow">REVISAR · VOCABULARIO LOCAL</span><h2 id="lexicon-title">Diccionario personal</h2></div>
        <button disabled={busy} aria-label="Cerrar diccionario" onClick={onClose}>✕</button></header>
      <p>Consulta tus términos, añade definiciones y decide cuáles acepta el corrector. Se guarda en este dispositivo. Las webs de PDF y Writer lo comparten cuando usas el mismo navegador.</p><button onClick={()=>setLibrary(true)}>Biblioteca StarDict / ODict / XML</button>
      <div className="lexicon-actions">
        <button disabled={busy} onClick={() => input.current?.click()}>Importar TXT / TSV / JSON</button>
        <button onClick={() => {
          const url = URL.createObjectURL(new Blob([exportLexicon(entries)], { type: "application/json;charset=utf-8" }));
          const link = document.createElement("a"); link.href = url; link.download = "Prisma-diccionario-personal.json"; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Exportar diccionario</button>
        <small>{entries.length} / 5.000 entradas</small>
      </div>
      <input hidden type="file" accept=".txt,.tsv,.json" ref={input} onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        setBusy(true);
        try {
          if (file.size > 2 * 1024 * 1024) throw new Error("Importa un archivo de hasta 2 MB.");
          const imported = parseLexicon(await file.text(), file.name);
          await persist(mergeLexicon(entries, imported), `${imported.length} entradas importadas. Los duplicados se combinan.`);
        } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo importar el archivo."); }
        finally { setBusy(false); }
      }} />
      <label className="lexicon-search">Buscar término o definición<input ref={search} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="La búsqueda reconoce palabras con o sin tildes" /></label>
      <div className="lexicon-columns">
        <div className="lexicon-results"><div className="lexicon-list">
          {shown.slice(currentPage * 50, (currentPage + 1) * 50).map(entry => <button disabled={busy} key={termKey(entry.term)} className={editing === termKey(entry.term) ? "selected" : ""} onClick={() => {
            setEditing(termKey(entry.term)); setTerm(entry.term); setDefinition(entry.definition); setSpelling(entry.spelling);
          }}><b>{entry.term}</b><span>{entry.definition || "Sin definición"}</span><small>{entry.spelling ? "Aceptada por el corrector" : "Solo consulta"}</small></button>)}
          {!shown.length && <p>{entries.length ? "No hay coincidencias." : "Añade una palabra o importa tu vocabulario."}</p>}
        </div><div className="review-pagination"><button disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Anterior</button><small>{shown.length} resultados · {currentPage + 1} / {lastPage + 1}</small><button disabled={currentPage >= lastPage} onClick={() => setPage(currentPage + 1)}>Siguiente</button></div></div>
        <form onSubmit={async event => {
          event.preventDefault();
          try {
            const entry = lexiconEntry({ term, definition, spelling: spelling && spellingTerm(term.trim()) });
            if (await persist(mergeLexicon(entries.filter(value => termKey(value.term) !== editing), [entry]), "Entrada guardada en este dispositivo.")) reset();
          } catch (error) { setMessage(error instanceof Error ? error.message : "Revisa la entrada."); }
        }}>
          <h3>{editing ? "Editar entrada" : "Nueva entrada"}</h3>
          <label>Término<input aria-label="Término" disabled={busy} value={term} maxLength={120} required onChange={event => setTerm(event.target.value)} /></label>
          <label>Definición<textarea aria-label="Definición" disabled={busy} value={definition} maxLength={1000} rows={5} onChange={event => setDefinition(event.target.value)} /></label>
          <label className="lexicon-check"><input type="checkbox" checked={spelling && spellingTerm(term.trim())} disabled={busy || !spellingTerm(term.trim())} onChange={event => setSpelling(event.target.checked)} /> Aceptar esta palabra en el corrector</label>
          <small>La búsqueda omite las tildes; el corrector conserva la diferencia entre «si» y «sí».</small>
          <div className="lexicon-actions"><button className="primary" disabled={busy} type="submit">Guardar entrada</button><button type="button" disabled={busy} onClick={reset}>Nueva</button>
            {editing && <button type="button" disabled={busy} onClick={async () => { if (await persist(entries.filter(entry => termKey(entry.term) !== editing), "Entrada eliminada.")) reset(); }}>Eliminar entrada</button>}</div>
        </form>
      </div>
      <p role="status" className="lexicon-message">{message}</p>
      <small>TXT/TSV: una entrada por línea, término y definición separados por tabulación. Hasta 2 MB. No importa archivos MDX ni StarDict. Exporta una copia para trasladar el vocabulario a otro dispositivo.</small>
    </section>
  </div>, document.body);
}
