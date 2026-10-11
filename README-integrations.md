# Prisma: motores incorporados y motores de PC

Desde Suite 6.4, los motores OOXML, la representación PPTX y el taller PDF usan implementaciones propias de Prisma. Se retiró la dependencia de GenOffice y PDFCraft. Se mantiene lectura StarDict adaptada del componente MIT go-stardict incluido en Medict y el esquema ODict. Las fuentes añadidas conservan sus licencias individuales. `vendor/*/SOURCE.json` y `public/fonts/*/SOURCE.json` identifican revisiones y hashes. Los originales permanecen sin modificar; los adaptadores de Prisma están separados.

## Funciones disponibles

- Writer: DOCX sin cambios se devuelve idéntico al original. Cambios compatibles de texto, notas y comentarios conservan partes originales. Cambios de estructura o formato pasan al exportador de Prisma: revisar diseños avanzados, campos y objetos no compatibles antes de sustituir el original.
- PDF: taller para invertir páginas, cuadernillos, varias páginas por hoja, dividir páginas, intercalar dos archivos, rellenar/aplanar formularios y editar metadatos. OCR español/inglés con Tesseract y modelos incluidos; revisar el texto reconocido. La imposición, inversión e intercalación convierten los formularios en contenido fijo para conservar sus valores visibles.
- Slides: PPTX editable, texto, imágenes, formas, tablas, notas, duplicación de hojas y reglas. Exportación PDF de páginas rasterizadas; algunos efectos y fuentes se representan aproximadamente.
- Data: SQLite, tablas, relaciones, consultas y edición de registros; importa CSV/TSV y la primera hoja de XLSX. Las vistas/exportaciones de tabla tienen un máximo de 500 filas; la exportación SQLite conserva toda la base. No abre ACCDB/MDB ni ejecuta macros de Access.
- Publisher: plantillas A4, maquetación con objetos y exportación PPTX/PDF. No importa ni exporta PUB.
- Fuentes: 95 familias distribuidas, búsqueda, favoritas y fuentes personales autorizadas.
- Diccionarios: StarDict `.ifo/.idx/.dict` o gzip, ODict XML, XDXF, XML básico TEI, JSON y TSV/TXT. No MDX, archivos ODict binarios ni todos los esquemas de Lexonomy. La biblioteca conserva términos y definiciones, sin todos los metadatos originales. Las colecciones de terceros no se descargan automáticamente.

## Conectar motores de PC

La versión Windows incluye los motores propios de Prisma. **Motores PC** permite verificar/conservar DOCX y PPTX. Los servicios adicionales son opcionales: no están instalados ni incluidos en el instalador de Prisma.

Para usar el complemento desde la web, abre el ejecutable instalado con `--local-engine`, por ejemplo:

```powershell
& "$env:LOCALAPPDATA\Programs\Prisma PDF\Prisma PDF.exe" --local-engine
```

Se abrirá un enlace privado de vinculación. El complemento escucha exclusivamente en 127.0.0.1, usa un token aleatorio por ejecución y admite el origen público de Prisma o el servidor de desarrollo local. El token queda en la sesión del navegador; no se publica. Cierra el proceso para desconectar. Para desarrollo puede ejecutarse `node engines/server.cjs`.

Conectores disponibles:

| Motor | Alcance actual |
| --- | --- |
| ONLYOFFICE Document Builder | Conversión local por CLI si `docbuilder.exe` está instalado. Se busca en Program Files/ONLYOFFICE/DocumentBuilder; también puede configurarse `PRISMA_DOCUMENT_BUILDER`. La distribución gratuita actual del SDK puede añadir marcas de agua: consultar su licencia. No se incluye el SDK. |
| Stirling PDF | Comprobación y compresión por API de un servidor instalado en localhost; clave API opcional, conservada únicamente durante la sesión del diálogo. |
| OpenProject | Lectura de proyectos del servidor local por API v3. No envía documentos a OpenProject. |
| ONLYOFFICE Docs / Euro-Office | Comprobación de disponibilidad. La sesión completa de edición web aún requiere un adaptador de documentos y no está implementada. |

Las URL de servicios se restringen a localhost/127.0.0.1/::1, con redirecciones rechazadas. No se habilita un servidor público ni se suben documentos a GitHub. La caché de aplicación contiene código, fuentes y modelos; las bibliotecas de documentos usan IndexedDB local. Descargar proyectos proporciona una copia independiente del almacenamiento del navegador.

## Compilación y actualización

Node 22 o posterior y pnpm indicado en `package.json`:

```text
pnpm install --frozen-lockfile
pnpm test
pnpm build:products
```

El código propio, los recursos y las dependencias declaradas permiten compilar Prisma sin clonar otras suites. `vendor` conserva únicamente el lector abierto de diccionarios. `scripts/bundle-prisma-engines.mjs` genera los motores propios de PC; Vite compila el mismo núcleo para web. `products.json` fija nombres/versiones. `scripts/native-products.mjs` regenera configuraciones Windows/Android. Las seis PWA tienen manifiesto, alcance y aviso de actualizaciones independientes. Las aplicaciones nativas ofrecen el instalador de una nueva versión y preservan su identificador de producto; Windows x64 y Android son los destinos nativos disponibles, iOS/macOS/Linux usan la PWA.

No todos los repositorios de referencia pueden combinarse como bibliotecas: ONLYOFFICE, Euro-Office y OpenProject necesitan servicios; word-sys tiene un motor de escritorio; topics/fonts es un directorio. Sus arquitecturas y formatos se revisaron, pero no se anuncia su código completo como incorporado.

El historial anterior describe integraciones sustituidas en 6.4. Consulta [el análisis de Office](README-office-analysis.md) y [las macros portables](README-programming.md) para el estado actual. Las suites externas no son necesarias para editar o exportar.
