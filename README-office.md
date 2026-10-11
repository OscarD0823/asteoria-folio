# Prisma y compatibilidad con Office

El desarrollo sigue este orden: Writer y PDF, Sheets, Slides, Data y Publisher.

Consulta la [revisión de proyectos de referencia](README-references.md) y la [guía de instalación, fuentes y diccionario local](README-install.md).

| Programa | Aplicación Prisma | Estado y formato de intercambio |
| --- | --- | --- |
| Word | Prisma Writer | Disponible. DOCX, PDF, HTML, TXT y Markdown. |
| Excel | Prisma Sheets | Versión 0.3. XLSX, CSV, tablas DOCX y PDF. |
| PowerPoint | Prisma Slides | Primera versión 0.1: PPTX editable y PDF rasterizado. |
| Access | Prisma Data | Primera versión 0.1: SQLite, tablas, relaciones y consultas; importación CSV/XLSX, exportación CSV/JSON/XLSX. ACCDB/MDB y formularios de Access pendientes. |
| Publisher | Prisma Publisher | Primera versión 0.1: páginas A4, plantillas y objetos. PPTX editable y PDF rasterizado; PUB pendiente. |
| OneNote | Sin módulo todavía | Fuera del siguiente bloque de desarrollo. |
| Outlook | Sin módulo todavía | Fuera del siguiente bloque de desarrollo. |

Los formatos Office Open XML permiten intercambiar documentos, hojas y presentaciones. La compatibilidad exige verificar cada función: abrir un archivo no demuestra que se preserven todas sus características. Se utilizan las [especificaciones de Microsoft](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/) como referencia.

## Word

La importación detecta las normas declaradas en nombres de estilos y metadatos de Prisma. Se reconocen 14 opciones académicas. No se deduce una norma solamente por compartir tipografía, interlineado o márgenes.

El informe en Revisar → Compatibilidad con Office enumera estilos detectados, tablas, imágenes, títulos, apéndices, índices, secciones y fuentes sustituidas. Los títulos usan campos SEQ al exportar. Los índices de contenidos, tablas y figuras usan campos TOC que Word puede actualizar con F9.

Las bibliografías que Word almacena como texto se conservan como texto. Las macros, seguimiento de cambios, objetos OLE y ciertas disposiciones complejas no equivalen todavía a Word. Las fuentes locales alternativas pueden cambiar los saltos de página; el usuario puede importar una copia autorizada de la fuente exigida.

## Pruebas

Los originales de prueba se crean y guardan en el dispositivo del usuario. Se contrastan con Office instalado, además de pruebas de importación/exportación y comprobación visual. No se publican documentos personales en el repositorio.

La suite comparte identidad y funciones de guardado/exportación. Cada aplicación tiene su almacenamiento local, identificador y actualizaciones independientes.

La preservación de partes originales DOCX/PPTX y los motores opcionales se explican en [README-integrations.md](README-integrations.md). No se ha alcanzado equivalencia completa con Office.
