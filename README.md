# Prisma PDF 6.2, Writer 1.2 y Sheets 0.2

Las tres webs pueden instalarse desde **Instalar app**. Consulta la [guía de instalación y uso sin conexión](README-install.md) y la [revisión de los 17 proyectos de referencia](README-references.md).

Editor de PDF y creador de documentos en español. Web, PWA, Android y Windows; todos procesan los documentos en el dispositivo.

- [Abrir editor](https://oscard0823.github.io/prisma-pdf/)
- [Abrir Prisma Writer](https://oscard0823.github.io/prisma-pdf/writer/) · [Guía y compatibilidad](README-writer.md)
- [Abrir Prisma Sheets](https://oscard0823.github.io/prisma-pdf/sheets/) · [Funciones y límites de XLSX](README-sheets.md)
- [Compatibilidad y orden de desarrollo de la suite Prisma](README-office.md)
- [Descargar APK y EXE](https://github.com/OscarD0823/prisma-pdf/releases/latest)

## Crear y editar

La pantalla de inicio permite crear un documento, abrir PDF o proyectos `.prisma`, recuperar la última sesión y abrir proyectos de la biblioteca local. Su identidad visual y animaciones también se incluyen en las aplicaciones.

Los PDF se muestran en una columna continua: la rueda recorre todas las páginas. Las miniaturas sirven para saltar a una página. En Inicio, **Editar palabras** prepara todas las líneas horizontales de todas las páginas de una vez. Puedes escribir y seleccionar texto directamente sin activar cada palabra. MuPDF elimina los glifos originales y pdf-lib exporta texto seleccionable con los cambios. Las fuentes originales se sustituyen por equivalentes locales. **Activar escritura flexible** convierte el contenido a bloques para redistribuirlo y aplicar un formato académico; conviene revisar el orden de lectura después de la conversión.

**Seleccionar** permite copiar texto y mover elementos editables. Una imagen original se prepara con un clic y admite arrastre, tamaño desde la esquina, ancho numérico y eliminación. **Resaltar texto** permite seleccionar palabras y crear resaltados que siguen sus líneas. Las imágenes añadidas aceptan PNG, JPEG y WebP. También hay firma dibujada, dibujo, formas, flechas y eliminación real de contenido por área.

La cinta ofrece Inicio, Insertar, Diseño, Referencias, Revisar, Vista y Páginas, con pestañas contextuales para imágenes y tablas. Incluye una galería de estilos y **81 familias de fuentes locales**, buscador y vista previa de tipografías. Hay fuentes para varios alfabetos, símbolos, copiar/cortar/pegar, espaciado antes/después, sangría inicial y francesa, viñetas y numeración. Las reglas horizontal y laterales permiten ajustar márgenes y sangrías con el ratón o el teclado.

**Importar TTF / OTF** añade fuentes personales al proyecto, con comprobación de integridad y permisos de incrustación. Se conservan al guardar, exportar y reabrir la copia `.prisma`. No se redistribuyen fuentes comerciales de Microsoft: las alternativas incluidas llevan sus nombres reales. Si la institución exige el archivo original de una fuente, impórtalo desde una copia cuya licencia permita incrustarlo. Se aceptan fuentes estáticas, hasta 8 MB por archivo y 24 MB en conjunto; fuentes variables, colecciones TTC y fuentes con permisos incompatibles muestran un aviso.

Los documentos nuevos y la escritura flexible admiten tablas con celdas unidas, imágenes, ecuaciones TeX, gráficos de barras/líneas/sectores, formas, iconos, vínculos, comentarios y videos. Un video local se reproduce en el proyecto; el PDF muestra una imagen y, si se añadió una URL, un enlace. **Escribir** ofrece una superficie continua; **Vista PDF** muestra las páginas finales. El exportador distribuye el contenido entre páginas y columnas e incorpora saltos de línea, página y columna. Papel A4, Carta, Oficio, A3, A5, B5, Tabloide o personalizado; orientación vertical/horizontal, encabezados y pies distintos en la primera página o pares, numeración y marcas de agua.

**Diseño → Salto de sección** crea secciones de página siguiente, continuas, impares o pares. Cada sección puede tener orientación, papel, márgenes, columnas, encabezados y numeración propios. Los encabezados y pies pueden vincularse a la sección anterior; la numeración puede continuar o reiniciarse. En escritura, la superficie muestra el diseño de la sección seleccionada; **Vista PDF** permite revisar las páginas físicas con sus tamaños reales. Una sección continua cambia columnas en la misma página si cabe; cambiar el tamaño u orientación requiere una página nueva.

**Referencias** ofrece 14 estilos académicos más Libre: APA 7, IEEE, ISO 690, MLA 9, Chicago autor–fecha/Turabian, Harvard, Vancouver, ACS, ABNT, ACM, AMA, CSE, Nature y Science. APA, IEEE, MLA, Chicago y ABNT también aplican una base de presentación a todo el documento y sus secciones. Los demás modifican citas y bibliografía manteniendo la disposición. Se crean índices de contenido, figuras, tablas y apéndices, títulos numerados y notas de procedencia. La biblioteca bibliográfica permite introducir una URL o datos manuales, crear una cita con localizador de página, generar referencias y localizar sus apariciones. La URL aporta el dominio y la dirección: el autor, título y fecha se completan manualmente para no inventarlos. Consulta [alcance, variantes y fuentes oficiales](README-academic.md).

**Revisar → Ortografía** abre un panel con diccionario español local, sugerencias, omisiones y diccionario personal. El texto revisado no se envía a ningún servidor. También incluye autocorrección local y contadores de palabras, caracteres y números; la selección numérica muestra su suma. **Buscar y reemplazar** sustituye una coincidencia o todas, distingue mayúsculas o palabras completas, conserva el formato y permite deshacer. **Inspector de caracteres** muestra códigos, frecuencias, invisibles, grupos de emoji y cobertura de la fuente. **Vista** muestra espacios, tabulaciones y marcas de párrafo sin alterar el PDF exportado. El panel de navegación busca en todo el documento y muestra páginas, títulos, figuras, tablas, apéndices, secciones y comentarios.

## Exportaciones

**Exportar** permite elegir PDF, Word DOCX, HTML, Markdown, TXT y PNG. Varias páginas PNG se descargan en un ZIP. PDF y PNG admiten rangos; los otros formatos exportan el documento completo. Todos se generan en el dispositivo.

DOCX conserva texto y tablas editables, estilos, vínculos, comentarios, secciones, encabezados, numeración y fuentes incrustadas. Ecuaciones, formas y gráficos se exportan como imágenes. Los índices de contenidos, tablas y figuras incluyen campos TOC actualizables en Word. El índice de apéndices se exporta como una copia del contenido generado. Las viñetas/números se exportan como texto. HTML incorpora fuentes e imágenes para lectura sin conexión, con un diseño continuo. Markdown y TXT priorizan el contenido. Para reproducir el diseño final utiliza PDF. También se pueden abrir DOCX y TXT localmente; los objetos avanzados de Word requieren revisión. Convertir un PDF de posiciones fijas a DOCX requiere revisar el orden de lectura y los saltos; no incluye OCR ni garantiza reconstruir cada tabla original.

En PDF cargados, cambiar márgenes ajusta la página completa al área útil conservando su diseño. Unir PDF convierte un documento de texto en PDF antes de añadir otros archivos. Las páginas PDF admiten extracción por rangos, reordenar, girar, duplicar, eliminar, numeración y conversión de imágenes a páginas. Una página en blanco puede ir arriba, abajo o al final; hereda las marcas de agua del proyecto, artefactos PDF identificados como marca de agua o textos grandes reconocidos como «BORRADOR»/«CONFIDENCIAL». Marcas no identificadas o integradas en un escaneo requieren añadirlas manualmente. Optimizar aplica compresión sin pérdida; no garantiza que todos los archivos reduzcan su tamaño.

## Guardar y continuar

La última sesión se guarda automáticamente en IndexedDB. **Guardar proyecto** conserva una copia con nombre en la biblioteca local. **Copia editable .prisma** descarga un archivo portable con los PDF originales, imágenes, cambios y contenido de texto; puede abrirse en otro dispositivo sin servicios de almacenamiento.

La base `prisma-pdf-local-v2` se actualiza sin borrar la sesión existente de Prisma PDF 2.0. La biblioteca es local a la aplicación o al origen y perfil del navegador. Borrar sus datos, cambiar de navegador o utilizar modo privado puede impedir la recuperación. Conserva una copia `.prisma` para respaldo. No hay sincronización en la nube.

Atajos: Ctrl+S guarda un proyecto, Ctrl+Mayús+S descarga una copia editable, Ctrl+P prepara impresión, Ctrl+Z y Ctrl+Mayús+Z deshacen/rehacen. Las letras normales no activan herramientas y funcionan dentro de los editores de texto.

## Imprimir

**Imprimir** crea una vista de las páginas con los cambios y abre el diálogo del sistema cuando pulsas Imprimir en esa vista. No exige descargar el PDF previamente. La web utiliza un marco local con imágenes de las páginas; Windows utiliza el diálogo de impresión de Electron. Android integra PrintManager y un adaptador local: conserva el PDF vectorial al imprimir todas las páginas y rasteriza las páginas seleccionadas cuando el sistema solicita un subconjunto. La disponibilidad de impresoras depende del navegador y de los servicios instalados en el dispositivo. El envío a la impresora lo controla el usuario en el diálogo del sistema.

La vista previa dibuja únicamente las primeras tres páginas. Puedes imprimir todo el documento o un rango. Web y Windows ajustan la resolución al número de páginas y limitan los mapas de bits a 24 millones de píxeles; si el documento excede ese presupuesto con una resolución legible, solicitan un rango menor. Android envía el PDF al servicio de impresión directamente.

## Rendimiento y pantallas

La interfaz se adapta a celular, tablet y escritorio. En celulares, la escritura usa letra de 16 px y una superficie fluida; Vista PDF conserva el formato de impresión. La cinta se recorre horizontalmente y los controles táctiles tienen un área mayor. La navegación de páginas se coordina con la actualización de pantalla.

Solo las páginas cercanas a la vista tienen lienzos dibujados. Su resolución está limitada por un presupuesto de memoria, incluso en pantallas de alta densidad o con mucho zoom. La biblioteca carga tarjetas pequeñas y abre los bytes de cada PDF al elegir un proyecto. El esquema de IndexedDB migra las bibliotecas existentes sin eliminarlas. El editor de escritura y el motor de fuentes se cargan cuando hacen falta, y las fuentes se distribuyen una sola vez. La vista PDF de documentos de texto se actualiza después de una pausa al escribir.

## Privacidad y funcionamiento sin conexión

El servidor sirve código y recursos estáticos. Los archivos elegidos se leen con File.arrayBuffer y se procesan en memoria y en Web Workers locales. No se suben mediante formularios, fetch, APIs, telemetría ni servicios de conversión. PDF.js, MuPDF, MathJax y todas las tipografías se distribuyen junto al editor; no hay CDN ni fuentes remotas. Las imágenes pegadas con direcciones externas se descartan. Las referencias por URL se preparan localmente, sin consultar esa página. Los enlaces y videos remotos se abren solo cuando el usuario los pulsa.

Un service worker almacena exclusivamente los recursos estáticos de la aplicación en Cache Storage; los documentos quedan en IndexedDB, separados del caché de la web. Tras completar la primera descarga, la PWA puede abrirse sin conexión. Android y Windows incluyen los recursos desde el primer inicio. Android deshabilita la copia de seguridad de datos del editor. Su exportación utiliza caché privada y el menú Compartir/Guardar del sistema; sus archivos de impresión temporales se eliminan al terminar la sesión de impresión.

## Actualizaciones

Desde la versión 5.0, **Actualizar** comprueba un pequeño manifiesto público de GitHub Pages. La comprobación automática se puede desactivar; se realiza como máximo una vez al día al volver a la aplicación. Esta consulta no contiene documentos ni fuentes personales. Android incluye permiso de Internet para comprobar versiones y abrir la descarga oficial; la edición y exportación siguen funcionando sin conexión.

En la web/PWA, **Guardar y actualizar** conserva la sesión local antes de recargar. El caché identifica los recursos por SHA-256 y reutiliza fuentes y motores que no cambiaron entre versiones. Mantiene una versión anterior para las pestañas que sigan abiertas. Android y Windows avisan y ofrecen el APK/EXE oficial de GitHub; la instalación se completa mediante el sistema operativo sobre la aplicación existente. No hay instalación silenciosa ni sincronización de documentos. Conserva también una copia `.prisma` como respaldo.

## Instalar

- Android PWA: Chrome → Instalar aplicación o Añadir a pantalla de inicio.
- PC PWA: Chrome/Edge → icono de instalación de la barra de direcciones.
- iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio.
- Windows: instalador EXE x64; no dispone de certificado comercial de firma de código.
- Android: APK firmado, Android 7 o posterior, WebView actualizado. Las nuevas versiones usan la misma identidad de firma para permitir actualizaciones.

## Límites

Prisma PDF no implementa todas las funciones de Microsoft Word. El editor de documentos ofrece escritura con formato y exportación editable; el editor de PDF trabaja sobre un formato de posiciones fijas. Consulta la [comparación de funciones y pendientes](README-word.md). El PDF exportado es el resultado final para revisar o imprimir.

- No hay OCR: las palabras dentro de una imagen escaneada no son texto editable. La edición directa conserva posiciones; para redistribuir párrafos extensos utiliza escritura flexible. Estilos mixtos originales se aproximan al estilo del primer carácter. Las fuentes incluyen latín, griego, cirílico, árabe, hebreo, tailandés, devanagari, CJK y símbolos; un carácter sin glifo compatible produce un aviso. No se garantiza cobertura de todos los emojis o sistemas de escritura.
- Texto intrínsecamente vertical/girado admite eliminación por área y reemplazo manual. Las rotaciones de páginas añadidas en el editor conservan las coordenadas.
- Imágenes originales se convierten a PNG al moverlas, hasta 2200 px por lado; imágenes añadidas se normalizan hasta 2400 px. La extracción de imágenes superpuestas puede afectar otras imágenes de la misma región. No hay edición individual de trazados vectoriales.
- Tablas admiten columnas ajustables y celdas unidas. Una fila o grupo de celdas unidas debe caber en una página; si es demasiado alto, divide el contenido o reduce la letra.
- No hay herramientas específicas para formularios PDF, adjuntos, marcadores ni firmas certificadas. Editar/copiar páginas puede perder campos interactivos e invalidar firmas. La firma dibujada es una imagen.
- Hasta 100 MB de PDF originales y 160 MB de proyecto portable; páginas e imágenes grandes requieren memoria. Imprimir genera imágenes locales de las páginas en web/Windows y puede necesitar un documento más pequeño según la memoria del dispositivo.
- Eliminar por área puede afectar contenido que toca el rectángulo. Revisa el resultado; Deshacer y el original permiten recuperarlo durante la sesión.

## Desarrollo y publicación

Node.js 22+, pnpm y tar en PATH:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
pnpm desktop:build
pnpm android:sync
```

`prepare-assets.mjs` copia recursos y licencias locales. `package-source.mjs` crea el archivo de código fuente público, sin documentos, QA, credenciales, claves, cachés ni metadatos Git. `dist/` contiene la web. GitHub Pages se actualiza automáticamente con `.github/workflows/pages.yml`.

Android requiere SDK 36 y JDK 21. Tras `pnpm android:sync`, `android/gradlew assembleRelease` crea el APK. En Windows, `scripts/build-android.ps1` reutiliza una clave de firma fuera del proyecto y protege su contraseña mediante DPAPI. No publiques ni copies estas claves al repositorio; guarda un respaldo privado para las actualizaciones. `desktop/preload.cjs` expone exclusivamente impresión local mediante IPC validado y mantiene el renderer aislado y sin integración Node.

Las pruebas verifican edición real de texto conservando líneas vecinas, imágenes con transparencia, borrado por área, compresión, rotaciones y recortes, unión, rangos, márgenes, estilos, Unicode, tablas, columnas, índices paginados, citas enlazadas, comentarios, inserción de páginas, marcas de agua y recuperación de proyectos. La versión 5 añade pruebas de secciones, estilos CSL, permisos e integridad de fuentes personales, estructura DOCX, HTML portable, reemplazos y reutilización del caché de actualizaciones. Se verificaron las descargas desde la interfaz y los PDF renderizados. DOCX se verificó como paquete OpenXML; no se dispone de Word/LibreOffice para validar su paginación visual. La compilación del APK y la verificación de su firma no sustituyen una prueba física de impresora o teléfono.

## Licencia

AGPL-3.0-or-later. El código de esta versión se publica en GitHub y en `prisma-pdf-source.tar.gz`. MuPDF conserva su distribución JavaScript/WASM original. Tiptap, React, docx y pdf-lib usan MIT; PDF.js y MathJax Apache-2.0; Lucide ISC. Los estilos CSL conservan CC BY-SA 3.0 y su atribución original; las fuentes incluyen SIL OFL, Apache 2.0 y GUST Font License según cada familia. Consulta LICENSE, public/licencias.txt, public/third-party, src/csl/SOURCES.json y public/fonts/EXTRA-CATALOG.md.
