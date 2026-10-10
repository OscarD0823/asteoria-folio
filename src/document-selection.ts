import { NodeSelection, TextSelection, Selection } from "@tiptap/pm/state";
import type { Node, ResolvedPos } from "@tiptap/pm/model";
type Point = { id?: string; offset: number; position: number };
export type SavedSelection = { nodeId?: string; anchor: Point; head: Point };
const point = ($pos: ResolvedPos): Point => {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.isTextblock && node.attrs.id)
      return {
        id: String(node.attrs.id),
        offset: $pos.pos - $pos.start(depth),
        position: $pos.pos,
      };
  }
  return { offset: 0, position: $pos.pos };
};
/** Keep the selected object or text block through automatic captions and pagination. */
export function captureSelection(selection: Selection): SavedSelection {
  return {
    nodeId:
      selection instanceof NodeSelection ? selection.node.attrs.id : undefined,
    anchor: point(selection.$anchor),
    head: point(selection.$head),
  };
}
export function restoreSelection(saved: SavedSelection, doc: Node): Selection {
  const positions = new Map<string, { node: Node; pos: number }>();
  doc.descendants((node, pos) => {
    if (node.attrs.id) positions.set(String(node.attrs.id), { node, pos });
  });
  const selected = saved.nodeId ? positions.get(saved.nodeId) : undefined;
  if (selected && NodeSelection.isSelectable(selected.node))
    return NodeSelection.create(doc, selected.pos);
  const resolve = (p: Point) => {
    const block = p.id ? positions.get(p.id) : undefined;
    return block
      ? block.pos + 1 + Math.min(p.offset, block.node.content.size)
      : Math.max(0, Math.min(p.position, doc.content.size));
  };
  const anchor = resolve(saved.anchor),
    head = resolve(saved.head);
  return doc.resolve(anchor).parent.inlineContent &&
    doc.resolve(head).parent.inlineContent
    ? TextSelection.create(doc, anchor, head)
    : Selection.near(doc.resolve(anchor));
}
