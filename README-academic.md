# Formato académico local

`src/academic.ts` y el motor local citeproc-js implementan formatos comunes de citas, metadatos editables, numeración e índices. El editor no consulta la web, no carga documentos y no requiere servicios de bibliografía. Los metadatos permanecen dentro del proyecto local. Las fuentes oficiales se consultaron durante el desarrollo, el 9 y 10 de octubre de 2026.

## Formatos y alcance

- **APA 7, trabajo estudiantil:** base Carta con márgenes de 25,4 mm, fuente serif de 12 pt, doble espacio y sangría inicial de 36 pt. La familia incluida PrismaSerif es una alternativa libre; una institución puede exigir otra fuente. Los encabezados tienen alineación y énfasis por nivel. Los niveles 4–5 requieren revisión editorial si se desean encabezados corridos en el mismo párrafo.
- **IEEE, conferencia:** base orientativa Carta, serif de 10 pt, interlineado sencillo y dos columnas. Las citas usan números según la primera aparición; las tablas llevan números romanos. Los requisitos de la conferencia o revista prevalecen sobre esta base.
- **ISO 690:** selección de referencias y citas numéricas. Se conservan el papel, los márgenes y las fuentes personales. La norma trata las referencias de los recursos; no se presenta como una regla universal para el diseño de una tesis.
- **Libre:** conserva el diseño. Las referencias usan una presentación sencilla de autor y fecha.

La versión 5.0 añade los siguientes estilos. «Bibliografía» conserva el papel y diseño actuales; «Presentación» también aplica una base de márgenes, fuente y espaciado al documento completo y sus secciones.

| Opción             | Alcance y variante                                                                                                                               | Fuente de consulta                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| MLA 9              | Presentación; citas autor–página. El apellido del encabezado se completa manualmente.                                                            | [MLA Style Center](https://style.mla.org/mla-format/)                                                                                          |
| Chicago / Turabian | Presentación estudiantil; variante autor–fecha. No implementa el sistema de notas al pie.                                                        | [University of Chicago](https://www.chicagomanualofstyle.org/turabian/Student-Tip-Sheets.html)                                                 |
| Harvard            | Bibliografía autor–año, Cite Them Right. Hay variantes institucionales.                                                                          | [Open University](https://university.open.ac.uk/library/library/referencing-and-plagiarism/quick-guide-to-harvard-referencing-cite-them-right) |
| Vancouver          | Bibliografía numérica en orden de cita; variante Taylor & Francis/NLM.                                                                           | [ICMJE](https://icmje.org/recommendations/browse/manuscript-preparation/preparing-for-submission.html)                                         |
| ACS                | Bibliografía numérica de química.                                                                                                                | [ACS Guide](https://pubs.acs.org/doi/book/10.1021/acsguide)                                                                                    |
| ABNT               | Presentación A4 de una cara: texto 12 pt, espacio 1,5, márgenes superior/izquierdo 30 mm e inferior/derecho 20 mm; variante CSL ABNT para citas. | [NBR 14724:2024 alojada por UFPB](https://www.ccs.ufpb.br/coordfarm/wp-content/uploads/sites/21/sites/454/2026/03/ABNT_NBR_14724_2024-1.pdf)   |
| ACM                | Bibliografía de computación; conserva el diseño, pues manuscrito y publicación tienen procesos diferentes.                                       | [ACM TAPS](https://www.acm.org/publications/taps/word-template-workflow)                                                                       |
| AMA                | Bibliografía numérica médica.                                                                                                                    | [AMA Manual of Style](https://www.amamanualofstyle.com/)                                                                                       |
| CSE                | Bibliografía nombre–año, variante Taylor & Francis.                                                                                              | [Council of Science Editors](https://www.councilscienceeditors.org/scientific-style-and-format)                                                |
| Nature             | Bibliografía numérica Nature.                                                                                                                    | [Guía de Nature](https://www.nature.com/nature/for-authors/formatting-guide)                                                                   |
| Science            | Bibliografía numérica Science.                                                                                                                   | [Instrucciones de Science](https://www.science.org/content/page/instructions-preparing-initial-manuscript)                                     |

No existe un catálogo universal de todos los formatos de entrega: revistas, universidades y convocatorias publican requisitos propios. **ICONTEC NTC 1486** también se utiliza para trabajos académicos en Colombia ([catálogo oficial](https://tienda.icontec.org/product/documentacion-presentacion-de-trabajos-academicos/)). Su texto completo no estuvo disponible para validar un preajuste; se configura con Libre y la guía institucional. No se etiqueta un formato aproximado como cumplimiento certificado. Portada, resúmenes, listas preliminares, paginación especial y estructura del trabajo se completan según la institución.

## Tipografías para entregas

La [guía oficial de fuentes APA, revisada en febrero de 2026](https://apastyle.apa.org/style-grammar-guidelines/paper-format/font), admite varias fuentes legibles y menciona Aptos 12, Calibri 11, Arial 11, Lucida Sans Unicode 10, Times New Roman 12, Georgia 11 y Computer Modern 10. El selector académico ofrece Arimo, Carlito, Liberation Serif, Gelasio y Latin Modern Roman como alternativas libres, con el tamaño correspondiente. Las alternativas mantienen su nombre real y no garantizan aceptación si la institución exige la fuente original exacta.

El catálogo incluye 81 familias: también Inter, IBM Plex, STIX Two Text, EB Garamond, Gentium Plus, Merriweather, Libre Baskerville y fuentes Noto para varios alfabetos. Puedes importar TTF/OTF estáticas con permisos compatibles y conservarlas en `.prisma`, PDF, DOCX y HTML. Aptos y Lucida Sans Unicode se importan desde una copia autorizada; no se distribuyen sus archivos comerciales. Véase [Microsoft: licencias de fuentes](https://learn.microsoft.com/en-us/typography/fonts/font-faq).

## Motor y procedencia de estilos

Los once estilos nuevos usan citeproc-js 2.4.63, archivos CSL y localizaciones distribuidos con la aplicación. No se descargan durante la edición. `src/csl/SOURCES.json` identifica cada archivo, revisión del repositorio, URL y SHA-256. Los originales proceden de [Citation Style Language](https://github.com/citation-style-language/styles) y conservan sus autores y licencia CC BY-SA 3.0. `src/csl-data.ts` contiene los mismos textos para el navegador y las pruebas. Las variantes Vancouver y CSE se identifican expresamente, sin atribuirles un formato universal.

Se formatean páginas web, libros y artículos habituales; otros tipos conservan sus elementos bibliográficos, pero no cubren todas las variantes editoriales. Deben revisarse los nombres, la fecha, la capitalización del título y los requisitos de entrega. Los formatos se basan en las guías públicas; no sustituyen la revisión de la norma completa o del editor.

## Datos, contadores y navegación

`ReferenceRecord` conserva `id`, `type`, `author`, `title`, `year` y elementos opcionales como URL, sitio, editorial, DOI, fecha de consulta, revista, volumen, número, páginas, edición e idioma. Introducir nombres personales como `Apellido, Nombre` o `Apellido, Iniciales` y separar autores con punto y coma. Se acepta el nombre completo de una entidad. `shortAuthor` permite aclarar el nombre usado en una cita APA. Cada cita puede llevar un localizador de página; cambiar el estilo actualiza sus etiquetas y las referencias. El idioma del título evita aplicar capitalización inglesa a títulos en español.

`referenceFromUrl("google.com")` obtiene exclusivamente la dirección y el dominio. Deja vacíos autor, título y fecha. No presupone que el dominio sea autor ni inventa una fecha o un título. `missingReferenceFields()` permite solicitar esos datos. El formato muestra explícitamente los datos ausentes; por ejemplo, `s. f.` y `[Página web]`.

`applyAcademicStyle(content, style)` aplica el formato de forma explícita. `normalizeAcademicDocument(content, references, style)` es puro y estable: asigna IDs solo cuando faltan o se duplican; actualiza citas, títulos numerados e índices sin reformatear el texto en cada pulsación. Los mismos autores con igual año reciben sufijos a/b en APA. Las citas inexistentes muestran una advertencia dentro del texto.

Se detectan tablas, imágenes, nodos de apéndice y títulos que empiecen con «Apéndice». El contador sigue el orden de los objetos. En APA un apéndice único lleva «Apéndice»; varios llevan A/B. Sus tablas y figuras llevan A1/B1. `captionBlocks()` separa el número/título previo del objeto y la nota posterior. La nota y el título permanecen editables.

`collectDocumentEntries()` devuelve contenido, figuras, tablas y apéndices. `collectCitationOccurrences()` devuelve ID, ruta, bloque y contexto de cada uso, con filtro por referencia. Las citas se enlazan mediante `referenceAnchor`; los párrafos bibliográficos tienen ID `reference-{id}`. Los índices se crean solo cuando existe un nodo `generatedIndex`; no se agregan secciones no solicitadas. Los números de página se incorporan desde los atributos calculados por el motor de paginación; no se estiman.

Las sangrías y los espacios antes/después están en **puntos**. Márgenes y separación de columnas están en **milímetros**. `fontSize` en atributos de párrafo es un número de puntos; en marcas `textStyle` es una cadena como `12pt`. El editor debe conservar estos atributos al guardar y renderizar el esquema.

## Fuentes primarias consultadas

Consultadas el 9 de octubre de 2026:

- [APA: formato del trabajo](https://apastyle.apa.org/style-grammar-guidelines/paper-format), [fuentes](https://apastyle.apa.org/style-grammar-guidelines/paper-format/font), [márgenes](https://apastyle.apa.org/style-grammar-guidelines/paper-format/margins), [interlineado](https://apastyle.apa.org/style-grammar-guidelines/paper-format/line-spacing), [alineación y sangrías](https://apastyle.apa.org/style-grammar-guidelines/paper-format/paragraph-format), [encabezados](https://apastyle.apa.org/style-grammar-guidelines/paper-format/headings), [número de página](https://apastyle.apa.org/style-grammar-guidelines/paper-format/page-header).
- [APA: tablas](https://apastyle.apa.org/style-grammar-guidelines/tables-figures/tables), [figuras](https://apastyle.apa.org/style-grammar-guidelines/tables-figures/figures), [apéndices](https://apastyle.apa.org/style-grammar-guidelines/paper-format/appendices), [información bibliográfica ausente](https://apastyle.apa.org/style-grammar-guidelines/references/missing-information), [referencias de páginas web](https://apastyle.apa.org/style-grammar-guidelines/references/examples/webpage-website-references).
- [IEEE: guía oficial de referencias](https://journals.ieeeauthorcenter.ieee.org/wp-content/uploads/sites/7/IEEE_Reference_Guide.pdf), [manual editorial oficial](https://journals.ieeeauthorcenter.ieee.org/wp-content/uploads/sites/7/IEEE-Editorial-Style-Manual-for-Authors.pdf), [plantilla oficial de conferencia publicada en IEEE](https://ewh.ieee.org/soc/ras/conf/technicallycosponsored/icar/icar2017/www.ee.cuhk.edu.hk/_qhmeng/icar2017/assets/ieee_conference_paper_template.pdf). Las plantillas varían entre eventos; el preajuste usa la base de esta última.
- [ISO: catálogo oficial de ISO 690:2021](https://www.iso.org/standard/72642.html). No se reproduce el texto de la norma de pago ni se afirma certificación.

## Verificación

`pnpm exec tsx --test tests/academic.test.ts` comprueba que reordenar objetos y citas cambia la numeración, que APA/IEEE se pueden alternar, que no se inventan metadatos web, que los IDs copiados se corrigen, que la normalización se estabiliza y que los apéndices conservan su numeración.

`tests/expansion.test.ts` verifica los once estilos CSL, localizadores, numeración por primera cita, secciones con geometría distinta, fuentes personales y exportaciones DOCX/HTML. Las pruebas no sustituyen la revisión editorial de un trabajo concreto.
