import type { Mark } from "./pdf";
import type { RichNode } from "@prisma/writer/flow";

export function markContent(m: Mark): RichNode {
  if (m.richText) return m.richText;
  return {
    type: "doc",
    content: (m.text ?? "").split("\n").map((text) => ({
      type: "paragraph",
      content: text
        ? [
            {
              type: "text",
              text,
              marks: [
                ...(m.bold ? [{ type: "bold" }] : []),
                ...(m.italic ? [{ type: "italic" }] : []),
                ...(m.underline ? [{ type: "underline" }] : []),
                ...(m.strike ? [{ type: "strike" }] : []),
                {
                  type: "textStyle",
                  attrs: {
                    fontFamily: m.font ?? "PrismaSans",
                    fontSize: m.size + "pt",
                    color: m.color,
                  },
                },
              ],
            },
          ]
        : [],
    })),
  };
}

// TipTap fills in schema defaults on every paragraph. Those defaults and
// editor positioning metadata must not turn untouched PDF text into an edit.
export function textContentKey(node: RichNode): string {
  const clean = (n: RichNode): unknown => {
    const attrs = Object.fromEntries(
      Object.entries(n.attrs ?? {})
        .filter(([k, v]) => {
          if (["id", "pdfBox", "page", "indexLevel", "indexLeader"].includes(k))
            return false;
          if (n.type !== "text" && ["fontFamily", "fontSize"].includes(k))
            return false;
          if (v == null || v === false || v === 0 || v === "") return false;
          if (k === "lineHeight" && Number(v) === 1.25) return false;
          if (k === "textAlign" && v === "left") return false;
          return true;
        })
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    return {
      type: n.type,
      ...(n.text !== undefined ? { text: n.text } : {}),
      ...(Object.keys(attrs).length ? { attrs } : {}),
      ...(n.marks?.length
        ? {
            marks: n.marks
              .map(clean)
              .sort((a, b) =>
                JSON.stringify(a).localeCompare(JSON.stringify(b)),
              ),
          }
        : {}),
      ...(n.content?.length ? { content: n.content.map(clean) } : {}),
    };
  };
  return JSON.stringify(clean(node));
}

export function preparedTextChanged(original: Mark, current?: Mark): boolean {
  if (!current) return true;
  const geometry = [
    "x",
    "y",
    "width",
    "height",
    "size",
    "font",
    "color",
    "opacity",
    "viewRotation",
    "align",
    "lineHeight",
  ] as const;
  return (
    geometry.some((k) => original[k] !== current[k]) ||
    textContentKey(markContent(original)) !==
      textContentKey(markContent(current))
  );
}
