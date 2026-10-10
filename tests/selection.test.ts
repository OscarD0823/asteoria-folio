import test from "node:test";
import assert from "node:assert/strict";
import { Schema } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { captureSelection, restoreSelection } from "../src/document-selection";
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "text*",
      attrs: { id: { default: null } },
    },
    text: { group: "inline" },
    image: {
      group: "block",
      atom: true,
      attrs: {
        id: { default: null },
        width: { default: 400 },
        align: { default: "left" },
      },
    },
  },
});
const paragraph = (id: string, text: string) =>
  schema.node("paragraph", { id }, schema.text(text));
test("resizing and automatic captions retain the same selected object for the following alignment change", () => {
  const old = schema.node("doc", null, [
    paragraph("body", "Texto"),
    schema.node("image", { id: "figure" }),
  ]);
  const saved = captureSelection(
    NodeSelection.create(old, old.child(0).nodeSize),
  );
  const next = schema.node("doc", null, [
    old.child(0),
    paragraph("caption", "Figura 1"),
    schema.node("image", { id: "figure", width: 180 }),
  ]);
  const restored = restoreSelection(saved, next);
  assert.ok(restored instanceof NodeSelection);
  assert.equal(restored.node.attrs.id, "figure");
  assert.equal(restored.node.attrs.width, 180);
});
test("typing selection remains in its paragraph when generated blocks are inserted before it", () => {
  const old = schema.node("doc", null, [
    paragraph("body", "Texto seleccionado"),
  ]);
  const saved = captureSelection(TextSelection.create(old, 7, 19));
  const next = schema.node("doc", null, [
    paragraph("index", "Índice automático"),
    old.child(0),
  ]);
  const restored = restoreSelection(saved, next);
  assert.equal(next.textBetween(restored.from, restored.to), "seleccionado");
  assert.equal(restored.$from.parent.attrs.id, "body");
});
