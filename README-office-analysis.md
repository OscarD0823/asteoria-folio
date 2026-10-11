# Office16 y la implementación propia de Prisma

Inspección del 11 de octubre de 2026 de `C:\Program Files\Microsoft Office\root\Office16`. Se inventariaron **2.317 archivos, aproximadamente 1.518 MB**, sin errores de lectura del inventario. Word, Excel, PowerPoint, Access, Publisher, OneNote y Outlook tienen versión de archivo **16.0.14326.20454** en esta instalación.

El inventario completo se guarda localmente en `D:\PDF\Analisis-Office\inventario-office16.json` y `.csv`. Incluye ruta relativa, tamaño, extensión, grupo y clasificación orientativa para cada archivo. Para EXE/DLL/OCX se inspeccionaron las cabeceras PE y los nombres de importaciones/exportaciones accesibles. `versiones-programas.json` contiene los metadatos de los ejecutables.

**Alcance comprobado:** inventario de toda la carpeta, metadatos y dependencias visibles de binarios, recursos de presentación e idioma y comparación con los modelos públicos de las aplicaciones. Los nombres de archivos y dependencias permiten clasificar responsabilidades, pero no demuestran cómo está implementado cada algoritmo interno. No se afirma haber recuperado el código de Office ni reproducido todos sus comportamientos. No se incorporan ejecutables, diccionarios propietarios ni recursos gráficos de Office a Prisma.

## Componentes encontrados y su equivalente

| Área instalada | Observación local | Función / propuesta propia de Prisma |
| --- | --- | --- |
| Ejecutables principales | WINWORD, EXCEL, POWERPNT, MSACCESS, MSPUB, ONENOTE y OUTLOOK | Aplicaciones separadas con modelos de datos compartidos. Writer, Sheets, Slides, Data y Publisher ya existen; notas y correo todavía no. |
| Bibliography | 18 archivos; 12 hojas de estilos bibliográficos | Citas, fuentes y bibliografías. Prisma mantiene sus propios modelos académicos y formateadores; no copia los XSL de Office. |
| Estilos bibliográficos instalados | APA 6, Chicago, GB, GOST nombre/título, Harvard Anglia 2008, IEEE 2006, ISO 690, ISO 690 numérico, MLA 7, SIST 02 y Turabian | Las versiones y reglas no se deben confundir con estándares actuales. La selección de una norma en Prisma usa sus propias opciones; la norma no se deduce únicamente de los márgenes. |
| PROOF | 53 archivos, aproximadamente 89,7 MB | Ortografía, división silábica y recursos lingüísticos. Prisma entrega 11 diccionarios regionales abiertos para 8 idiomas. Gramática y división silábica completa siguen pendientes. |
| PAGESIZE / PUBWIZ | 83 / 234 archivos | Tamaños de página y asistentes de publicaciones. Prisma usa dimensiones propias, plantillas y reglas. Los asistentes de Publisher no se ejecutan. |
| ODBC Drivers / ADDINS | 31 / 233 archivos | Conexiones de datos y complementos. Prisma Data trabaja con SQLite local. No emula los proveedores ODBC o los complementos COM. |
| sdxs | 317 archivos | Recursos y definiciones de componentes. Su papel concreto requiere documentación o pruebas adicionales; no se infiere cada algoritmo de su extensión. |
| Idiomas, incluida carpeta 3082 | Recursos españoles y otras carpetas LCID | Traducción de la interfaz y recursos lingüísticos. Prisma distingue idioma de interfaz, idioma del documento y diccionario de revisión. |
| Library, formularios y asistentes | Complementos, controles y recursos específicos | Macros Prisma y SQL propios. Formularios, informes, validación y complementos extensibles se deben desarrollar contra modelos propios. |
| DLL comunes, runtimes y bibliotecas de tipos | Dependencias PE registradas por archivo | APIs y servicios compartidos. El navegador no carga DLL/OCX de Windows; el núcleo de Prisma es TypeScript/WebAssembly y no depende de que Office esté instalado. |

La clasificación de cada archivo está marcada como inferencia en el inventario cuando depende de su nombre o ubicación. Esto evita presentar un nombre de DLL como prueba de su comportamiento interno.

## Programas, modelo y diferencias pendientes

| Programa | Cómo se organiza públicamente | Implementación actual en Prisma | Trabajo pendiente |
| --- | --- | --- | --- |
| Word | Documento, rangos, párrafos, secciones, tablas, estilos, campos, marcadores, notas y comentarios | Writer / PDF: edición de texto enriquecido, secciones, reglas, tablas, objetos, normas académicas, referencias, índices, revisión y exportación; motor propio de conservación OOXML | Control de cambios completo, comparación de documentos, combinación de correspondencia, campos complejos, cuadros vinculados, OLE, formularios y equivalencia de paginación |
| Excel | Libro, hojas, rangos, fórmulas, tablas, gráficos, nombres y conexiones | Sheets: celdas, fórmulas, hojas, formato, selección, ordenación, búsqueda, importación/exportación y macros Prisma | Tablas dinámicas, gráficos OOXML nativos, Power Query / modelo de datos, segmentadores, fórmulas no soportadas y conversión VBA |
| PowerPoint | Presentación, diapositivas, diseños, patrones, formas, texto, tablas, notas y animaciones | Slides: motor propio PPTX, texto, imágenes, formas, tablas, notas, geometría, duplicación, presentación y exportación | Vista completa de patrones/diseños, grupos, SmartArt, animación, audio/vídeo y efectos avanzados; preservación no implica que todo sea visible |
| Access | Bases, tablas, consultas, relaciones, formularios, informes, macros y módulos | Data: SQLite local, diseño básico, registros, relaciones, SQL y macros Prisma | Lector/escritor ACCDB/MDB, diseñador de formularios e informes y traducción de consultas/funciones de Access |
| Publisher | Publicación, páginas, formas, texto, historias y marcos vinculados | Publisher: páginas A4, plantillas y objetos mediante el motor propio de presentación | PUB, marcos de texto vinculados, páginas maestras completas, imposición editorial y preimpresión |
| OneNote | Cuadernos, secciones, páginas y contenido | Inventariado; no hay aplicación Prisma de notas | Modelo de cuadernos, tinta, adjuntos, búsqueda y formatos de intercambio |
| Outlook | Correo, carpetas, contactos, calendario y tareas | Inventariado; no hay cliente Prisma de correo | Correo requiere cuentas/protocolos y sincronización; PST/OST y conectores no están implementados |

La jerarquía anterior se contrasta con las referencias oficiales de [Word](https://learn.microsoft.com/en-us/office/vba/api/overview/word/object-model), [Excel](https://learn.microsoft.com/en-us/office/vba/api/overview/excel/object-model), [PowerPoint](https://learn.microsoft.com/en-us/office/vba/api/overview/powerpoint/object-model), [Access](https://learn.microsoft.com/en-us/office/vba/api/overview/access/object-model) y [Publisher](https://learn.microsoft.com/en-us/office/vba/api/overview/publisher/object-model). Las correspondencias y decisiones para Prisma son propuestas de implementación propias.

## Texto, incluso una coma

Una coma implica un punto de código, una fuente, métricas, posición y reglas de salto. No basta con sustituir un icono de la barra. Prisma conserva el texto Unicode, los espacios, acentos combinados, signos tipográficos y pares sustitutos; utiliza fuentes locales y métricas para el dibujo. Se prueban `,`, `« »`, `…`, acentos, tabulaciones, espacios consecutivos, caracteres CJK y emoji. El corrector usa posiciones UTF-16 compatibles con la selección del editor y omite URL/correo como palabras.

Las pruebas de ODT/RTF verifican conservación de puntuación y caracteres, idioma, orientación, márgenes y tablas. Las de OOXML verifican partes no modificadas y guardados repetidos. Esto no demuestra igualdad visual píxel a píxel con Word: la sustitución de fuentes, composición, ligaduras, campos y paginación todavía pueden producir diferencias. El visor de caracteres ayuda a identificar caracteres invisibles; el contador y el corrector no deben ocultarlos ni eliminarlos del documento.

## Formatos y conservación

| Aplicación | Formatos actuales | Condiciones |
| --- | --- | --- |
| Writer / PDF | DOCX, DOCM conservado, PDF, ODT, RTF, HTML, Markdown, TXT, PNG/ZIP y proyecto Prisma | ODT es intercambio básico; RTF representa imágenes como etiquetas. El proyecto conserva el trabajo editable. DOCM conserva VBA inactivo en rutas compatibles, no lo ejecuta. |
| Sheets | XLSX, XLSM original, CSV, TSV, JSON, ODS, tabla DOCX y PDF | ODS inicial exporta valores de todas las hojas; XLSX conserva fórmulas y formato compatibles. JSON incluye entrada y valor. CSV/TSV representan una hoja. Copia XLSX de XLSM elimina VBA con aviso. |
| Slides / Publisher | PPTX, PPTM conservado, PDF y SVG de la página actual | PPTX/PPTM mantiene objetos no editados aunque el visor no los represente. PDF usa imágenes de página. SVG mantiene texto y objetos representados por el visor. PUB no está implementado. |
| Data | SQLite, CSV, JSON y XLSX | SQLite conserva toda la base. Exportación de la vista muestra hasta 500 filas. ACCDB/MDB están pendientes. |

DOC, XLS, PPT y PUB binarios antiguos, ODP, ACCDB/MDB, PST/OST y ONE no están implementados como lectores/escritores propios. No se renombran archivos para simular esos formatos. Las diferencias de los tipos de Office se documentan en la [referencia de formatos de Microsoft](https://learn.microsoft.com/en-us/office/compatibility/office-file-format-reference); los nuevos paquetes ODT/ODS se construyen siguiendo [OpenDocument 1.3](https://docs.oasis-open.org/office/OpenDocument/v1.3/os/part2-packages/OpenDocument-v1.3-os-part2-packages.html).

## Web, PC y celular

El núcleo de documentos, macros, corrector y exportadores es el mismo en las tres versiones. React presenta la interfaz; Electron y Capacitor envuelven la aplicación y añaden guardado, compartir, impresión e instalación donde la plataforma lo permite. El diseño se adapta al tamaño de la pantalla; los botones y permisos propios del sistema pueden variar.

La PWA conserva aplicaciones y diccionarios localmente después de preparar el modo sin conexión. Los archivos de usuario se procesan en memoria/IndexedDB, no se suben a un servidor de documentos. Las actualizaciones cambian el código de la aplicación y mantienen los proyectos locales; una descarga del sitio para preparar recursos no envía el contenido del documento.

Los motores DOCX/PPTX y el taller PDF ya no usan código de GenOffice o PDFCraft en producción. Los repositorios suministrados se mantienen como referencias de funciones y comportamiento. Fuentes y datos léxicos abiertos conservan sus licencias; siguen usándose bibliotecas generales de formatos, cálculo, renderizado y Hunspell, sin requerir instalar sus suites de Office.

## Validación y continuación

Las pruebas automatizadas cubren conservación de partes, notas, tablas, imágenes, referencias, Unicode, idiomas, macros limitadas, lotes SQL con reversión, formatos abiertos y exportación inmediata. Se revisan además la interfaz y los archivos de prueba locales. Una prueba de carga no acredita compatibilidad total con Office.

El orden siguiente debe ser: consolidar Writer y PDF; completar Sheets (gráficos, tablas y análisis); ampliar Slides (patrones y efectos); Data (formularios e intercambio Access); Publisher (texto vinculado y publicación). Primero se implementa la base equivalente a Office con funciones y motores propios. Los repositorios suministrados son referencias adicionales para la etapa de mejoras posterior a esa base; no sustituyen las aplicaciones independientes ni el programa general Prisma. Cada función necesita un ejemplo original, un resultado exportado y una comparación verificable antes de anunciar equivalencia. Consulta [Prisma y las aplicaciones independientes](README-prisma.md).
