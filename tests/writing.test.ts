import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { DOMParser } from "@xmldom/xmldom";
import { Schema } from "@tiptap/pm/model";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import Typo from "typo-js";
import { importDocx } from "../src/document-import";
import {
  graphemeCount,
  inspectCharacters,
  formattingCharacter,
} from "../src/characters";
import { spellingWords } from "../src/spelling";
import { planPages } from "../src/pagination";
import { normalizeAcademicDocument, academicPlainText } from "../src/academic";
import {
  buildFlowDocument,
  defaultLayout,
  type FlowDocument,
} from "../src/flow";
import { exportDocx } from "../src/document-export";
import { setFontLoader } from "../src/fonts";
import { writerExample } from "../src/writer-example";
Object.assign(globalThis, { DOMParser });
setFontLoader(
  async (file) => new Uint8Array(await readFile("public/fonts/" + file)),
);
test("Unicode inspector preserves emoji clusters, nonbreaking spaces and directional characters", () => {
  assert.equal(graphemeCount("👩🏽‍💻🇨🇴a\u0301"), 3);
  const chars = inspectCharacters("ñ\u00a0x\u200b\u200b\u202e👩🏽‍💻");
  assert.equal(chars.find((c) => c.point === 0x200b)?.count, 2);
  assert.equal(
    chars.find((c) => c.point === 0x202e)?.category,
    "Formato e invisibles",
  );
  assert.equal(chars.find((c) => c.point === 0x1f469)?.code, "U+1F469");
  assert.equal(formattingCharacter("\u200d")?.mark, "ZWJ");
  assert.equal(formattingCharacter("\u00a0")?.mark, "°");
});
test("spell locations cross formatting marks and preserve UTF-16 positions without checking URLs", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      generatedIndex: { group: "block", content: "paragraph*" },
      text: { group: "inline" },
    },
    marks: { bold: {} },
  });
  const doc = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "👩🏽‍💻 investi" },
          { type: "text", text: "gación", marks: [{ type: "bold" }] },
          { type: "text", text: " https://google.com también" },
        ],
      },
      {
        type: "generatedIndex",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Ignoreesto" }],
          },
        ],
      },
    ],
  });
  const words = spellingWords(doc);
  assert.deepEqual(
    words.map((w) => w.word),
    ["investigación", "también"],
  );
  for (const word of words)
    assert.equal(doc.textBetween(word.from, word.to), word.word);
});
test("bundled Spanish affix dictionary accepts accents and inflections and suggests corrections", async () => {
  const [aff, dic] = await Promise.all(
    ["index.aff", "index.dic"].map((file) =>
      readFile("public/spelling/" + file, "utf8"),
    ),
  );
  const dictionary = new Typo("es", aff, dic, { platform: "any" });
  for (const word of [
    "investigación",
    "también",
    "árboles",
    "escribiendo",
    "documentos",
    "página",
  ])
    assert.equal(dictionary.check(word), true, word);
  assert.equal(dictionary.check("docuemento"), false);
  assert.ok(dictionary.suggest("docuemento", 6).includes("documento"));
});
test("page separators are visual and keep continuous document positions including manual breaks", () => {
  const plan = planPages(
    [
      { pos: 1, top: 0, bottom: 20 },
      { pos: 80, top: 825, bottom: 846 },
      { pos: 160, top: 865, bottom: 865, force: 1 },
      { pos: 170, top: 865, bottom: 885 },
    ],
    1000,
    80,
    80,
  );
  assert.equal(plan.count, 3);
  assert.equal(plan.breaks.length, 2);
  assert.deepEqual(
    plan.breaks.map((b) => b.pos),
    [80, 160],
  );
  assert.ok(plan.breaks.every((b) => b.height > 0));
  assert.equal(planPages([], 1000, 80, 80).count, 1);
});
test("TOC filters heading levels, separates page numbers and exports an updatable Word field", async () => {
  let flow: FlowDocument = {
    layout: defaultLayout(),
    content: {
      type: "doc",
      content: [
        {
          type: "generatedIndex",
          attrs: {
            id: "toc",
            kind: "contents",
            levels: 2,
            leader: "dots",
            pageNumbers: true,
          },
          content: [],
        },
        {
          type: "heading",
          attrs: { id: "intro", level: 1 },
          content: [{ type: "text", text: "Introducción" }],
        },
        {
          type: "heading",
          attrs: { id: "objectives", level: 2 },
          content: [{ type: "text", text: "Objetivos" }],
        },
        {
          type: "heading",
          attrs: { id: "deep", level: 3 },
          content: [{ type: "text", text: "Detalle" }],
        },
      ],
    },
  };
  const rendered = await buildFlowDocument(flow);
  flow = { ...flow, content: rendered.content };
  const toc = rendered.content.content![0];
  assert.equal((toc.attrs!.entries as unknown[]).length, 2);
  assert.equal(toc.content![0].attrs!.indexLabel, "Introducción");
  assert.ok(toc.content![0].content![0].text!.includes("\t"));
  const files = unzipSync(await exportDocx(flow, "Prueba de índice"));
  const xml = strFromU8(files["word/document.xml"]);
  assert.match(xml, /TOC/);
  assert.match(xml, /1-2/);
  assert.match(xml, /Introducción/);
  assert.match(strFromU8(files["word/settings.xml"]), /updateFields/);
});
test("DOCX imports formatted text, Unicode, tables, comments, links and page layout locally", async () => {
  const flow: FlowDocument = {
    layout: {
      ...defaultLayout(),
      header: "Encabezado local",
      footer: "Pie local",
      orientation: "landscape",
    },
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { id: "heading", level: 1 },
          content: [{ type: "text", text: "Documento de prueba" }],
        },
        {
          type: "paragraph",
          attrs: { id: "body" },
          content: [
            {
              type: "text",
              text: "Investigación áéíóú ñ 👩🏽‍💻 ",
              marks: [{ type: "bold" }],
            },
            {
              type: "text",
              text: "sitio",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
            {
              type: "text",
              text: "comentario",
              marks: [
                {
                  type: "comment",
                  attrs: {
                    id: "c1",
                    author: "Prisma",
                    text: "Revisar esta idea",
                  },
                },
              ],
            },
          ],
        },
        {
          type: "table",
          attrs: { id: "table" },
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { colspan: 2, rowspan: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Una celda combinada" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };
  const bytes = await exportDocx(flow, "Prueba Prisma Writer");
  const imported = importDocx(bytes);
  assert.match(
    academicPlainText(imported.flow.content),
    /Investigación áéíóú ñ 👩🏽‍💻/,
  );
  assert.equal(imported.flow.layout.orientation, "landscape");
  assert.equal(imported.flow.layout.header, "Encabezado local");
  const table = imported.flow.content.content!.find((n) => n.type === "table")!;
  assert.equal(table.content![0].content![0].attrs!.colspan, 2);
  assert.ok(
    JSON.stringify(imported.flow.content).includes("https://example.com"),
  );
  assert.ok(
    JSON.stringify(imported.flow.content).includes("Revisar esta idea"),
  );
  await mkdir("qa", { recursive: true });
  await writeFile("qa/writer-roundtrip.docx", bytes);
});
test("DOCX roundtrip keeps one TOC heading and preserves a manual page start", async () => {
  const imported = importDocx(await exportDocx(writerExample(), "Ejemplo"));
  const nodes = imported.flow.content.content!;
  assert.equal(nodes.filter((n) => n.type === "generatedIndex").length, 1);
  assert.equal(
    nodes.filter(
      (n) =>
        n.type === "paragraph" &&
        academicPlainText(n).trim() === "Tabla de contenido",
    ).length,
    0,
  );
  assert.ok(nodes.some((n) => n.attrs?.breakBefore || n.type === "pageBreak"));
});
test("DOCX import rejects external entities", () => {
  const xml =
    '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY x SYSTEM "file:///secret">]><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>&x;</w:t></w:r></w:p></w:body></w:document>';
  assert.throws(
    () => importDocx(zipSync({ "word/document.xml": strToU8(xml) })),
    /XML no admitida/,
  );
});
