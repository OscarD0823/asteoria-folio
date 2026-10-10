import type { RichNode } from "./flow";
export const hasRichMark = (
  node: RichNode | undefined,
  mark: string,
): boolean =>
  !!node &&
  (!!node.marks?.some((m) => m.type === mark) ||
    !!node.content?.some((n) => hasRichMark(n, mark)));
export function formatRichNode(
  node: RichNode,
  command: string,
  value?: string,
): RichNode {
  const toggle = ["bold", "italic", "underline", "strike"].includes(command),
    enabled = !hasRichMark(node, command);
  function visit(n: RichNode): RichNode {
    let result = { ...n };
    if (n.content) result.content = n.content.map(visit);
    if (n.type === "text") {
      if (toggle)
        result.marks = [
          ...(n.marks ?? []).filter((m) => m.type !== command),
          ...(enabled ? [{ type: command }] : []),
        ];
      const attr =
        command === "font"
          ? "fontFamily"
          : command === "size"
            ? "fontSize"
            : command === "color"
              ? "color"
              : undefined;
      if (attr) {
        const old = n.marks?.find((m) => m.type === "textStyle");
        result.marks = [
          ...(n.marks ?? []).filter((m) => m.type !== "textStyle"),
          {
            type: "textStyle",
            attrs: {
              ...old?.attrs,
              [attr]: command === "size" ? value + "pt" : value,
            },
          },
        ];
      }
    }
    if (
      ["paragraph", "heading"].includes(n.type ?? "") &&
      (command === "align" || command === "spacing")
    )
      result.attrs = {
        ...n.attrs,
        [command === "align" ? "textAlign" : "lineHeight"]: value,
      };
    return result;
  }
  return visit(node);
}
