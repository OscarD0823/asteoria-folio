import { Node, Mark, Extension, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { captionBlocks } from "./academic";
import { plainText } from "./flow";
import { correctWord } from "./document-tools";
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
    attributes({ id: "", refId: "", label: "[?]", referenceAnchor: "" }),
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
    attributes({ id: "", kind: "contents", entries: [], title: "" }),
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
              } | null;
              return b
                ? {
                    "data-pdf-box": "true",
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
                  if (char === " " || char === "\t" || char === "\u00a0")
                    dec.push(
                      Decoration.widget(
                        pos + i,
                        () => {
                          const span = document.createElement("span");
                          span.className = "formatting-mark";
                          span.textContent =
                            char === "\t" ? "→" : char === "\u00a0" ? "°" : "·";
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
