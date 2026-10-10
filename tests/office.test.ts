import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "@xmldom/xmldom";
import { zipSync, strToU8, unzipSync, strFromU8 } from "fflate";
import { importDocx } from "../src/document-import";
import { declaredAcademicStyle } from "../src/office-compatibility";
import {
  academicPresets,
  collectDocumentEntries,
  academicPlainText,
  normalizeAcademicDocument,
} from "../src/academic";
import { defaultLayout } from "../src/flow";
import { exportDocx } from "../src/document-export";
import { readFile } from "node:fs/promises";
import { setFontLoader } from "../src/fonts";
Object.assign(globalThis, { DOMParser });
setFontLoader(
  async (file) => new Uint8Array(await readFile("public/fonts/" + file)),
);
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
function fixture(content: string, styles = "") {
  return zipSync({
    "word/document.xml": strToU8(
      `<w:document xmlns:w="${W}"><w:body>${content}<w:sectPr/></w:body></w:document>`,
    ),
    "word/styles.xml": strToU8(`<w:styles xmlns:w="${W}">${styles}</w:styles>`),
  });
}
test("DOCX detects all fourteen explicitly named academic styles and keeps a mixed document free", () => {
  const ids = Object.keys(academicPresets).filter((k) => k !== "free");
  const data = fixture(
    ids
      .map(
        (id) =>
          `<w:p><w:pPr><w:pStyle w:val="${id}Body"/></w:pPr><w:r><w:t>Texto ${id}</w:t></w:r></w:p>`,
      )
      .join(""),
    ids
      .map(
        (id) =>
          `<w:style w:type="paragraph" w:styleId="${id}Body"><w:name w:val="${id.toUpperCase()} Body"/></w:style>`,
      )
      .join(""),
  );
  const result = importDocx(data);
  assert.equal(result.flow.academicStyle, "free");
  assert.deepEqual(
    result.flow.importReport?.academicStyles.map((s) => s.style),
    ids,
  );
  assert.equal(
    result.flow.content.content?.filter((n) => n.attrs?.academicStyle === "apa")
      .length,
    1,
  );
  assert.match(result.warnings.join(" "), /varios estilos/);
  assert.equal(declaredAcademicStyle("Conscience"), undefined);
  assert.equal(declaredAcademicStyle("Normal"), undefined);
});
test("DOCX does not claim APA from shared formatting and recognizes inherited Word title styles", () => {
  const f = fixture(
    '<w:p><w:pPr><w:pStyle w:val="CoverTitle"/><w:spacing w:line="480"/></w:pPr><w:r><w:t>Prueba</w:t></w:r></w:p>',
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style><w:style w:type="paragraph" w:styleId="CoverTitle"><w:basedOn w:val="Title"/></w:style>',
  );
  const flow = importDocx(f).flow;
  assert.equal(flow.academicStyle, "free");
  assert.equal(flow.content.content?.[0].attrs?.paragraphStyle, "title");
  assert.equal(flow.importReport?.academicStyles.length, 0);
});
test("DOCX keeps page numbering dynamic without copying the cached footer number", () => {
  for (const field of [
    '<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>',
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>',
  ]) {
    const data = zipSync({
      "word/document.xml": strToU8(
        `<w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body><w:p><w:r><w:t>Texto</w:t></w:r></w:p><w:sectPr><w:footerReference w:type="default" r:id="rId1"/></w:sectPr></w:body></w:document>`,
      ),
      "word/_rels/document.xml.rels": strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="footer1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"/></Relationships>',
      ),
      "word/footer1.xml": strToU8(
        `<w:ftr xmlns:w="${W}"><w:p><w:r><w:t>Página</w:t></w:r>${field}</w:p></w:ftr>`,
      ),
    });
    const flow = importDocx(data).flow;
    assert.equal(flow.layout.footer, "Página");
    assert.equal(flow.layout.numbering, true);
    assert.equal(flow.layout.pageNumberPosition, "footer-right");
  }
});
test("DOCX preserves unequal table column widths when exported and imported", async () => {
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
              content: [120, 300].map((width) => ({
                type: "tableCell",
                attrs: { colwidth: [width] },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Dato" }],
                  },
                ],
              })),
            },
          ],
        },
      ],
    },
  };
  const exported = await exportDocx(flow, "Columnas");
  const cells = importDocx(exported).flow.content.content?.find(
    (n) => n.type === "table",
  )?.content?.[0].content;
  assert.deepEqual(
    cells?.map((c) => c.attrs?.colwidth),
    [[120], [300]],
  );
});
test("Word SEQ captions attach to tables and TOC caption switches keep the correct index kind", () => {
  const f = fixture(
    '<w:p><w:r><w:t>Lista de tablas</w:t></w:r></w:p><w:sdt><w:sdtContent><w:p><w:r><w:instrText> TOC \\h \\c "Tabla" </w:instrText></w:r></w:p></w:sdtContent></w:sdt><w:p><w:r><w:t>Tabla </w:t></w:r><w:fldSimple w:instr="SEQ Tabla"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p><w:p><w:r><w:t>Resultados de prueba</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Dato</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>Nota. Elaboración propia.</w:t></w:r></w:p>',
  );
  const flow = importDocx(f).flow,
    entries = collectDocumentEntries(flow.content);
  assert.equal(flow.content.content?.[0].attrs?.kind, "tables");
  assert.equal(entries.tables.length, 1);
  assert.equal(entries.tables[0].title, "Resultados de prueba");
  assert.equal(
    flow.content.content?.find((n) => n.type === "caption")?.attrs?.note,
    "Elaboración propia.",
  );
  assert.equal(
    flow.content.content?.filter(
      (n) =>
        n.type === "paragraph" && academicPlainText(n) === "Lista de tablas",
    ).length,
    0,
  );
});
test("DOCX exports Word SEQ fields and table/figure indices remain updatable through a roundtrip", async () => {
  const content = normalizeAcademicDocument(
    {
      type: "doc",
      content: [
        { type: "generatedIndex", attrs: { id: "idx", kind: "tables" } },
        {
          type: "caption",
          attrs: {
            id: "cap",
            kind: "table",
            targetId: "tbl",
            title: "Resultados de prueba",
            note: "Elaboración propia.",
          },
        },
        {
          type: "table",
          attrs: { id: "tbl" },
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Dato" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    [],
    "apa",
  );
  const data = await exportDocx(
    { layout: defaultLayout(), content, academicStyle: "apa" },
    "Prueba",
  );
  const xml = strFromU8(unzipSync(data)["word/document.xml"]);
  assert.match(xml, /SEQ Tabla/);
  assert.match(xml, /\\c[^<]*Tabla/);
  const imported = importDocx(data).flow;
  assert.equal(imported.academicStyle, "apa");
  assert.equal(imported.importReport?.tables, 1);
  assert.equal(imported.importReport?.captions, 1);
  assert.equal(
    imported.content.content?.find((n) => n.type === "generatedIndex")?.attrs
      ?.kind,
    "tables",
  );
  assert.equal(
    collectDocumentEntries(imported.content).tables[0].title,
    "Resultados de prueba",
  );
});
