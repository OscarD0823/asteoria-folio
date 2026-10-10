import type { AcademicPreset } from "./academic";
import type { CslStyle } from "./csl-format";
const studentLayout = {
  format: "letter",
  orientation: "portrait",
  top: 25.4,
  bottom: 25.4,
  left: 25.4,
  right: 25.4,
  header: "",
  footer: "",
  numbering: true,
  columns: 1,
  columnGap: 0,
} as const;
export const extraAcademicPresets: Record<CslStyle, AcademicPreset> = {
  mla: {
    label: "MLA 9 · trabajo académico",
    description:
      "Base de presentación con doble espacio y márgenes de 2,54 cm. Citas autor–página; agrega el localizador de página al citar. Personaliza el encabezado con tu apellido.",
    fontFamily: "PrismaSerif",
    fontSize: 12,
    lineHeight: 2,
    firstLineIndent: 36,
    layout: { ...studentLayout },
    pageNumberPosition: "header-right",
    source: "https://style.mla.org/mla-format/",
  },
  chicago: {
    label: "Chicago · autor–fecha / Turabian",
    description:
      "Base estudiantil con doble espacio y bibliografía autor–fecha. Esta opción usa citas parentéticas; la modalidad de notas al pie requiere otra plantilla.",
    fontFamily: "PrismaSerif",
    fontSize: 12,
    lineHeight: 2,
    firstLineIndent: 36,
    layout: { ...studentLayout },
    pageNumberPosition: "header-right",
    source:
      "https://www.chicagomanualofstyle.org/turabian/Student-Tip-Sheets.html",
  },
  harvard: {
    label: "Harvard · Cite Them Right",
    description:
      "Citas autor–año y referencias según la variante Cite Them Right. Harvard tiene variantes institucionales; conserva la disposición que ya configuraste.",
    source:
      "https://university.open.ac.uk/library/library/referencing-and-plagiarism/quick-guide-to-harvard-referencing-cite-them-right",
  },
  vancouver: {
    label: "Vancouver · NLM",
    description:
      "Bibliografía biomédica numerada en orden de cita. Variante CSL Taylor & Francis/NLM. La revista define el papel, interlineado y abreviaturas de sus títulos.",
    source:
      "https://icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html",
  },
  acs: {
    label: "ACS · química",
    description:
      "Citas y referencias de American Chemical Society, variante numerada. La presentación depende de la revista o convocatoria.",
    source: "https://pubs.acs.org/doi/book/10.1021/acsguide",
  },
  abnt: {
    label: "ABNT · Brasil",
    description:
      "Base A4: márgenes superior/izquierdo de 3 cm, inferior/derecho de 2 cm, texto de 12 pt a espacio 1,5. Bibliografía y citas de la variante CSL ABNT; revisa las normas e instrucciones institucionales vigentes.",
    fontFamily: "PrismaSans",
    fontSize: 12,
    lineHeight: 1.5,
    firstLineIndent: 35.43,
    layout: {
      ...studentLayout,
      format: "a4",
      top: 30,
      left: 30,
      bottom: 20,
      right: 20,
    },
    pageNumberPosition: "header-right",
    source:
      "https://www.ccs.ufpb.br/coordfarm/wp-content/uploads/sites/21/sites/454/2026/03/ABNT_NBR_14724_2024-1.pdf",
  },
  acm: {
    label: "ACM · computación",
    description:
      "Citas y bibliografía ACM. Conserva el diseño del documento: el manuscrito y la versión publicada usan plantillas y procesos diferentes según ACM.",
    source: "https://www.acm.org/publications/taps/word-template-workflow",
  },
  ama: {
    label: "AMA · medicina",
    description:
      "Citas numéricas y bibliografía de American Medical Association. Verifica las instrucciones de la publicación para el formato del manuscrito.",
    source: "https://www.amamanualofstyle.com/",
  },
  cse: {
    label: "CSE · nombre–año",
    description:
      "Citas y bibliografía de Council of Science Editors, variante Taylor & Francis autor–año. Conserva los márgenes y tipografía del documento.",
    source: "https://www.councilscienceeditors.org/scientific-style-and-format",
  },
  nature: {
    label: "Nature · bibliografía",
    description:
      "Referencias numéricas con la variante CSL Nature. El formato editorial final depende de la revista concreta.",
    source: "https://www.nature.com/nature/for-authors/formatting-guide",
  },
  science: {
    label: "Science · bibliografía",
    description:
      "Referencias numéricas con la variante CSL Science. Conserva la disposición; revisa las instrucciones de la publicación.",
    source:
      "https://www.science.org/content/page/instructions-preparing-initial-manuscript",
  },
};
