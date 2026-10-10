import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/core";
export type TextMatch = { from: number; to: number; text: string };
export function replacementMatches(
  doc: ProseMirrorNode,
  query: string,
  caseSensitive = false,
  wholeWord = false,
): TextMatch[] {
  if (!query || query.length > 1000) return [];
  const pattern = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      caseSensitive ? "gu" : "giu",
    ),
    matches: TextMatch[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "generatedIndex") return false;
    if (!node.isTextblock) return;
    let text = "";
    node.forEach((child) => {
      text += child.isText
        ? child.text
        : child.type.name === "hardBreak"
          ? "\n"
          : "\uFFFC".repeat(child.nodeSize);
    });
    for (const match of text.matchAll(pattern)) {
      const at = match.index,
        end = at + match[0].length;
      if (match[0].includes("\uFFFC")) continue;
      if (
        wholeWord &&
        ((at > 0 &&
          /[\p{L}\p{M}\p{N}_]/u.test(
            String.fromCodePoint(
              text.codePointAt(
                at > 1 && /[\uDC00-\uDFFF]/.test(text[at - 1])
                  ? at - 2
                  : at - 1,
              )!,
            ),
          )) ||
          (end < text.length &&
            /[\p{L}\p{M}\p{N}_]/u.test(
              String.fromCodePoint(text.codePointAt(end)!),
            )))
      )
        continue;
      matches.push({ from: pos + 1 + at, to: pos + 1 + end, text: match[0] });
    }
    return false;
  });
  return matches;
}
export function replaceText(
  editor: Editor,
  query: string,
  replacement: string,
  { caseSensitive = false, wholeWord = false, all = false } = {},
) {
  const matches = replacementMatches(
      editor.state.doc,
      query,
      caseSensitive,
      wholeWord,
    ),
    selection = editor.state.selection;
  const targets = all
    ? matches
    : [matches.find((m) => m.from >= selection.from) ?? matches[0]].filter(
        Boolean,
      );
  const tr = editor.state.tr;
  for (const match of [...targets].reverse()) {
    const marks = editor.state.doc.resolve(match.from).marks();
    if (replacement)
      tr.replaceWith(
        match.from,
        match.to,
        editor.schema.text(replacement, marks),
      );
    else tr.delete(match.from, match.to);
  }
  if (targets.length) editor.view.dispatch(tr.scrollIntoView());
  return targets.length;
}
