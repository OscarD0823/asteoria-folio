# Prisma PDF 3.0

Editor de PDF y creador de documentos en español. Web, PWA, Android y Windows; todos procesan los documentos en el dispositivo.

- [Abrir editor](https://oscard0823.github.io/prisma-pdf/)
- [Descargar APK y EXE](https://github.com/OscarD0823/prisma-pdf/releases/latest)

## Crear y editar

La pantalla de inicio permite crear un documento, abrir PDF o proyectos `.prisma`, recuperar la última sesión y abrir proyectos de la biblioteca local. Su identidad visual y animaciones también se incluyen en las aplicaciones.

Los PDF se muestran en una columna continua: la rueda recorre todas las páginas. Las miniaturas sirven para saltar a una página. En Inicio, **Editar palabras** convierte una línea del contenido original en texto editable directamente sobre la página. Los cambios aparecen mientras escribes; no hay un panel ni un botón Aplicar. MuPDF elimina los glifos originales y pdf-lib exporta texto seleccionable con los cambios. Las fuentes originales se sustituyen por equivalentes locales.

**Seleccionar** permite copiar texto y mover elementos editables. Una imagen original se prepara con un clic y admite arrastre, tamaño desde la esquina, ancho numérico y eliminación. **Resaltar texto** permite seleccionar palabras y crear resaltados que siguen sus líneas. Las imágenes añadidas aceptan PNG, JPEG y WebP. También hay firma dibujada, dibujo, formas, flechas y eliminación real de contenido por área.

Los documentos nuevos tienen un editor de texto con negrita, cursiva, subrayado, tachado, fuentes locales, tamaño, color, resaltado, alineación, justificación, sangrías, interlineado, títulos, listas, superíndice, subíndice, enlaces, tablas e imágenes con tamaño ajustable. **Escribir** ofrece una superficie continua; **Vista PDF** muestra las páginas finales. El exportador distribuye el contenido entre páginas, incluidos saltos manuales, tablas, encabezado, pie y numeración. Los márgenes y formatos A4, Carta y Oficio admiten orientación vertical y horizontal.

En PDF cargados, cambiar márgenes ajusta la página completa al área útil conservando su diseño. No redistribuye el texto original como un documento de Word. Unir PDF convierte un documento de texto en PDF antes de añadir otros archivos. Las páginas PDF admiten extracción por rangos, reordenar, girar, duplicar, eliminar, añadir páginas, numeración y conversión de imágenes a páginas. Optimizar aplica compresión sin pérdida; no garantiza que todos los archivos reduzcan su tamaño.

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

El servidor sirve código y recursos estáticos. Los archivos elegidos se leen con File.arrayBuffer y se procesan en memoria y en un Web Worker local con MuPDF WASM. No se suben mediante formularios, fetch, APIs, telemetría ni servicios de conversión. PDF.js y las tipografías Liberation se distribuyen junto al editor; no hay CDN ni fuentes remotas. Las imágenes pegadas con direcciones externas se descartan.

Un service worker almacena exclusivamente los recursos estáticos de la aplicación en Cache Storage; los documentos quedan en IndexedDB, separados del caché de la web. Tras completar la primera descarga, la PWA puede abrirse sin conexión. Android y Windows incluyen los recursos desde el primer inicio. Android no solicita permiso de Internet y deshabilita la copia de seguridad de datos del editor. Su exportación utiliza caché privada y el menú Compartir/Guardar del sistema; sus archivos de impresión temporales se eliminan al terminar la sesión de impresión.

## Instalar

- Android PWA: Chrome → Instalar aplicación o Añadir a pantalla de inicio.
- PC PWA: Chrome/Edge → icono de instalación de la barra de direcciones.
- iPhone/iPad: Safari → Compartir → Añadir a pantalla de inicio.
- Windows: instalador EXE x64; no dispone de certificado comercial de firma de código.
- Android: APK firmado, Android 7 o posterior, WebView actualizado. Las nuevas versiones usan la misma identidad de firma para permitir actualizaciones.

## Límites

Prisma PDF no implementa todas las funciones de Microsoft Word. El editor de documentos ofrece escritura con formato y exportación PDF; el editor de PDF trabaja sobre un formato de posiciones fijas. El PDF exportado es el resultado final para revisar o imprimir.

- No hay OCR: las palabras dentro de una imagen escaneada no son texto editable. El texto original se edita por líneas horizontales; estilos mixtos se aproximan al estilo del primer carácter. Letras latinas y acentos están cubiertos por las fuentes locales; otros alfabetos y emojis dependen de sus glifos.
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

Las pruebas verifican edición real de texto conservando líneas vecinas, imágenes con transparencia, borrado por área, compresión, rotaciones y recortes, unión, rangos, márgenes, estilos, Unicode, tablas, paginación y recuperación de proyectos. La compilación del APK y la verificación de su firma no sustituyen una prueba física de impresora o teléfono.

## Licencia

AGPL-3.0-or-later. El código de esta versión se publica en GitHub y en `prisma-pdf-source.tar.gz`. MuPDF conserva su distribución JavaScript/WASM original. Tiptap, React y pdf-lib usan MIT; PDF.js Apache-2.0; Lucide ISC; Liberation Fonts SIL Open Font License 1.1. Consulta LICENSE, public/licencias.txt, public/third-party y public/fonts/LICENSE.
