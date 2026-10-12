import { Node, Mark, Extension, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { captionBlocks, collectDocumentEntries } from "./academic";
import { plainText } from "./flow";
import { correctWord } from "./document-tools";
import { sectionKinds, type SectionKind } from "./sections";
import { defaultLayout } from "./flow";
import { validateLayout } from "./projects";
import { formattingCharacter } from "./characters";
import { spellingKey } from "./SpellingReview";
import type { WordLocation } from "./spelling";
export const SpellingMarks = Extension.create({
  name: "spellingMarks",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: spellingKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, previous) {
            const words = tr.getMeta(spellingKey) as WordLocation[] | undefined;
            return words
              ? DecorationSet.create(
                  tr.doc,
                  words.map((w) =>
                    Decoration.inline(w.from, w.to, {
                      class: "spelling-error",
                      title: "Posible error ortográfico",
                    }),
                  ),
                )
              : previous.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return spellingKey.getState(state);
          },
        },
      }),
    ];
  },
});
const attributes = (defaults: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, { default: value }]),
  );
export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () =>
    attributes({
      id: "",
      refId: "",
      label: "[?]",
      referenceAnchor: "",
      locator: "",
    }),
  parseHTML: () => [{ tag: "span[data-citation]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, {
      "data-citation": "true",
      class: "citation-token",
      title: "Cita bibliográfica",
    }),
    String(HTMLAttributes.label),
  ],
});
export const Caption = Node.create({
  name: "caption",
  group: "block",
  content: "paragraph*",
  defining: true,
  addAttributes: () =>
    attributes({
      id: "",
      kind: "table",
      targetId: "",
      title: "",
      note: "",
      number: 0,
      label: "",
      academicStyle: "free",
      appendixLetter: "",
      appendixNumbered: false,
    }),
  parseHTML: () => [{ tag: "div[data-caption]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-caption": "true",
      class: "academic-caption",
    }),
    0,
  ],
});
export const Appendix = Node.create({
  name: "appendix",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes: () =>
    attributes({ id: "", title: "", label: "Apéndice", breakBefore: true }),
  parseHTML: () => [{ tag: "h2[data-appendix]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "h2",
    mergeAttributes(HTMLAttributes, {
      "data-appendix": "true",
      class: "appendix-heading",
    }),
    0,
  ],
});
export const GeneratedIndex = Node.create({
  name: "generatedIndex",
  group: "block",
  content: "paragraph*",
  defining: true,
  addAttributes: () =>
    attributes({
      id: "",
      kind: "contents",
      entries: [],
      title: "",
      levels: 3,
      minLevel: 1,
      leader: "dots",
      pageNumbers: true,
      academicStyle: "free",
    }),
  parseHTML: () => [{ tag: "section[data-generated-index]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, {
      "data-generated-index": "true",
      class: "generated-index",
      contenteditable: "false",
    }),
    0,
  ],
  addNodeView() {
    return ({ node,editor,getPos }) => {
      const dom = document.createElement("section");
      dom.className = "generated-index index-paper";
      dom.dataset.generatedIndex = "true";
      dom.id = "block-" + node.attrs.id;
      dom.contentEditable = "false";
      const first = node.firstChild;
      if (first?.attrs.fontFamily)
        dom.style.fontFamily = String(first.attrs.fontFamily);
      if (first?.attrs.fontSize)
        dom.style.fontSize = first.attrs.fontSize + "pt";
      if (first?.attrs.lineHeight)
        dom.style.lineHeight = String(first.attrs.lineHeight);
      const title = document.createElement("h2");
      title.className = "index-heading";
      if (node.attrs.academicStyle === "apa") {
        title.style.fontSize = "12pt";
        title.style.textAlign = "center";
      }
      title.textContent = node.attrs.title || "Tabla de contenido";
      dom.append(title);
      if (node.attrs.kind === "references") {
        const contentDOM = document.createElement("div");
        dom.append(contentDOM);
        return { dom, contentDOM };
      }
      const actions=document.createElement('div');actions.className='index-actions';
      const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Actualizar tabla';refresh.setAttribute('aria-label','Actualizar '+(title.textContent??'tabla de contenido').toLocaleLowerCase());
      refresh.addEventListener('mousedown',event=>event.preventDefault());
      refresh.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const position=getPos();if(typeof position!=='number')return;const groups=collectDocumentEntries(editor.getJSON());const kind=node.attrs.kind as keyof typeof groups;const entries=(groups[kind]??[]).filter(entry=>kind!=='contents'||((entry.level??1)>=(Number(node.attrs.minLevel)||1)&&(entry.level??1)<=(Number(node.attrs.levels)||3))).map(({path:_path,...entry})=>entry);editor.view.dispatch(editor.state.tr.setNodeMarkup(position,undefined,{...node.attrs,entries}));});
      actions.append(refresh);dom.append(actions);
      const entries = node.attrs.entries as {
        label: string;
        targetId: string;
        page?: number;
        level?: number;
      }[];
      for (const entry of entries) {
        const row = document.createElement("a");
        row.className = "index-entry";
        row.href = "#block-" + entry.targetId;
        row.style.paddingLeft = `${Math.max(0, (entry.level || 1) - 1) * 18}pt`;
        const text = document.createElement("span");
        text.className = "index-entry-text";
        text.textContent = entry.label;
        row.append(text);
        if (node.attrs.pageNumbers) {
          const leader = document.createElement("span");
          leader.className = "index-leader leader-" + node.attrs.leader;
          leader.setAttribute("aria-hidden", "true");
          const page = document.createElement("span");
          page.className = "index-entry-page";
          page.textContent = String(entry.page || "—");
          row.append(leader, page);
        }
        row.addEventListener("click", (e) => {
          e.preventDefault();
          Array.from(editor.view.dom.querySelectorAll<HTMLElement>('[data-block-id]')).find(element=>element.dataset.blockId===entry.targetId)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        dom.append(row);
      }
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "index-empty";
        empty.textContent =
          "Aplica estilos de título al documento. El índice se actualizará automáticamente.";
        dom.append(empty);
      }
      return { dom, ignoreMutation: () => true,stopEvent:event=>event.target instanceof HTMLElement&&!!event.target.closest('button,a') };
    };
  },
});
export const SectionBreak = Node.create({
  name: "sectionBreak",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes: () =>
    attributes({
      id: "",
      title: "",
      kind: "nextPage",
      layout: defaultLayout(),
      linkToPrevious: true,
      restartNumbering: false,
    }),
  parseHTML: () => [
    {
      tag: "div[data-section-break]",
      getAttrs: (element) => {
        try {
          const attrs = JSON.parse(
            element.getAttribute("data-section-settings") || "{}",
          );
          validateLayout(attrs.layout);
          if (!(attrs.kind in sectionKinds)) return false;
          return attrs;
        } catch {
          return false;
        }
      },
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    {
      "data-section-break": true,
      "data-section-settings": JSON.stringify(node.attrs),
      class: "section-break",
      contenteditable: "false",
      id: "block-" + node.attrs.id,
    },
    `${node.attrs.title || "Sección"} · Salto de sección (${sectionKinds[node.attrs.kind as SectionKind] ?? "Página siguiente"})`,
  ],
});
export const ColumnBreak = Node.create({
  name: "columnBreak",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-column-break]" }],
  renderHTML: () => [
    "div",
    { "data-column-break": "true", class: "page-break" },
    "Salto de columna",
  ],
});
export const Annotation = Mark.create({
  name: "comment",
  inclusive: false,
  addAttributes: () => attributes({ id: "", text: "", author: "", date: "" }),
  parseHTML: () => [{ tag: "span[data-comment]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, {
      "data-comment": "true",
      class: "comment-anchor",
      title: HTMLAttributes.text,
    }),
    0,
  ],
});
export const Media = ["equation", "chart", "shape", "video"].map((name) =>
  Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () =>
      attributes({
        id: "",
        src: "",
        alt: "",
        width: 400,
        height: null,
        align: "left",
        latex: "",
        url: "",
        data: "",
        kind: "",
        values: "",
        title: "",
        color: "#6554d8",
      }),
    parseHTML: () => [{ tag: `figure[data-media="${name}"]` }],
    renderHTML: ({ HTMLAttributes }) => [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-media": name,
        "data-align": HTMLAttributes.align,
        class: `document-media media-${name}`,
      }),
      [
        "img",
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt || HTMLAttributes.title || name,
          style: `width:${Number(HTMLAttributes.width) || 400}px;max-width:100%;height:auto`,
        },
      ],
      ...(name === "video"
        ? [["figcaption", {}, "▶ " + String(HTMLAttributes.title || "Video")]]
        : []),
    ],
    addNodeView() {
      if (name !== "video") return null;
      return ({ node }) => {
        const dom = document.createElement("figure");
        dom.className = "document-media media-video";
        dom.dataset.align = String(node.attrs.align);
        dom.dataset.blockId = String(node.attrs.id);
        dom.id = "block-" + node.attrs.id;
        dom.contentEditable = "false";
        if (/^data:video\/(mp4|webm);base64,/i.test(String(node.attrs.data))) {
          const video = document.createElement("video");
          video.controls = true;
          video.preload = "metadata";
          video.src = String(node.attrs.data);
          video.style.cssText = `width:${Number(node.attrs.width) || 400}px;max-width:100%`;
          dom.append(video);
        } else {
          const image = document.createElement("img");
          image.src = String(node.attrs.src);
          image.alt = String(node.attrs.title || "Video");
          image.style.cssText = `width:${Number(node.attrs.width) || 400}px;max-width:100%`;
          dom.append(image);
          if (/^https?:\/\//i.test(String(node.attrs.url))) {
            const link = document.createElement("a");
            link.href = String(node.attrs.url);
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Abrir video";
            dom.append(link);
          }
        }
        return {
          dom,
          stopEvent: (e) =>
            e.target instanceof HTMLElement && !!e.target.closest("video,a"),
        };
      };
    },
  }),
);
export const DocumentAttributes = Extension.create({
  name: "documentAttributes",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "table",
          "image",
          "codeBlock",
          "caption",
          "appendix",
          "generatedIndex",
          ...Media.map((n) => n.name),
        ],
        attributes: {
          page: { default: null },
          targetId: { default: null },
          id: {
            default: null,
            renderHTML: (a) =>
              a.id ? { "data-block-id": a.id, id: "block-" + a.id } : {},
          },
        },
      },
      {
        types: ["paragraph", "heading", "table"],
        attributes: { academicStyle: { default: null } },
      },
      {
        types: ["paragraph", "heading", "caption", "appendix"],
        attributes: {
          paragraphStyle: {
            default: null,
            renderHTML: (a) =>
              a.paragraphStyle
                ? { "data-paragraph-style": a.paragraphStyle }
                : {},
          },
          indexEntry: { default: false },
          indexLevel: { default: 1 },
          indexLeader: { default: "dots" },
          indexPage: { default: null },
          indexLabel: { default: "" },
          fontFamily: {
            default: null,
            renderHTML: (a) =>
              a.fontFamily ? { style: `font-family:${a.fontFamily}` } : {},
          },
          fontSize: {
            default: null,
            renderHTML: (a) =>
              a.fontSize ? { style: `font-size:${a.fontSize}pt` } : {},
          },
          firstLineIndent: {
            default: 0,
            renderHTML: (a) => ({
              style: `text-indent:${Number(a.firstLineIndent) - Number(a.hangingIndent || 0)}pt`,
            }),
          },
          hangingIndent: {
            default: 0,
            renderHTML: (a) => ({
              style: `padding-left:${Number(a.hangingIndent) || 0}pt`,
            }),
          },
          spaceBefore: {
            default: null,
            renderHTML: (a) =>
              a.spaceBefore !== null
                ? { style: `margin-top:${Number(a.spaceBefore)}pt` }
                : {},
          },
          spaceAfter: {
            default: null,
            renderHTML: (a) =>
              a.spaceAfter !== null
                ? { style: `margin-bottom:${Number(a.spaceAfter)}pt` }
                : {},
          },
          breakBefore: {
            default: false,
            renderHTML: (a) => (a.breakBefore ? { class: "break-before" } : {}),
          },
          appendix: { default: false },
          appendixLabel: { default: "" },
          appendixTitle: { default: "" },
          pdfBox: {
            default: null,
            renderHTML: (a) => {
              const b = a.pdfBox as {
                x: number;
                y: number;
                width: number;
                sourceLine?: boolean;
                keepOriginal?: boolean;
              } | null;
              return b
                ? {
                    "data-pdf-box": "true",
                    "data-pdf-original": b.keepOriginal ? "true" : undefined,
                    "data-pdf-source-line": b.sourceLine ? "true" : undefined,
                    style: `position:absolute;left:${b.x}pt;top:${b.y}pt;width:${b.width}pt;margin:0;min-height:1em`,
                  }
                : {};
            },
          },
        },
      },
      {
        types: ["bulletList", "orderedList"],
        attributes: {
          listStyle: {
            default: null,
            renderHTML: (a) =>
              a.listStyle ? { style: `list-style-type:${a.listStyle}` } : {},
          },
        },
      },
      {
        types: ["image", "table"],
        attributes: {
          align: {
            default: "left",
            renderHTML: (a) => ({ "data-align": a.align }),
          },
          title: { default: "" },
          note: { default: "" },
        },
      },
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("stableDocumentIds"),
        props:{handleDOMEvents:{click:(view,event)=>{
          const anchor=(event.target as HTMLElement).closest?.('a');const href=anchor?.getAttribute('href');if(!href?.startsWith('#'))return false;
          const id=href.replace(/^#(?:block-)?/,'');const target=Array.from(view.dom.querySelectorAll<HTMLElement>('[data-block-id]')).find(element=>element.dataset.blockId===id);
          if(!target)return false;event.preventDefault();target.scrollIntoView({behavior:'smooth',block:'center'});return true;
        }}},
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const tr = state.tr;
          const used = new Set<string>();
          state.doc.descendants((node, pos) => {
            if (!("id" in node.attrs)) return;
            if (!node.attrs.id || used.has(node.attrs.id)) {
              const id = crypto.randomUUID();
              const box = node.attrs.pdfBox;
              let pdfBox = box;
              if (box && used.has(node.attrs.id)) {
                const previous = state.doc.resolve(pos).nodeBefore;
                const previousBox = previous?.attrs.pdfBox;
                if (previousBox) {
                  const size = Number(previous.attrs.fontSize) || 12;
                  const lines = Math.max(
                    1,
                    Math.ceil(
                      (previous.textContent.length * size * 0.52) /
                        Math.max(10, previousBox.width),
                    ),
                  );
                  pdfBox = {
                    ...box,
                    y:
                      previousBox.y +
                      lines *
                        size *
                        (Number(previous.attrs.lineHeight) || 1.25),
                  };
                }
              }
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                id,
                ...(box ? { pdfBox } : {}),
              });
              used.add(id);
            } else used.add(node.attrs.id);
          });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
export const FormattingMarks = Extension.create({
  name: "formattingMarks",
  addOptions: () => ({ enabled: false, autoCorrect: false, query: "" }),
  addStorage() {
    return { ...this.options };
  },
  addProseMirrorPlugins() {
    const options = this.storage;
    return [
      new Plugin({
        key: new PluginKey("formattingMarks"),
        props: {
          decorations(state) {
            const dec: Decoration[] = [];
            const captions = new Map<
              string,
              ReturnType<typeof captionBlocks>
            >();
            state.doc.descendants((n) => {
              if (n.type.name === "caption")
                captions.set(
                  String(n.attrs.targetId),
                  captionBlocks(n.toJSON(), n.attrs.academicStyle ?? "free"),
                );
            });
            state.doc.descendants((n, pos) => {
              const cap = captions.get(n.attrs.id);
              if (cap?.after.length)
                dec.push(
                  Decoration.widget(
                    pos + n.nodeSize,
                    () => {
                      const note = document.createElement("div");
                      note.className = "academic-note";
                      note.textContent = cap.after.map(plainText).join("\n");
                      return note;
                    },
                    { side: 1 },
                  ),
                );
            });
            state.doc.descendants((n, pos) => {
              if (n.isText && options.query) {
                const text = (n.text ?? "").toLocaleLowerCase("es"),
                  query = String(options.query).toLocaleLowerCase("es");
                let offset = 0;
                while (query) {
                  const at = text.indexOf(query, offset);
                  if (at < 0) break;
                  dec.push(
                    Decoration.inline(pos + at, pos + at + query.length, {
                      class: "document-search-hit",
                    }),
                  );
                  offset = at + query.length;
                }
              }
              if (n.isText && options.enabled) {
                let offset = 0;
                Array.from(n.text ?? "").forEach((char) => {
                  const i = offset;
                  offset += char.length;
                  const info = formattingCharacter(char);
                  if (info)
                    dec.push(
                      Decoration.widget(
                        pos + i,
                        () => {
                          const span = document.createElement("span");
                          span.className = "formatting-mark";
                          span.textContent = info.mark;
                          span.title = info.name;
                          if (info.mark.length > 1)
                            span.classList.add("unicode-formatting-mark");
                          span.setAttribute("aria-hidden", "true");
                          return span;
                        },
                        { side: 1 },
                      ),
                    );
                });
              }
              if (n.isTextblock && options.enabled)
                dec.push(
                  Decoration.widget(
                    pos + n.nodeSize - 1,
                    () => {
                      const span = document.createElement("span");
                      span.className = "formatting-mark paragraph-mark";
                      span.textContent = "¶";
                      return span;
                    },
                    { side: -1 },
                  ),
                );
            });
            return DecorationSet.create(state.doc, dec);
          },
          handleTextInput(view, from, to, text) {
            if (
              !options.autoCorrect ||
              !/^[\s.,;:!?]$/.test(text) ||
              from !== to
            )
              return false;
            const before = view.state.doc.textBetween(
              Math.max(0, from - 80),
              from,
              " ",
            );
            const match = before.match(/([\p{L}]+)$/u);
            if (!match) return false;
            const word = match[1],
              fixed = correctWord(word);
            if (word === fixed) return false;
            view.dispatch(
              view.state.tr.insertText(fixed + text, from - word.length, to),
            );
            return true;
          },
        },
      }),
    ];
  },
});
