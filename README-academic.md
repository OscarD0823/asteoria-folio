# Formato académico local

`src/academic.ts` implementa formatos comunes de citas, metadatos editables, numeración e índices. No consulta la web, no carga documentos y no requiere servicios de bibliografía. Los metadatos permanecen dentro del proyecto local.

## Formatos y alcance

- **APA 7, trabajo estudiantil:** base Carta con márgenes de 25,4 mm, fuente serif de 12 pt, doble espacio y sangría inicial de 36 pt. La familia incluida PrismaSerif es una alternativa libre; una institución puede exigir otra fuente. Los encabezados tienen alineación y énfasis por nivel. Los niveles 4–5 requieren revisión editorial si se desean encabezados corridos en el mismo párrafo.
- **IEEE, conferencia:** base orientativa Carta, serif de 10 pt, interlineado sencillo y dos columnas. Las citas usan números según la primera aparición; las tablas llevan números romanos. Los requisitos de la conferencia o revista prevalecen sobre esta base.
- **ISO 690:** selección de referencias y citas numéricas. Se conservan el papel, los márgenes y las fuentes personales. La norma trata las referencias de los recursos; no se presenta como una regla universal para el diseño de una tesis.
- **Libre:** conserva el diseño. Las referencias usan una presentación sencilla de autor y fecha.

Se formatean páginas web, libros y artículos habituales; otros tipos conservan sus elementos bibliográficos, pero no cubren todas las variantes editoriales. Deben revisarse los nombres, la fecha, la capitalización del título y los requisitos de entrega. Los formatos se basan en las guías públicas; no sustituyen la revisión de la norma completa o del editor.

## Datos, contadores y navegación

`ReferenceRecord` conserva `id`, `type`, `author`, `title`, `year` y elementos opcionales como URL, sitio, editorial, DOI, fecha de consulta, revista, volumen, número, páginas y edición. Introducir nombres personales como `Apellido, Iniciales` y separar autores con punto y coma. Se acepta el nombre completo de una entidad. `shortAuthor` permite aclarar el nombre usado en una cita.

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
