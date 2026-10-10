import { defaultLayout, type FlowDocument, type RichNode } from "./flow";
import { normalizeAcademicDocument } from "./academic";

export function writerExample(): FlowDocument {
  const text = (value: string) => [{ type: "text", text: value }];
  const paragraph = (value: string): RichNode => ({
    type: "paragraph",
    attrs: { fontFamily: "Carlito", fontSize: 12 },
    content: text(value),
  });
  const heading = (value: string, level: number): RichNode => ({
    type: "heading",
    attrs: { level, fontFamily: "Carlito" },
    content: text(value),
  });
  const content: RichNode = {
    type: "doc",
    content: [
      {
        ...paragraph("Un espacio para tus ideas"),
        attrs: {
          paragraphStyle: "title",
          fontFamily: "Carlito",
          fontSize: 28,
          spaceAfter: 12,
        },
      },
      paragraph(
        "Escribe, investiga y comparte. Este documento es tuyo: selecciona cualquier frase para cambiarla y prueba las herramientas de Inicio, Insertar, Diseño y Referencias.",
      ),
      {
        type: "generatedIndex",
        attrs: {
          kind: "contents",
          levels: 3,
          leader: "dots",
          pageNumbers: true,
        },
      },
      heading("1. Una forma familiar de escribir", 1),
      paragraph(
        "Las hojas se conectan en un solo editor. Puedes seleccionar texto entre páginas, copiarlo, pegarlo y deshacer los cambios. En Revisar encontrarás el corrector de español y el inspector de caracteres.",
      ),
      heading("1.1. Dale forma a tu documento", 2),
      paragraph(
        "Explora la biblioteca de fuentes, guarda tus favoritas y aplica estilos de título. Los índices se construyen a partir de los títulos del documento.",
      ),
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: ["Herramienta", "Para qué sirve"].map((v) => ({
              type: "tableHeader",
              content: [paragraph(v)],
            })),
          },
          ...[
            ["Estilos", "Mantener títulos y párrafos consistentes"],
            [
              "Ortografía",
              "Revisar palabras sin enviar el texto a un servidor",
            ],
            ["Copia editable", "Continuar el proyecto en otro dispositivo"],
          ].map((row) => ({
            type: "tableRow",
            content: row.map((v) => ({
              type: "tableCell",
              content: [paragraph(v)],
            })),
          })),
        ],
      },
      { type: "pageBreak" },
      heading("2. Guarda y comparte", 1),
      paragraph(
        "Tu biblioteca permanece en este dispositivo. Descarga una copia .prisma para conservar todo el proyecto; exporta a DOCX para seguir trabajando en Word o a PDF para presentar el diseño final.",
      ),
      paragraph(
        "Abre un archivo DOCX desde el inicio para continuar un documento existente. Revisa los objetos avanzados y el diseño final después de importarlo.",
      ),
    ],
  };
  return {
    layout: {
      ...defaultLayout(),
      header: "PRISMA WRITER · Documento de ejemplo",
      numbering: true,
      pageNumberPosition: "footer-center",
    },
    content: normalizeAcademicDocument(content, [], "free"),
  };
}
