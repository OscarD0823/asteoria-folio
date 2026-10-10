# Prisma Writer

Procesador de documentos para escribir, revisar y presentar trabajos desde la web, Android y Windows. Comparte el motor local con Prisma PDF y tiene identidad de aplicación y biblioteca independientes.

- Web: https://oscard0823.github.io/prisma-pdf/writer/
- Archivos: abrir DOCX, TXT, PDF y proyectos `.prisma`; exportar DOCX, PDF, HTML, Markdown, TXT y PNG.
- Escritura: cinta de herramientas, estilos de párrafo, tablas, imágenes, ecuaciones, citas, índices, comentarios, reglas, secciones, encabezados y pies.
- Revisión: diccionario de español Hunspell/Typo.js ejecutado en un worker local; sugerencias, omisiones, diccionario personal y subrayado. No incluye un motor completo de gramática.
- Caracteres: inventario Unicode 18, códigos, frecuencias, invisibles, marcas combinantes y cobertura de la fuente elegida. Las marcas de formato no se exportan.
- Páginas: la escritura muestra hojas y separaciones automáticas con un único editor, selección y deshacer compartidos. La vista PDF muestra la composición final para imprimir. Las métricas del navegador pueden diferir de las del PDF; las secciones con cambios de orientación y los objetos de gran tamaño deben revisarse allí.
- DOCX: importa texto, estilos, títulos, listas básicas, tablas, imágenes PNG/JPEG, vínculos, comentarios y secciones. Usa alternativas locales si una fuente no está disponible. No reproduce todos los objetos avanzados, notas al pie o el historial de cambios de Microsoft Word; muestra un aviso cuando detecta estas características.
- Índice DOCX: tabla de contenido con campo TOC y entradas visibles; Word puede actualizar sus números de página al abrirlo. Los otros índices se exportan con el contenido calculado.

## Privacidad

Los documentos, las palabras revisadas, los proyectos y las fuentes personales permanecen en el dispositivo. Solo se solicitan recursos estáticos de la aplicación y datos públicos de actualización. No se envía el documento al consultar actualizaciones. Writer usa `prisma-writer-local-v1`; Prisma PDF conserva `prisma-pdf-local-v2`. El archivo `.prisma` permite trasladar un proyecto entre ambos programas o dispositivos.

## Desarrollo

`pnpm dev` abre Prisma PDF. En PowerShell, `$env:VITE_PRODUCT='writer'; pnpm dev` abre Writer. `pnpm build:products` genera `dist` (PDF), `dist-writer` (Writer) y `dist-site` (ambas webs). Publicar `dist-site` en GitHub Pages. El perfil Writer usa la versión 1.0.0; PDF usa la versión del paquete.

Referencias de diseño: [tablas de contenido](https://support.microsoft.com/es-es/word/format-or-customize-a-table-of-contents-in-word), [revisión ortográfica](https://support.microsoft.com/es-es/word/how-to-check-grammar-in-word) y [espacios entre páginas](https://support.microsoft.com/es-es/word/word-options-display) de Microsoft. La interfaz utiliza identidad propia de Prisma.

Licencias: aplicación AGPL-3.0-or-later; Typo.js BSD-3-Clause; diccionario español GPL/LGPL/MPL (licencia íntegra en `public/spelling/LICENSE.txt`); datos Unicode Unicode License V3 (en `public/unicode/LICENSE.txt`). Los datos y las fuentes conservan sus avisos originales.
