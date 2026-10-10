import test from "node:test";
import assert from "node:assert/strict";
import type { RichNode } from "../src/flow";
import {
  academicPresets,
  applyAcademicStyle,
  captionBlocks,
  citationLabel,
  collectCitationOccurrences,
  collectDocumentEntries,
  formatReference,
  missingReferenceFields,
  normalizeAcademicDocument,
  referenceFromUrl,
  type ReferenceRecord,
} from "../src/academic";

const reference = (
  id: string,
  title: string,
  author = "Contreras-Mendoza, J.",
  year = "2026",
): ReferenceRecord => ({
  id,
  type: "book",
  author,
  title,
  year,
  publisher: "Editorial Ejemplo",
});
const text = (text: string): RichNode => ({ type: "text", text });
const citation = (refId: string): RichNode => ({
  type: "citation",
  attrs: { refId },
});
const paragraph = (...content: RichNode[]): RichNode => ({
  type: "paragraph",
  content,
});
const index = (kind: string): RichNode => ({
  type: "generatedIndex",
  attrs: { kind },
});
const captions = (node: RichNode): RichNode[] =>
  (node.content || []).filter((item) => item.type === "caption");

test("URL references preserve only known data and reject unsafe or invalid input", () => {
  const ref = referenceFromUrl("google.com");
  assert.equal(ref.url, "https://google.com/");
  assert.equal(ref.site, "google.com");
  assert.deepEqual([ref.author, ref.title, ref.year], ["", "", ""]);
  assert.deepEqual(missingReferenceFields(ref), ["autor", "título", "fecha"]);
  assert.equal(ref.id, referenceFromUrl("https://google.com/").id);
  const formatted = formatReference(ref, "apa");
  assert.match(formatted, /\[Página web\]\. \(s\. f\.\)/);
  assert.ok(formatted.includes("https://google.com/"));
  assert.ok(!formatted.includes("2026"));
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///C:/secret.pdf",
    "ftp://example.com",
    "https://user:password@example.com",
    "not a url",
    "https://",
  ])
    assert.throws(() => referenceFromUrl(url));
});

test("table, figure and appendix numbers follow reordered objects without replacing titles or notes", () => {
  const source: RichNode = {
    type: "doc",
    content: [
      {
        type: "table",
        attrs: {
          id: "table-a",
          title: "Relación entre DSR y Scrum",
          note: "Adaptado de Contreras-Mendoza (2026).",
        },
        content: [],
      },
      {
        type: "image",
        attrs: {
          id: "figure-a",
          alt: "Proceso DSR",
          src: "data:image/png;base64,fixture",
        },
      },
      {
        type: "table",
        attrs: { id: "table-b", title: "Resultados" },
        content: [],
      },
      { type: "appendix", attrs: { id: "appendix-a", title: "Instrumento" } },
      {
        type: "heading",
        attrs: { level: 1 },
        content: [text("Apéndice B: Encuesta")],
      },
      index("tables"),
      index("figures"),
      index("appendices"),
    ],
  };
  const normalized = normalizeAcademicDocument(source, [], "apa");
  assert.equal(
    source.content?.length,
    8,
    "pure normalization must not mutate input",
  );
  const a = captions(normalized).find(
    (caption) => caption.attrs?.targetId === "table-a",
  )!;
  assert.equal(a.attrs?.label, "Tabla 1");
  assert.equal(a.attrs?.title, "Relación entre DSR y Scrum");
  assert.equal(a.attrs?.note, "Adaptado de Contreras-Mendoza (2026).");
  assert.equal(captionBlocks(a, "apa").after[0].content?.[0].text, "Nota. ");
  assert.deepEqual(
    collectDocumentEntries(normalized).appendices.map((entry) => entry.label),
    ["Apéndice A · Instrumento", "Apéndice B · Encuesta"],
  );
  const children = normalized.content!;
  const withoutB = children.filter((node) => node.attrs?.id !== "table-b");
  const b = children.find((node) => node.attrs?.id === "table-b")!;
  const reordered = normalizeAcademicDocument(
    { type: "doc", content: [b, ...withoutB] },
    [],
    "apa",
  );
  assert.equal(
    captions(reordered).find((caption) => caption.attrs?.targetId === "table-a")
      ?.attrs?.label,
    "Tabla 2",
  );
  assert.deepEqual(
    collectDocumentEntries(reordered).tables.map((entry) => entry.targetId),
    ["table-b", "table-a"],
  );
  assert.deepEqual(
    normalizeAcademicDocument(normalized, [], "apa"),
    normalized,
    "normalization should settle after one pass",
  );
});

test("IEEE numbering follows first citation, APA switches to author/date and bibliographic order", () => {
  const refs = [
    reference("a", "Alfa"),
    reference("b", "Beta", "Zapata, M."),
    reference("c", "Gamma", "Álvarez, P."),
  ];
  const doc: RichNode = {
    type: "doc",
    content: [
      paragraph(
        text("Primero "),
        citation("b"),
        text(" y después "),
        citation("a"),
      ),
      paragraph(text("También "), citation("b")),
      index("references"),
    ],
  };
  const ieee = normalizeAcademicDocument(doc, refs, "ieee");
  assert.deepEqual(
    collectCitationOccurrences(ieee).map((item) => item.label),
    ["[1]", "[2]", "[1]"],
  );
  const bibliography = ieee.content!.find(
    (node) => node.type === "generatedIndex",
  )!;
  assert.deepEqual(
    (bibliography.attrs!.entries as { id: string }[]).map((entry) => entry.id),
    ["b", "a", "c"],
  );
  assert.equal(bibliography.content?.[0].attrs?.id, "reference-b");
  assert.equal(collectCitationOccurrences(ieee, "b").length, 2);
  assert.match(
    collectCitationOccurrences(ieee)[0].context,
    /Primero \[1\] y después \[2\]/,
  );
  assert.ok(collectCitationOccurrences(ieee)[0].blockId);
  const apa = normalizeAcademicDocument(ieee, refs, "apa");
  assert.deepEqual(
    collectCitationOccurrences(apa).map((item) => item.label),
    ["(Zapata, 2026)", "(Contreras-Mendoza, 2026)", "(Zapata, 2026)"],
  );
  const apaReferences = apa.content!.find(
    (node) => node.type === "generatedIndex",
  )!;
  assert.deepEqual(
    (apaReferences.attrs!.entries as { id: string }[]).map((entry) => entry.id),
    ["c", "a", "b"],
  );
  assert.equal(apaReferences.content?.[0].attrs?.hangingIndent, 36);
  const reordered: RichNode = {
    type: "doc",
    content: [
      paragraph(citation("a")),
      paragraph(citation("b")),
      index("references"),
    ],
  };
  assert.deepEqual(
    collectCitationOccurrences(
      normalizeAcademicDocument(reordered, refs, "ieee"),
    ).map((item) => item.label),
    ["[1]", "[2]"],
  );
});

test("same-author/year citations are disambiguated and missing records are visible", () => {
  const refs = [reference("b", "Beta"), reference("a", "Alfa")];
  const result = normalizeAcademicDocument(
    {
      type: "doc",
      content: [
        paragraph(citation("b"), citation("a"), citation("missing")),
        index("references"),
      ],
    },
    refs,
    "apa",
  );
  assert.deepEqual(
    collectCitationOccurrences(result).map((item) => item.label),
    [
      "(Contreras-Mendoza, 2026b)",
      "(Contreras-Mendoza, 2026a)",
      "[Referencia no encontrada]",
    ],
  );
  assert.match(
    (result.content?.[1].attrs?.entries as { label: string }[])[0].label,
    /2026a/,
  );
  assert.equal(
    citationLabel(
      { ...refs[0], author: "Mora, A.; Pérez, C.; Díaz, D." },
      "apa",
    ),
    "(Mora et al., 2026)",
  );
});

test("applying APA reformats all paragraphs/headings and ISO preserves custom layout", () => {
  const content: RichNode = {
    type: "doc",
    content: [
      paragraph(text("Cuerpo")),
      { type: "heading", attrs: { level: 1 }, content: [text("Método")] },
      { type: "heading", attrs: { level: 3 }, content: [text("Subsección")] },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [paragraph(text("Celda"))] },
            ],
          },
        ],
      },
    ],
  };
  const apa = applyAcademicStyle(content, "apa");
  assert.equal(academicPresets.apa.layout?.left, 25.4);
  assert.equal(apa.content?.[0].attrs?.firstLineIndent, 36);
  assert.equal(apa.content?.[0].attrs?.lineHeight, 2);
  assert.equal(apa.content?.[0].attrs?.textAlign, "left");
  assert.equal(apa.content?.[1].attrs?.textAlign, "center");
  assert.deepEqual(
    apa.content?.[2].content?.[0].marks?.map((mark) => mark.type),
    ["textStyle", "bold", "italic"],
  );
  assert.equal(
    apa.content?.[3].content?.[0].content?.[0].content?.[0].attrs
      ?.firstLineIndent,
    0,
  );
  assert.deepEqual(applyAcademicStyle(content, "iso690"), content);
  assert.equal(academicPresets.iso690.layout, undefined);
  assert.equal(academicPresets.ieee.layout?.columns, 2);
  assert.deepEqual(applyAcademicStyle(apa, "apa"), apa);
});

test("new paragraphs inherit the academic preset while existing manual formatting survives typing", () => {
  const first = normalizeAcademicDocument(
    {
      type: "doc",
      content: [
        paragraph(text("Nuevo cuerpo")),
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                { type: "tableCell", content: [paragraph(text("Celda"))] },
              ],
            },
          ],
        },
      ],
    },
    [],
    "apa",
  );
  assert.equal(first.content?.[0].attrs?.fontFamily, "PrismaSerif");
  assert.equal(first.content?.[0].attrs?.firstLineIndent, 36);
  assert.equal(first.content?.[0].attrs?.lineHeight, 2);
  const table = first.content?.find((n) => n.type === "table");
  const cell = table?.content?.[0].content?.[0].content?.[0];
  assert.equal(cell?.attrs?.firstLineIndent, 0);
  assert.equal(cell?.attrs?.lineHeight, 1);
  first.content![0].attrs!.fontSize = 14;
  first.content![0].attrs!.lineHeight = 1.5;
  const afterTyping = normalizeAcademicDocument(first, [], "apa");
  assert.equal(afterTyping.content?.[0].attrs?.fontSize, 14);
  assert.equal(afterTyping.content?.[0].attrs?.lineHeight, 1.5);
  const iso = {
    type: "doc",
    content: [paragraph(text("Formato institucional"))],
  };
  assert.equal(
    normalizeAcademicDocument(iso, [], "iso690").content?.[0].attrs?.fontFamily,
    undefined,
  );
});

test("duplicate pasted IDs become unique; generated index contents do not count as source", () => {
  const doc: RichNode = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { id: "same", level: 1 },
        content: [text("Primero")],
      },
      {
        type: "heading",
        attrs: { id: "same", level: 2 },
        content: [text("Segundo")],
      },
      {
        type: "generatedIndex",
        attrs: { kind: "contents" },
        content: [
          { type: "heading", content: [text("Copia antigua")] },
          paragraph(citation("missing")),
        ],
      },
      { type: "image", attrs: { id: "same" } },
    ],
  };
  const normalized = normalizeAcademicDocument(doc, [], "apa");
  const ids = normalized.content!.map((node) => node.attrs?.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(collectDocumentEntries(normalized).contents.length, 2);
  assert.equal(collectCitationOccurrences(normalized).length, 0);
  assert.deepEqual(
    normalizeAcademicDocument(normalized, [], "apa"),
    normalized,
  );
});

test("APA appendices start a page, single appendix has no letter and its figures have A prefixes", () => {
  const doc: RichNode = {
    type: "doc",
    content: [
      { type: "image", attrs: { id: "main", alt: "Figura del cuerpo" } },
      { type: "appendix", attrs: { title: "Material complementario" } },
      { type: "image", attrs: { id: "extra", alt: "Figura del apéndice" } },
    ],
  };
  const normalized = normalizeAcademicDocument(doc, [], "apa");
  assert.equal(
    collectDocumentEntries(normalized).appendices[0].label,
    "Apéndice · Material complementario",
  );
  assert.equal(
    normalized.content?.find((node) => node.type === "appendix")?.attrs
      ?.breakBefore,
    true,
  );
  assert.deepEqual(
    captions(normalized).map((node) => node.attrs?.label),
    ["Figura 1", "Figura A1"],
  );
  const ieee = normalizeAcademicDocument(normalized, [], "ieee");
  assert.deepEqual(
    captions(ieee).map((node) => node.attrs?.label),
    ["Fig. 1", "Fig. 2"],
  );
  assert.deepEqual(
    normalizeAcademicDocument(normalized, [], "apa"),
    normalized,
  );
});

test("pasted table/caption pairs preserve the copy's title and note while renumbering", () => {
  const caption: RichNode = {
    type: "caption",
    attrs: {
      id: "caption-original",
      targetId: "table-original",
      kind: "table",
      title: "Resultados",
      note: "Elaboración propia.",
    },
  };
  const table: RichNode = {
    type: "table",
    attrs: { id: "table-original" },
    content: [],
  };
  const normalized = normalizeAcademicDocument(
    {
      type: "doc",
      content: [
        caption,
        table,
        JSON.parse(JSON.stringify(caption)),
        JSON.parse(JSON.stringify(table)),
        index("tables"),
      ],
    },
    [],
    "apa",
  );
  const all = captions(normalized);
  assert.equal(all.length, 2);
  assert.notEqual(all[0].attrs?.targetId, all[1].attrs?.targetId);
  assert.deepEqual(
    all.map((node) => node.attrs?.label),
    ["Tabla 1", "Tabla 2"],
  );
  assert.equal(all[1].attrs?.title, "Resultados");
  assert.equal(all[1].attrs?.note, "Elaboración propia.");
  assert.deepEqual(
    normalizeAcademicDocument(normalized, [], "apa"),
    normalized,
  );
});
