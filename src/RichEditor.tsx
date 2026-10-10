import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Node, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import type { RichNode } from "./flow";
export type RichEditorInstance = Editor;
const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: () => [
    "div",
    { "data-page-break": "true", class: "page-break" },
    "Salto de página",
  ],
});
const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => Number(el.dataset.indent) || 0,
            renderHTML: (attrs) => ({
              "data-indent": attrs.indent,
              style: `margin-left:${Number(attrs.indent) * 18}pt`,
            }),
          },
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight,
            renderHTML: (attrs) =>
              attrs.lineHeight
                ? { style: `line-height:${attrs.lineHeight}` }
                : {},
          },
        },
      },
    ];
  },
});
export function RichEditor({
  content,
  onChange,
  onFocus,
  inline = false,
  style,
  autoFocus = false,
}: {
  content: RichNode;
  onChange: (node: RichNode) => void;
  onFocus: (editor: Editor) => void;
  inline?: boolean;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["https", "http", "mailto"] },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          alwaysPreserveAspectRatio: true,
          minWidth: 24,
          minHeight: 24,
        },
      }),
      TableKit.configure({ table: { resizable: true } }),
      Placeholder.configure({
        placeholder: inline
          ? "Escribe aquí…"
          : "Empieza a escribir tu documento…",
      }),
      Superscript,
      Subscript,
      PageBreak,
      Indent,
    ],
    content,
    autofocus: autoFocus ? "end" : false,
    onCreate: ({ editor }) => {
      if (autoFocus && !editor.isDestroyed) onFocus(editor);
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onFocus: ({ editor }) => onFocus(editor),
    onSelectionUpdate: ({ editor }) => onFocus(editor),
    editorProps: {
      attributes: {
        class: inline ? "inline-prose" : "document-prose",
        "aria-label": inline
          ? "Editar texto del documento"
          : "Contenido del documento",
      },
      transformPastedHTML: (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        for (const img of doc.querySelectorAll("img"))
          if (!/^data:image\/(png|jpeg);base64,/i.test(img.src)) img.remove();
        for (const el of doc.querySelectorAll("script,iframe,object,embed"))
          el.remove();
        return doc.body.innerHTML;
      },
    },
  });
  useEffect(() => {
    if (
      editor &&
      !editor.isDestroyed &&
      JSON.stringify(editor.getJSON()) !== JSON.stringify(content)
    )
      editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);
  return (
    <div className={inline ? "inline-editor" : "rich-editor"} style={style}>
      <EditorContent editor={editor} />
    </div>
  );
}
