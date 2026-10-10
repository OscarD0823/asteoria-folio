import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PDFDocument, StandardFonts, PDFName, rgb, degrees } from "pdf-lib";
import { setFontLoader } from "../src/fonts";
import {
  defaultLayout,
  buildFlowDocument,
  buildFlowPdf,
  type RichNode,
} from "../src/flow";
import { academicPresets, applyAcademicStyle } from "../src/academic";
import {
  nativeOperation,
  type Inspection,
  type TextPreparation,
} from "../src/native-core";
import { watermarkArtifacts, blankWithWatermarks } from "../src/watermarks";
import { textStatistics, correctWord } from "../src/document-tools";
import { academicPlainText } from "../src/academic";
import { insertBlankPage } from "../src/page-insertion";
import { projectBytes, readProject, validateLayout } from "../src/projects";
import {
  emptyWorkspace,
  appendPdf,
  buildPdf,
  fitPdfToLayout,
} from "../src/pdf";
setFontLoader(
  async (file) => new Uint8Array(await readFile("public/fonts/" + file)),
);
const inspect = async (bytes: Uint8Array, index = 0) =>
  (await nativeOperation({ action: "inspect", bytes, index })) as Inspection;
test("prepare every text line once, retaining images and watermarks across all pages", async () => {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica),
    image = await doc.embedPng(await readFile("public/icons/prisma-192.png"));
  for (let i = 0; i < 3; i++) {
    const p = doc.addPage([400, 500]);
    p.drawText("Linea primera " + i, { x: 20, y: 440, font, size: 12 });
    p.drawText("Linea segunda " + i, { x: 20, y: 426, font, size: 12 });
    p.drawText("BORRADOR", {
      x: 40,
      y: 260,
      font,
      size: 36,
      color: rgb(0.8, 0.8, 0.8),
    });
    p.drawImage(image, { x: 40, y: 100, width: 50, height: 50 });
  }
  const original = await doc.save(),
    result = (await nativeOperation({
      action: "editAll",
      bytes: original,
      index: 0,
    })) as TextPreparation;
  assert.equal(result.pages.length, 3);
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 3);
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(
      result.pages[i].objects.map((o) => o.text),
      ["Linea primera " + i, "Linea segunda " + i],
    );
    const after = await inspect(result.bytes, i);
    assert.ok(!after.objects.some((o) => o.text?.startsWith("Linea")));
    assert.ok(after.objects.some((o) => o.text === "BORRADOR"));
    assert.equal(after.objects.filter((o) => o.kind === "image").length, 1);
  }
});
test("APA export positions captions, notes and page numbers, links citations to bibliography and paginates indices", async () => {
  const ref = {
    id: "ref-demo",
    type: "web" as const,
    author: "Contreras-Mendoza, O.",
    title: "Trabajo de ejemplo",
    year: "2026",
    url: "https://example.org",
  };
  const png =
    "data:image/png;base64," +
    (await readFile("public/icons/prisma-192.png")).toString("base64");
  const content: RichNode = {
    type: "doc",
    content: [
      { type: "generatedIndex", attrs: { kind: "contents" } },
      {
        type: "heading",
        attrs: { id: "intro", level: 1 },
        content: [{ type: "text", text: "Introducción" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Una cita: " },
          { type: "citation", attrs: { id: "cite-demo", refId: ref.id } },
        ],
      },
      {
        type: "caption",
        attrs: {
          kind: "figure",
          targetId: "image-demo",
          title: "Figura de ejemplo",
          note: "Adaptado de Contreras-Mendoza (2026).",
        },
      },
      { type: "image", attrs: { id: "image-demo", src: png, width: 200 } },
      { type: "pageBreak" },
      { type: "generatedIndex", attrs: { kind: "references" } },
    ],
  };
  const result = await buildFlowDocument({
      content: applyAcademicStyle(content, "apa"),
      references: [ref],
      academicStyle: "apa",
      layout: {
        ...academicPresets.apa.layout!,
        pageNumberPosition: "header-right",
      },
    }),
    doc = await PDFDocument.load(result.bytes);
  const objects = (await inspect(result.bytes)).objects,
    text = objects.map((o) => o.text).join("\n");
  assert.match(text, /Introducción … 1/);
  assert.match(text, /Contreras-Mendoza, 2026/);
  assert.ok(result.pageMap["reference-ref-demo"] >= 2);
  const label = objects.find((o) => o.text === "Figura 1")!,
    image = objects.find((o) => o.kind === "image")!,
    note = objects.find((o) => o.text?.includes("Adaptado de"))!;
  assert.ok(label.y < image.y);
  assert.ok(note.y > image.y + image.height);
  const pageNumber = objects.find((o) => o.text === "1")!;
  assert.ok(pageNumber.y < 60);
  assert.ok(doc.catalog.get(PDFName.of("Names")));
  assert.ok(doc.getPage(0).node.Annots()?.size());
  await mkdir("qa", { recursive: true });
  await writeFile("qa/academic-apa.pdf", result.bytes);
});
test("columns use the right column before adding a page and honor column/page breaks", async () => {
  const content: RichNode = {
    type: "doc",
    content: Array.from({ length: 40 }, (_, i) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Párrafo " + i + " " + "Texto de muestra ".repeat(4),
        },
      ],
    })),
  };
  const bytes = await buildFlowPdf({
      content,
      layout: { ...defaultLayout(), columns: 2, columnGap: 7 },
    }),
    objects = (await inspect(bytes)).objects.filter((o) => o.kind === "text");
  assert.ok(
    objects.some((o) => o.x > 300),
    "second column contains text",
  );
  assert.ok(objects.some((o) => o.x < 200));
  await writeFile("qa/columns.pdf", bytes);
  const forced = await buildFlowPdf({
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "IZQUIERDA" }] },
        { type: "columnBreak" },
        { type: "paragraph", content: [{ type: "text", text: "DERECHA" }] },
        { type: "pageBreak" },
        { type: "paragraph", content: [{ type: "text", text: "OTRA PAGINA" }] },
      ],
    },
    layout: { ...defaultLayout(), columns: 2 },
  });
  assert.equal((await PDFDocument.load(forced)).getPageCount(), 2);
  assert.ok(
    (await inspect(forced)).objects.find((o) => o.text === "DERECHA")!.x > 300,
  );
});
test("blank pages copy explicit watermark artifacts without copying body text", async () => {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica),
    p = doc.addPage([400, 500]);
  const resources = doc.context.obj({
    Font: doc.context.obj({ F1: font.ref }),
  });
  p.node.set(PDFName.of("Resources"), resources);
  const body =
    "BT /F1 12 Tf 20 460 Td (BODY MUST NOT COPY) Tj ET\n/Artifact << /Subtype /Watermark /Type /Pagination >> BDC\nBT /F1 36 Tf .8 g 50 250 Td (CONFIDENCIAL) Tj ET\nEMC";
  p.node.set(
    PDFName.of("Contents"),
    doc.context.register(doc.context.flateStream(body)),
  );
  assert.ok(!watermarkArtifacts(body).includes("BODY"));
  const bytes = await blankWithWatermarks(await doc.save(), 0, defaultLayout()),
    texts = (await inspect(bytes)).objects.map((o) => o.text);
  assert.ok(texts.includes("CONFIDENCIAL"));
  assert.ok(!texts.includes("BODY MUST NOT COPY"));
  await writeFile("qa/watermark-blank.pdf", bytes);
});
test("statistics handle Spanish decimals, Unicode words and autocorrection without ambiguous replacements", () => {
  const stats = textStatistics("Símbolos αβ y café: 1.234,50 + 5,5 -2");
  assert.equal(stats.numbers, 3);
  assert.equal(stats.sum, 1238);
  assert.equal(correctWord("Tambien"), "También");
  assert.equal(correctWord("si"), "si");
  assert.ok(textStatistics("研究 trabajo").words >= 2);
  assert.match(
    academicPlainText({
      type: "caption",
      attrs: {
        label: "Tabla 1",
        title: "Título",
        note: "Adaptado de Contreras (2026).",
      },
    }),
    /Adaptado de Contreras/,
  );
  assert.equal(
    textStatistics(
      academicPlainText({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Método" }],
                  },
                ],
              },
              {
                type: "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Scrum" }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).words,
    2,
  );
});
test("APA bibliography starts on a new page after body text without a manual break", async () => {
  const result = await buildFlowDocument({
    academicStyle: "apa",
    layout: academicPresets.apa.layout!,
    references: [
      {
        id: "ref",
        author: "Autor",
        year: "2026",
        title: "Ejemplo",
        type: "web",
      },
    ],
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "CUERPO" }] },
        { type: "generatedIndex", attrs: { id: "refs", kind: "references" } },
      ],
    },
  });
  assert.equal(result.pageMap.refs, 2);
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 2);
});
test("blank page placement inserts one page above, below or at the end without duplicating an existing break", async () => {
  const content: RichNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { id: "p1", page: 1 },
        content: [{ type: "text", text: "PRIMERA" }],
      },
      { type: "pageBreak" },
      {
        type: "paragraph",
        attrs: { id: "p2", page: 2 },
        content: [{ type: "text", text: "SEGUNDA" }],
      },
    ],
  };
  for (const [placement, active, expected] of [
    ["above", 1, 2],
    ["below", 1, 1],
    ["above", 2, 1],
    ["end", 1, 1],
  ] as const) {
    const result = await buildFlowDocument({
        content: insertBlankPage(content, active, placement),
        layout: defaultLayout(),
      }),
      doc = await PDFDocument.load(result.bytes);
    assert.equal(doc.getPageCount(), 3);
    assert.equal(result.pageMap.p1, expected);
    assert.equal(result.pageMap.p2, placement === "end" ? 2 : 3);
  }
});
test("comments survive export as Unicode PDF annotations and rich projects preserve references and local media", async () => {
  const content: RichNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Texto comentado",
            marks: [
              {
                type: "comment",
                attrs: {
                  id: "comment1",
                  text: "Revisar la ecuación α y la cita.",
                  author: "Autor",
                },
              },
            ],
          },
        ],
      },
    ],
  };
  const result = await buildFlowDocument({ content, layout: defaultLayout() }),
    doc = await PDFDocument.load(result.bytes),
    annotations = doc.getPage(0).node.Annots()!;
  assert.equal(annotations.size(), 1);
  const annotation = doc.context.lookup(annotations.get(0)) as any;
  assert.equal(annotation.get(PDFName.of("Subtype")).toString(), "/Text");
  assert.match(
    annotation.get(PDFName.of("Contents")).decodeText(),
    /ecuación α/,
  );
  const workspace = {
    ...emptyWorkspace(),
    flow: {
      content,
      layout: defaultLayout(),
      academicStyle: "iso690" as const,
      references: [
        {
          id: "ref",
          type: "web" as const,
          title: "Prueba",
          author: "",
          year: "",
          url: "https://example.org",
        },
      ],
    },
  };
  const restored = await readProject(projectBytes(workspace));
  assert.deepEqual(restored.flow?.references, workspace.flow.references);
  assert.deepEqual(restored.flow?.content, content);
  assert.throws(
    () => validateLayout({ ...defaultLayout(), columns: 0 }),
    /columnas/,
  );
  assert.throws(
    () =>
      validateLayout({
        ...defaultLayout(),
        format: "custom",
        customWidth: 1,
        customHeight: 297,
      }),
    /papel/,
  );
});
test("imported PDFs export first/even headers, footers and numbering without baking duplicates when margins change", async () => {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  for (const angle of [0, 90, 180, 270]) {
    const page = doc.addPage([400, 500]);
    page.setRotation(degrees(angle));
    page.drawText("BODY", { x: 40, y: 300, font, size: 12 });
  }
  const base = await appendPdf(
    emptyWorkspace(),
    await doc.save(),
    "Headers.pdf",
  );
  const layout = {
    ...defaultLayout(),
    header: "ODD HEADER",
    footer: "FOOTER",
    differentFirst: true,
    headerFirst: "FIRST HEADER",
    footerFirst: "FIRST FOOT",
    oddEven: true,
    headerEven: "EVEN HEADER",
    numbering: true,
    pageNumberPosition: "header-right" as const,
    pageNumberStart: 5,
  };
  const workspace = { ...base, layout },
    bytes = await buildPdf(workspace);
  for (let i = 0; i < 4; i++) {
    const objects = (await inspect(bytes, i)).objects,
      body = objects.map((o) => o.text).join("\n");
    assert.match(body, /BODY/);
    assert.match(
      body,
      i === 0 ? /FIRST HEADER/ : i % 2 ? /EVEN HEADER/ : /ODD HEADER/,
    );
    assert.ok(objects.some((o) => o.text === String(i + 5)));
  }
  const fitted = await fitPdfToLayout(workspace, {
    ...layout,
    left: 25,
    right: 25,
  });
  fitted.layout = layout;
  const objects = (await inspect(await buildPdf(fitted))).objects;
  assert.equal(objects.filter((o) => o.text === "FIRST HEADER").length, 1);
});
