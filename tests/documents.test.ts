import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { setFontLoader } from "../src/fonts";
import { buildFlowPdf, defaultLayout, type RichNode } from "../src/flow";
import {
  appendPdf,
  emptyWorkspace,
  buildPdf,
  fitPdfToLayout,
  uid,
} from "../src/pdf";
import { nativeOperation, type Inspection } from "../src/native-core";
import { projectBytes, readProject } from "../src/projects";
setFontLoader(
  async (file) => new Uint8Array(await readFile("public/fonts/" + file)),
);
test("merged table cells, links and image dimensions match the writing editor", async () => {
  const png = (await readFile("public/icons/prisma-192.png")).toString(
    "base64",
  );
  const flow = {
    layout: defaultLayout(),
    content: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { rowspan: 2, colspan: 1 },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Celda unida" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Arriba" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Abajo" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Prisma PDF",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://oscard0823.github.io/prisma-pdf/" },
                },
              ],
            },
          ],
        },
        {
          type: "image",
          attrs: {
            src: "data:image/png;base64," + png,
            width: 240,
            height: 240,
          },
        },
      ],
    } as RichNode,
  };
  const bytes = await buildFlowPdf(flow),
    doc = await PDFDocument.load(bytes),
    inspection = (await nativeOperation({
      action: "inspect",
      bytes,
      index: 0,
    })) as Inspection;
  assert.ok(doc.getPage(0).node.Annots()?.size());
  assert.ok(inspection.objects.find((o) => o.text === "Abajo")!.x > 300);
  const image = inspection.objects.find((o) => o.kind === "image")!;
  assert.ok(Math.abs(image.width - 180) < 0.1);
  assert.ok(Math.abs(image.height - 180) < 0.1);
  await mkdir("qa", { recursive: true });
  await writeFile("qa/rich-merged.pdf", bytes);
});
const paragraph = (text: string): RichNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
test("rich documents paginate, preserve Unicode, styles, tables and manual breaks", async () => {
  const content: RichNode = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Ideas con dirección" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Café, año, acción. ",
            marks: [{ type: "bold" }],
          },
          {
            type: "text",
            text: "Texto resaltado.",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  color: "#6554d8",
                  backgroundColor: "#ffdf64",
                  fontFamily: "PrismaSerif",
                  fontSize: "16pt",
                },
              },
              { type: "underline" },
            ],
          },
        ],
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [paragraph("Objetivo")] },
              { type: "tableHeader", content: [paragraph("Estado")] },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [paragraph("Crear una buena experiencia")],
              },
              { type: "tableCell", content: [paragraph("En marcha")] },
            ],
          },
        ],
      },
      { type: "pageBreak" },
      ...Array.from({ length: 45 }, (_, i) =>
        paragraph(
          `Párrafo ${i + 1}. Las ideas toman forma cuando escribimos con claridad. Este contenido continúa según los márgenes del documento y conserva sus acentos.`,
        ),
      ),
    ],
  };
  const bytes = await buildFlowPdf(
      {
        content,
        layout: {
          ...defaultLayout(),
          header: "PRISMA STUDIO",
          footer: "Documento local",
          numbering: true,
        },
      },
      "Ideas con dirección",
    ),
    doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() >= 3);
  assert.equal(doc.getTitle(), "Ideas con dirección");
  const inspected = (await nativeOperation({
      action: "inspect",
      bytes,
      index: 0,
    })) as Inspection,
    text = inspected.objects.map((o) => o.text).join(" ");
  assert.ok(text.includes("Ideas con dirección"));
  assert.ok(text.includes("Café, año, acción."));
  assert.ok(text.includes("Crear una buena experiencia"));
  assert.ok(text.includes("1 / " + doc.getPageCount()));
  assert.ok(
    inspected.objects
      .filter((o) => o.kind === "text" && o.y > 50 && o.y < 700)
      .every((o) => o.x >= 60),
  );
  await mkdir("qa", { recursive: true });
  await writeFile("qa/rich-document.pdf", bytes);
});
test("editable projects round trip source bytes and rich document; rejects external images and invalid geometry", async () => {
  const flow = {
    content: {
      type: "doc",
      content: [paragraph("Continuar después: café.")],
    } as RichNode,
    layout: defaultLayout(),
  };
  const w = {
    ...(await appendPdf(
      emptyWorkspace(),
      await buildFlowPdf(flow),
      "Mi documento.pdf",
    )),
    flow,
  };
  const restored = await readProject(projectBytes(w));
  assert.deepEqual(restored.sources[0].bytes, w.sources[0].bytes);
  assert.deepEqual(restored.flow, w.flow);
  assert.equal(
    (await PDFDocument.load(await buildPdf(restored))).getPageCount(),
    1,
  );
  const bad = {
    ...w,
    flow: {
      ...flow,
      content: {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://example.com/private-image.png" },
          },
        ],
      },
    },
  };
  await assert.rejects(() => readProject(projectBytes(bad)), /incluidas/);
  const invalid = { ...w, pages: [{ ...w.pages[0], index: 999 }] };
  await assert.rejects(() => readProject(projectBytes(invalid)), /página/);
});
test("PDF margin fitting preserves text for all rotations and text marks export rich formatting", async () => {
  const source = await PDFDocument.create(),
    font = await source.embedFont("Helvetica");
  source
    .addPage([400, 500])
    .drawText("Texto original", { x: 30, y: 420, font, size: 16 });
  let w = await appendPdf(
    emptyWorkspace(),
    await source.save(),
    "Márgenes.pdf",
  );
  w.pages[0].marks.push({
    id: uid(),
    type: "text",
    x: 30,
    y: 140,
    width: 300,
    height: 40,
    size: 14,
    color: "#20273a",
    font: "PrismaSans",
    viewRotation: 0,
    richText: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Palabras editadas: acción.",
              marks: [{ type: "bold" }, { type: "underline" }],
            },
          ],
        },
      ],
    },
  });
  for (const angle of [0, 90, 180, 270]) {
    w = { ...w, pages: [{ ...w.pages[0], rotation: angle }] };
    const fitted = await fitPdfToLayout(w, {
        ...defaultLayout(),
        format: "letter",
      }),
      bytes = await buildPdf(fitted),
      doc = await PDFDocument.load(bytes);
    assert.deepEqual(doc.getPage(0).getSize(), { width: 612, height: 792 });
    const text = (
      (await nativeOperation({
        action: "inspect",
        bytes,
        index: 0,
      })) as Inspection
    ).objects
      .map((o) => o.text)
      .join(" ");
    assert.ok(text.includes("Texto original"));
    assert.ok(text.includes("Palabras editadas"));
    await writeFile("qa/margins-" + angle + ".pdf", bytes);
  }
});
