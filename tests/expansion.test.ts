import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  PDFDocument,
  PDFRawStream,
  PDFName,
  decodePDFRawStream,
} from "pdf-lib";
import { Schema } from "@tiptap/pm/model";
import { unzipSync, strFromU8 } from "fflate";
import { fontFamilies, setFontLoader } from "../src/fonts";
import {
  defaultLayout,
  buildFlowDocument,
  type FlowDocument,
  type RichNode,
} from "../src/flow";
import { nativeOperation, type Inspection } from "../src/native-core";
import { documentSections, changeSection } from "../src/sections";
import {
  importLocalFont,
  fontEmbeddingPolicy,
  validateLocalFonts,
  decodeFont,
} from "../src/local-fonts";
import { exportDocx, exportHtml, exportMarkdown } from "../src/document-export";
import {
  academicPresets,
  normalizeAcademicDocument,
  academicPlainText,
  type ReferenceRecord,
  applyAcademicStyle,
} from "../src/academic";
import { cslStyles } from "../src/csl-format";
import { replacementMatches } from "../src/find-replace";
import { newerVersion, validateRelease, releaseBase } from "../src/update-core";
import { emptyWorkspace } from "../src/pdf";
import { projectBytes, readProject } from "../src/projects";
setFontLoader(
  async (file) => new Uint8Array(await readFile("public/fonts/" + file)),
);
const paragraph = (id: string, text: string): RichNode => ({
  type: "paragraph",
  attrs: { id },
  content: [{ type: "text", text }],
});
const inspect = async (bytes: Uint8Array, index: number) =>
  (await nativeOperation({ action: "inspect", bytes, index })) as Inspection;
test("new font families and academic essentials are bundled with real files", async () => {
  assert.equal(fontFamilies.filter((f) => f.file || f.styles).length, 81);
  for (const key of [
    "Arimo",
    "Carlito",
    "PrismaSerif",
    "Gelasio",
    "LatinModernRoman",
    "STIXTwoText",
    "Inter",
    "Merriweather",
    "LibreBaskerville",
  ])
    assert(fontFamilies.some((f) => f.value === key));
});

test("full OpenType CFF fonts export their real container type and preserve Spanish text", async () => {
  const content = paragraph(
    "otf",
    "Investigación científica y tipografía: ÁÉÍÓÚ ñ",
  );
  content.attrs = { ...content.attrs, fontFamily: "LatinModernRoman" };
  const result = await buildFlowDocument(
    { layout: defaultLayout(), content: { type: "doc", content: [content] } },
    "OpenType",
  );
  const doc = await PDFDocument.load(result.bytes);
  let count = 0;
  for (const [, object] of doc.context.enumerateIndirectObjects())
    if (object instanceof PDFRawStream) {
      const subtype = object.dict.get(PDFName.of("Subtype"));
      if (subtype === PDFName.of("OpenType")) {
        assert.equal(
          new TextDecoder().decode(
            decodePDFRawStream(object).decode().slice(0, 4),
          ),
          "OTTO",
        );
        count++;
      }
      assert.notEqual(subtype, PDFName.of("CIDFontType0C"));
    }
  assert(count > 0);
  assert.match(
    (await inspect(result.bytes, 0)).objects
      .filter((o) => o.kind === "text")
      .map((o) => o.text)
      .join(" "),
    /Investigación científica y tipografía/,
  );
  await mkdir("qa", { recursive: true });
  await writeFile("qa/opentype-font.pdf", result.bytes);
});
test("sections export different orientation, margins, headers and numbering; later sections continue a restarted sequence", async () => {
  const initial = {
    ...defaultLayout(),
    header: "CAPITULO UNO",
    numbering: true,
    pageNumberPosition: "footer-right" as const,
  };
  const second = {
    ...initial,
    orientation: "landscape" as const,
    left: 30,
    header: "CAPITULO DOS",
    pageNumberStart: 8,
  };
  const content: RichNode = {
    type: "doc",
    content: [
      paragraph("a", "Primera sección"),
      {
        type: "sectionBreak",
        attrs: {
          id: "s2",
          kind: "nextPage",
          layout: second,
          linkToPrevious: false,
          restartNumbering: true,
        },
      },
      paragraph("b", "Segunda sección"),
      {
        type: "sectionBreak",
        attrs: {
          id: "s3",
          kind: "nextPage",
          layout: { ...second, header: "NO DEBE VERSE" },
          linkToPrevious: true,
          restartNumbering: false,
        },
      },
      paragraph("c", "Tercera sección"),
    ],
  };
  const result = await buildFlowDocument({ layout: initial, content });
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 3);
  assert(pdf.getPage(1).getWidth() > pdf.getPage(1).getHeight());
  assert.equal(result.pageMap.b, 2);
  assert.deepEqual(result.pageSections, ["", "s2", "s3"]);
  assert.equal(result.pageLayouts[1].left, 30);
  const two = await inspect(result.bytes, 1),
    three = await inspect(result.bytes, 2);
  const text = (i: Inspection) =>
    i.objects
      .filter((o) => o.kind === "text")
      .map((o) => o.text)
      .join(" ");
  assert.match(text(two), /CAPITULO DOS/);
  assert.match(text(two), /\b8\b/);
  assert.match(text(three), /CAPITULO DOS/);
  assert.doesNotMatch(text(three), /NO DEBE/);
  assert.match(text(three), /\b9\b/);
  await mkdir("qa", { recursive: true });
  await writeFile("qa/sections-proof.pdf", result.bytes);
  const sections = documentSections(content, initial);
  assert.equal(sections[2].layout.header, "CAPITULO DOS");
  const changed = changeSection(content, "s2", { title: "Anexos" });
  assert.equal(changed.content?.[1].attrs?.title, "Anexos");
  assert.equal(content.content?.[1].attrs?.title, undefined);
  assert.equal(
    (applyAcademicStyle(content, "apa").content?.[1].attrs?.layout as any)
      .orientation,
    "portrait",
  );
});
test("odd/even section starts insert the required blank page and continuous sections stay on the same page", async () => {
  for (const [kind, pages] of [
    ["oddPage", 3],
    ["evenPage", 2],
    ["continuous", 1],
  ] as const) {
    const r = await buildFlowDocument({
      layout: defaultLayout(),
      content: {
        type: "doc",
        content: [
          paragraph("a", "Antes del salto"),
          {
            type: "sectionBreak",
            attrs: {
              id: "s",
              kind,
              layout: { ...defaultLayout(), columns: 2 },
              linkToPrevious: true,
            },
          },
          paragraph("b", "Después del salto"),
        ],
      },
    });
    assert.equal((await PDFDocument.load(r.bytes)).getPageCount(), pages);
    assert.equal(r.pageMap.b, pages);
    if (kind === "continuous") {
      const info = await inspect(r.bytes, 0),
        before = info.objects.find(
          (o) => o.kind === "text" && o.text?.includes("Antes"),
        ),
        after = info.objects.find(
          (o) => o.kind === "text" && o.text?.includes("Después"),
        );
      assert(before && after && after.y > before.y);
    }
  }
});
test("personal font permissions, integrity, PDF embedding and portable project roundtrip are enforced", async () => {
  const data = new Uint8Array(
      await readFile("public/fonts/Carlito/Carlito-Regular.ttf"),
    ),
    font = await importLocalFont(data);
  await validateLocalFonts([font]);
  const flow: FlowDocument = {
    layout: defaultLayout(),
    content: {
      type: "doc",
      content: [
        {
          ...paragraph("p", "Tipografía propia, áéíóúñ"),
          attrs: { id: "p", fontFamily: font.value },
        },
      ],
    },
  };
  const exported = await buildFlowDocument({ ...flow, fonts: [font] });
  const workspace = {
    ...emptyWorkspace(),
    name: "Prueba",
    flow,
    fonts: [font],
  };
  const restored = await readProject(projectBytes(workspace));
  assert.equal(restored.fonts?.[0].hash, font.hash);
  assert(
    (await inspect(exported.bytes, 0)).objects.some((o) =>
      o.text?.includes("Tipografía propia"),
    ),
  );
  const tampered = { ...font, hash: "0".repeat(64) };
  await assert.rejects(() => validateLocalFonts([tampered]));
  const view = new DataView(data.buffer),
    count = view.getUint16(4);
  let offset = 0;
  for (let i = 0; i < count; i++) {
    let e = 12 + i * 16;
    if (view.getUint32(e) === 0x4f532f32) offset = view.getUint32(e + 8);
  }
  assert(offset);
  view.setUint16(offset + 8, 2);
  assert.throws(() => fontEmbeddingPolicy(data), /permisos/);
  view.setUint16(offset + 8, 4);
  assert.throws(() => fontEmbeddingPolicy(data), /permisos/);
  view.setUint16(offset + 8, 0x108);
  assert.equal(fontEmbeddingPolicy(data).subset, false);
  assert.equal(decodeFont(font.bytes).length, data.length);
});
test("CSL styles render distinct bibliography and document citations, with locators and stable numerical ordering", () => {
  const refs: ReferenceRecord[] = [
    {
      id: "b",
      type: "book",
      author: "Zeta, Ana",
      title: "Un libro científico",
      year: "2020",
      publisher: "Editorial Uno",
    },
    {
      id: "a",
      type: "web",
      author: "Alfa, Luis",
      title: "Una página académica",
      year: "2024",
      url: "https://example.org/recurso",
      site: "Sitio Ejemplo",
    },
  ];
  const content: RichNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "citation", attrs: { refId: "b", locator: "25" } },
          { type: "text", text: " y " },
          { type: "citation", attrs: { refId: "a" } },
        ],
      },
      { type: "generatedIndex", attrs: { id: "refs", kind: "references" } },
    ],
  };
  const outputs = new Set();
  for (const style of Object.keys(cslStyles) as (keyof typeof cslStyles)[]) {
    const n = normalizeAcademicDocument(content, refs, style),
      text = academicPlainText(n);
    assert.match(text, /Un libro científico/);
    assert.match(text, /Una página académica/);
    assert.match(text, /Zeta/);
    assert.doesNotMatch(text, /<\/?(?:div|span|i|em)\b[^>]*>/);
    outputs.add(text);
  }
  assert(outputs.size >= 9);
  const mla = normalizeAcademicDocument(content, refs, "mla");
  assert.match(String(mla.content?.[0].content?.[0].attrs?.label), /25/);
  const numbered = normalizeAcademicDocument(content, refs, "vancouver");
  const labels = numbered.content?.[0].content
    ?.filter((n) => n.type === "citation")
    .map((n) => String(n.attrs?.label));
  assert.match(labels?.[0] ?? "", /1/);
  assert.match(labels?.[1] ?? "", /2/);
  assert.equal(Object.keys(academicPresets).length, 15);
});
test("DOCX is an editable package with sections, tables, comments, links and original font bytes; HTML and Markdown remain local", async () => {
  const png =
    "data:image/png;base64," +
    (await readFile("public/icons/prisma-192.png")).toString("base64");
  const flow: FlowDocument = {
    layout: { ...defaultLayout(), header: "Encabezado local" },
    content: {
      type: "doc",
      content: [
        {
          ...paragraph("p", "Título con áéíóú ñ"),
          attrs: { id: "p", fontFamily: "Arimo" },
          content: [
            {
              type: "text",
              text: "Texto comentado",
              marks: [
                { type: "bold" },
                { type: "link", attrs: { href: "https://example.org" } },
                {
                  type: "comment",
                  attrs: {
                    id: "c",
                    text: "Revisar esta parte",
                    author: "Autora",
                  },
                },
              ],
            },
          ],
        },
        {
          type: "table",
          attrs: { id: "t" },
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: { colspan: 2, rowspan: 1 },
                  content: [paragraph("cell", "Celda editable")],
                },
              ],
            },
          ],
        },
        { type: "image", attrs: { id: "i", src: png, width: 120 } },
        {
          type: "sectionBreak",
          attrs: {
            id: "s",
            kind: "nextPage",
            layout: { ...defaultLayout(), orientation: "landscape" },
            linkToPrevious: true,
          },
        },
        paragraph("last", "Sección horizontal"),
      ],
    },
  };
  const bytes = await exportDocx(flow, "Prueba DOCX"),
    files = unzipSync(bytes),
    xml = strFromU8(files["word/document.xml"]);
  assert.match(xml, /Texto comentado/);
  assert.match(xml, /<w:tbl>/);
  assert.match(xml, /landscape/);
  assert.match(xml, /gridSpan/);
  assert(files["word/comments.xml"]);
  assert.match(strFromU8(files["word/comments.xml"]), /Revisar esta parte/);
  assert(Object.keys(files).some((f) => f.startsWith("word/media/")));
  assert(Object.keys(files).some((f) => f.endsWith(".odttf")));
  assert.match(strFromU8(files["word/fontTable.xml"]), /embedBold/);
  assert.match(
    strFromU8(files["word/_rels/document.xml.rels"]),
    /https:\/\/example.org/,
  );
  const html = new TextDecoder().decode(await exportHtml(flow, "Prueba HTML"));
  assert.match(html, /data:font\//);
  assert.match(html, /data:image\/png/);
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(html, /<script/);
  assert.match(
    new TextDecoder().decode(exportMarkdown(flow)),
    /Celda editable/,
  );
  await mkdir("qa", { recursive: true });
  await writeFile("qa/export-proof.docx", bytes);
  await writeFile("qa/export-proof.html", html);
});
test("replace matches cross formatting marks, respect case and whole words, and exclude generated indexes and citation atoms", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      generatedIndex: { group: "block", content: "paragraph*" },
      text: { group: "inline" },
      citation: { group: "inline", inline: true, atom: true },
    },
    marks: { bold: {} },
  });
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [
      schema.text("Hola "),
      schema.text("mundo", [schema.mark("bold")]),
      schema.text(" holamundo HOLA"),
      schema.node("citation"),
      schema.text("hola"),
    ]),
    schema.node("generatedIndex", null, [
      schema.node("paragraph", null, [schema.text("hola")]),
    ]),
  ]);
  assert.equal(replacementMatches(doc, "Hola mundo").length, 1);
  assert.equal(replacementMatches(doc, "hola", false, true).length, 3);
  assert.equal(replacementMatches(doc, "hola", true, true).length, 1);
  assert.equal(replacementMatches(doc, "HOLAho").length, 0);
});
test("update versions are ordered numerically and download links are restricted to the public project", () => {
  assert(newerVersion("5.10.0", "5.2.9"));
  assert(!newerVersion("5.0.0", "5.0.0"));
  assert(!newerVersion("5.0.0-beta", "4.0.0"));
  const r = {
    version: "5.0.0",
    releaseUrl: releaseBase + "tag/v5.0.0",
    androidUrl: releaseBase + "download/v5.0.0/Prisma-PDF-5.0.0-Android.apk",
    windowsUrl:
      releaseBase + "download/v5.0.0/Prisma-PDF-5.0.0-Windows-Setup.exe",
    features: ["Fuentes"],
  };
  assert.equal(validateRelease(r).version, "5.0.0");
  assert.throws(() =>
    validateRelease({ ...r, androidUrl: "https://example.org/app.apk" }),
  );
});
