import { useEffect, useRef } from "react";
import { captureSelection, restoreSelection } from "./document-selection";
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
import type { PageLayout } from "./flow";
import { Pagination } from "./PaginationExtension";
import {
  Citation,
  Caption,
  Appendix,
  GeneratedIndex,
  ColumnBreak,
  SectionBreak,
  Annotation,
  Media,
  DocumentAttributes,
  FormattingMarks,
  SpellingMarks,
} from "./document-extensions";
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
  showMarks = false,
  autoCorrect = false,
  positioned = false,
  searchQuery = "",
  pageLayout,
  onPages,
}: {
  content: RichNode;
  onChange: (node: RichNode) => void;
  onFocus: (editor: Editor) => void;
  inline?: boolean;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  showMarks?: boolean;
  autoCorrect?: boolean;
  positioned?: boolean;
  searchQuery?: string;
  pageLayout?: PageLayout;
  onPages?: (count: number) => void;
}) {
  const lastExternal = useRef("");
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
      Citation,
      Caption,
      Appendix,
      GeneratedIndex,
      ColumnBreak,
      SectionBreak,
      Annotation,
      ...Media,
      DocumentAttributes,
      SpellingMarks,
      Pagination.configure({ layout: pageLayout, onPages }),
      FormattingMarks.configure({
        enabled: showMarks,
        autoCorrect,
        query: searchQuery,
      }),
    ],
    content,
    autofocus: autoFocus ? (inline ? "end" : "start") : false,
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
        spellcheck: "true",
        lang: "es",
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
    if (!editor || editor.isDestroyed) return;
    const incoming = JSON.stringify(
      editor.schema.nodeFromJSON(content).toJSON(),
    );
    if (incoming === lastExternal.current) return;
    lastExternal.current = incoming;
    if (
      editor &&
      !editor.isDestroyed &&
      JSON.stringify(editor.getJSON()) !== incoming
    ) {
      const selection = captureSelection(editor.state.selection);
      editor.commands.setContent(content, { emitUpdate: false });
      editor.view.dispatch(
        editor.state.tr.setSelection(
          restoreSelection(selection, editor.state.doc),
        ),
      );
    }
  }, [content, editor]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const extension = editor.extensionManager.extensions.find(
      (e) => e.name === "formattingMarks",
    );
    if (extension) {
      Object.assign(
        (
          editor.storage as unknown as Record<
            string,
            { enabled: boolean; autoCorrect: boolean; query: string }
          >
        ).formattingMarks,
        { enabled: showMarks, autoCorrect, query: searchQuery },
      );
      editor.view.dispatch(editor.state.tr);
    }
  }, [editor, showMarks, autoCorrect, searchQuery]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const storage = editor.storage as unknown as {
      pagination: { layout?: PageLayout; onPages?: (count: number) => void };
    };
    Object.assign(storage.pagination, { layout: pageLayout, onPages });
    editor.view.dispatch(editor.state.tr.setMeta("paginationLayout", true));
    window.dispatchEvent(new Event("resize"));
  }, [editor, pageLayout, onPages]);
  return (
    <div
      className={
        positioned
          ? "pdf-document-editor"
          : inline
            ? "inline-editor"
            : "rich-editor"
      }
      style={style}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
