import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button, PageThumbnail } from "./components";
import { getPdf } from "./renderer";
import { collectDocumentEntries, academicPlainText } from "./academic";
import { findNodes } from "./document-tools";
import type { Workspace } from "./pdf";
import type { RichEditorInstance } from "./LazyRichEditor";
type Result = {
  page: number;
  id: string;
  text: string;
  block?: string;
  position?: number;
};
export function DocumentNavigation({
  workspace,
  editor,
  onPage,
  onQuery,
  onClose,
  onError,
}: {
  workspace: Workspace;
  editor: RichEditorInstance | null;
  onPage: (id: string) => void;
  onQuery: (query: string) => void;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [tab, setTab] = useState("Buscar"),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Result[]>([]),
    [progress, setProgress] = useState(""),
    job = useRef(0),
    cache = useRef(new Map<string, string>());
  const entries = workspace.flow
    ? collectDocumentEntries(workspace.flow.content)
    : { contents: [], figures: [], tables: [], appendices: [] };
  useEffect(() => {
    const id = ++job.current;
    onQuery(query);
    if (!query.trim()) {
      setResults([]);
      setProgress("");
      return;
    }
    const timer = setTimeout(() => {
      void (async () => {
        const found: Result[] = [],
          needle = query.toLocaleLowerCase("es");
        setProgress("Buscando…");
        if (workspace.flow) {
          const walk = (node: NonNullable<Workspace["flow"]>["content"]) => {
            if (
              ["paragraph", "heading", "appendix", "caption"].includes(
                node.type ?? "",
              )
            ) {
              const text = academicPlainText(node);
              if (text.toLocaleLowerCase("es").includes(needle))
                found.push({
                  page: workspace.flow!.pageMap?.[String(node.attrs?.id)] ?? 1,
                  id: String(node.attrs?.id),
                  block: String(node.attrs?.id),
                  text: text.slice(0, 350),
                });
              return;
            }
            node.content?.forEach(walk);
          };
          walk(workspace.flow.content);
        } else
          for (const [index, page] of workspace.pages.entries()) {
            if (id !== job.current) return;
            const source = workspace.sources.find(
                (s) => s.id === page.sourceId,
              )!,
              key = source.id + ":" + page.index;
            let text = cache.current.get(key);
            if (text === undefined) {
              const p = await (await getPdf(source)).getPage(page.index + 1),
                content = await p.getTextContent();
              text = content.items
                .map((item) =>
                  "str" in item
                    ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
                    : "",
                )
                .join("");
              cache.current.set(key, text);
            }
            text +=
              "\n" +
              page.marks
                .filter((m) => m.type === "text")
                .map((m) =>
                  m.richText ? academicPlainText(m.richText) : m.text,
                )
                .join("\n");
            let offset = 0;
            const lower = text.toLocaleLowerCase("es");
            while (found.length < 500) {
              const at = lower.indexOf(needle, offset);
              if (at < 0) break;
              found.push({
                page: index + 1,
                id: page.id + "-" + at,
                text: text.slice(
                  Math.max(0, at - 45),
                  at + needle.length + 130,
                ),
              });
              offset = at + needle.length;
            }
            setProgress(`Página ${index + 1} de ${workspace.pages.length}`);
            if (index % 8 === 0)
              await new Promise<void>((r) => setTimeout(r, 0));
          }
        if (id === job.current) {
          setResults(found.slice(0, 500));
          setProgress(
            found.length >= 500
              ? "Primeros 500 resultados"
              : `${found.length} resultado(s)`,
          );
        }
      })().catch(onError);
    }, 220);
    return () => {
      clearTimeout(timer);
      job.current++;
    };
  }, [query, workspace.flow?.content, workspace.pages, workspace.sources]);
  useEffect(() => {
    const active = new Set(workspace.sources.map((s) => s.id));
    for (const key of cache.current.keys())
      if (!active.has(key.split(":")[0])) cache.current.delete(key);
  }, [workspace.sources]);
  const go = (page: number, block?: string) => {
    if (block && editor && !editor.isDestroyed) {
      let pos: number | undefined;
      editor.state.doc.descendants((n, p) => {
        if (n.attrs.id === block) pos = p;
      });
      if (pos !== undefined)
        editor
          .chain()
          .focus()
          .setTextSelection(Math.min(pos + 1, editor.state.doc.content.size))
          .run();
      document
        .getElementById("block-" + block)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const p = workspace.pages[page - 1];
      if (p) onPage(p.id);
    }
  };
  const comments = workspace.flow
    ? findNodes(
        workspace.flow.content,
        (n) => !!n.marks?.some((m) => m.type === "comment"),
      ).flatMap((n) =>
        n
          .marks!.filter((m) => m.type === "comment")
          .map((m) => ({
            id: String(m.attrs?.id),
            text: String(m.attrs?.text),
            quote: n.text || "",
            author: String(m.attrs?.author || "Autor"),
          })),
      )
    : [];
  const list =
    tab === "Contenido"
      ? entries.contents
      : tab === "Figuras"
        ? entries.figures
        : tab === "Tablas"
          ? entries.tables
          : entries.appendices;
  return (
    <div className="document-navigation">
      <header>
        <strong>Navegación</strong>
        <Button title="Cerrar navegación" onClick={onClose}>
          <X size={16} />
        </Button>
      </header>
      <label className="navigation-search">
        <Search size={15} />
        <input
          aria-label="Buscar en todo el documento"
          placeholder="Buscar en todo el documento"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setTab("Buscar");
          }}
        />
      </label>
      <nav>
        {[
          "Buscar",
          "Páginas",
          "Contenido",
          "Figuras",
          "Tablas",
          "Apéndices",
          "Comentarios",
        ].map((t) => (
          <Button
            key={t}
            className={t === tab ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </nav>
      <div className="navigation-results">
        {tab === "Buscar" && (
          <>
            <small>
              {progress || "Busca palabras o frases en todas las páginas."}
            </small>
            {results.map((r) => (
              <button key={r.id} onClick={() => go(r.page, r.block)}>
                <b>Página {r.page}</b>
                <span>{r.text}</span>
              </button>
            ))}
          </>
        )}
        {tab === "Páginas" &&
          workspace.pages.map((page, i) => (
            <button
              className="navigation-thumbnail"
              key={page.id}
              onClick={() => onPage(page.id)}
            >
              <PageThumbnail
                source={workspace.sources.find((s) => s.id === page.sourceId)!}
                page={page}
              />
              <b>{i + 1}</b>
            </button>
          ))}
        {!["Buscar", "Páginas", "Comentarios"].includes(tab) && (
          <>
            {!list.length && (
              <p>
                Usa títulos, rótulos de figuras y tablas o encabezados de
                apéndice para generar esta lista.
              </p>
            )}
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() =>
                  go(
                    r.page ?? workspace.flow?.pageMap?.[r.targetId] ?? 1,
                    r.targetId,
                  )
                }
                style={{ paddingLeft: 8 + (r.level ?? 1) * 8 }}
              >
                <span>{r.label}</span>
                <small>
                  Pág. {r.page ?? workspace.flow?.pageMap?.[r.targetId] ?? "—"}
                </small>
              </button>
            ))}
          </>
        )}
        {tab === "Comentarios" && (
          <>
            {!comments.length && (
              <p>Selecciona texto y usa Revisar → Comentario.</p>
            )}
            {comments
              .filter((c, i, a) => a.findIndex((n) => n.id === c.id) === i)
              .map((c) => (
                <article className="comment-card" key={c.id}>
                  <strong>{c.author}</strong>
                  <p>{c.text}</p>
                  <small>
                    «
                    {comments
                      .filter((n) => n.id === c.id)
                      .map((n) => n.quote)
                      .join("")}
                    »
                  </small>
                  <Button
                    onClick={() => {
                      if (!editor || editor.isDestroyed) return;
                      let range: { from: number; to: number } | undefined;
                      editor.state.doc.descendants((n, pos) => {
                        if (
                          n.marks.some(
                            (m) =>
                              m.type.name === "comment" && m.attrs.id === c.id,
                          )
                        )
                          range = range
                            ? {
                                from: Math.min(range.from, pos),
                                to: Math.max(range.to, pos + n.nodeSize),
                              }
                            : { from: pos, to: pos + n.nodeSize };
                      });
                      if (range)
                        editor
                          .chain()
                          .focus()
                          .setTextSelection(range)
                          .scrollIntoView()
                          .run();
                    }}
                  >
                    Ir al texto
                  </Button>
                  <Button
                    onClick={() => {
                      if (!editor || editor.isDestroyed) return;
                      const tr = editor.state.tr;
                      editor.state.doc.descendants((n, pos) => {
                        for (const m of n.marks)
                          if (m.type.name === "comment" && m.attrs.id === c.id)
                            tr.removeMark(pos, pos + n.nodeSize, m);
                      });
                      editor.view.dispatch(tr);
                    }}
                  >
                    Resolver
                  </Button>
                </article>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
