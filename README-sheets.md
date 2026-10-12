# Prisma Sheets 0.6.0

La versión 0.2 incorpora la biblioteca compartida de 81 familias con búsqueda, favoritas, recientes y vista previa. Conserva los nombres de fuentes en XLSX y utiliza alternativas incluidas para nombres conocidos de Office. [Instalación y uso sin conexión](README-install.md).

Aplicación de hojas de cálculo de la familia Prisma. Funciona localmente en la web, Android y Windows, con importación/exportación XLSX y CSV. La versión 0.6 incorpora LET, nombres definidos, compatibilidad inicial con macros VBA de celdas desde módulos BAS y búsqueda rápida de fuentes.

## Funciones

- Cuadrícula con celdas, letras de columnas, números de filas, barra de fórmulas y pestañas de hojas.
- Edición con teclado, F2, selección con Shift, copiar/pegar bloques, deshacer/rehacer y búsqueda en la hoja.
- Motor HyperFormula: referencias entre hojas y funciones compatibles. Acepta nombres españoles como SUMA, SI y PROMEDIO; XLSX almacena nombres invariantes en inglés.
- Fuentes, negrita, cursiva, subrayado, colores, bordes, alineación, formatos numéricos y ancho de columnas.
- Exportación de la hoja o selección a tablas DOCX para Writer/Word y a PDF. Impresión mediante el mismo sistema local de Prisma PDF.
- Guardado automático en IndexedDB. El original importado se conserva para descargarlo intacto.
- Informe de compatibilidad: gráficos nativos, tablas dinámicas, conexiones, objetos incrustados y otras funciones no soportadas requieren revisar la copia exportada.

## Límites de esta versión

No sustituye todavía todo Excel. No incluye edición de gráficos nativos, tablas dinámicas, Power Query, edición visual de tablas estructuradas ni filtrado interactivo. Los filtros y paneles congelados que se configuran se guardan para Excel. Abre XLSM y conserva sus partes VBA para Excel mediante la exportación compatible; no interpreta XLS binario. El intérprete propio de módulos BAS cubre un subconjunto de VBA, sin formularios, eventos, COM ni funciones personalizadas. Consulta [Programar en Prisma](README-programming.md).

Se compararon 69 resultados encadenados con Excel 16.0, incluyendo el archivo exportado y reabierto en Excel. Todos coincidieron con tolerancia relativa 1e-8 o absoluta 1e-7. La misma macro de ocho cambios también se ejecutó en ambos programas con resultados iguales. Esta prueba sintética no es el archivo original de un chat ni una garantía para todas las funciones de Excel. INDIRECT cubre inicialmente direcciones A1 literales, no expresiones que construyen referencias dinámicas.

Límites: 40 MB por archivo, 150.000 celdas pobladas, 20.000 filas y 500 columnas por hoja, 600.000 posiciones en el área utilizada del libro. DOCX y PDF permiten hasta 12 columnas y 2.000 filas seleccionadas para mantener una salida legible. Las funciones especiales y las fórmulas matriciales necesitan comprobación en Excel.

## Desarrollo y licencias

`VITE_PRODUCT=sheets pnpm dev` ejecuta este producto. `pnpm build:products` compila las aplicaciones y reúne el sitio en `dist-site/sheets`.

[ExcelJS](https://github.com/exceljs/exceljs) maneja XLSX bajo licencia MIT. [HyperFormula](https://hyperformula.handsontable.com/docs/guide/licensing.html) usa GPLv3. Prisma se distribuye con su código fuente bajo AGPLv3, incluyendo los avisos de las dependencias. Los archivos de usuario nunca se suben a un servidor.
