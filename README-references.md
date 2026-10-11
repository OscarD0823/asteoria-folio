# Proyectos de referencia para Prisma

Revisión del 10 de octubre de 2026. Los enlaces repetidos se consolidaron en **17 referencias únicas**. Los enlaces de organizaciones se revisaron junto con su repositorio DocumentServer; el enlace traducido de fuentes se contrastó con el repositorio original.

Se revisaron la documentación primaria, arquitectura declarada, funciones y licencia publicada. Esto es una evaluación documental, no una auditoría completa de cada código ni una prueba de sus aplicaciones. Esta entrega incorpora componentes concretos y adaptadores, conserva sus licencias y fuentes originales, y mantiene la identidad propia de Prisma. El alcance exacto está documentado en [README-integrations.md](README-integrations.md). No se incorporaron todas las suites completas.

## Cambios aplicados

Entrega 6.3 / Writer 1.3 / Sheets 0.3, con primeras versiones de Slides, Data y Publisher. 94 familias de fuentes. Consulte la [matriz de integración real](README-integrations.md). Los puntos siguientes describen también las mejoras de instalación de la entrega anterior.

- Instalación independiente de PDF, Writer y Sheets, captura temprana del diálogo del navegador, instrucciones para los sistemas de destino e iconos adaptables e iOS.
- Caché de recursos esenciales primero; biblioteca opcional con descarga completa, progreso real, errores y reintentos. Las actualizaciones reutilizan hashes y recursos presentes. Los documentos quedan fuera de esa caché.
- Biblioteca compartida de fuentes en Sheets con búsqueda, categorías, favoritas, recientes y vista previa; correspondencias de fuentes de Office para pantalla y PDF y conservación del nombre en XLSX.
- Diccionario personal local con términos y definiciones, consulta, edición, eliminación, importación/exportación y aceptación por el corrector. La búsqueda tolera tildes, mientras el corrector distingue las palabras acentuadas.

## Comparación

| Referencia | Funciones o arquitectura observadas | Aplicación en Prisma y alcance |
| --- | --- | --- |
| [genspark-ai/genoffice](https://github.com/genspark-ai/genoffice) | Edición local de OOXML y conservación de partes sin cambios; CLI y motores de documentos. | Referencia funcional. Desde 6.4 se sustituyó el código incorporado por motores propios DOCX/PPTX y renderer propio. |
| [ONLYOFFICE/DocumentServer](https://github.com/ONLYOFFICE/DocumentServer) | Suite de documentos, hojas y presentaciones con interfaz de cinta y formatos Office. | Conector de disponibilidad de Docs local y conversión opcional por Document Builder instalado. La sesión completa de edición de Docs sigue pendiente. |
| [Euro-Office/DocumentServer](https://github.com/Euro-Office/DocumentServer) | Suite derivada con motores, interfaz web y editores de escritorio en repositorios separados. | Conector de disponibilidad del servidor local; todavía no se incorpora una sesión completa de sus editores. |
| [Stirling-Tools/Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) | Herramientas PDF y flujos de procesamiento; ediciones web, servidor y escritorio. | Conector local de comprobación y compresión PDF por API. Servicio opcional, no incluido ni instalado automáticamente. |
| [word-sys/word-sys-pdf-editor](https://github.com/word-sys/word-sys-pdf-editor) | Editor PDF de escritorio: objetos, páginas, miniaturas, guardado y exportación. | Arquitectura y fuentes revisadas para objetos y organización de páginas. Su motor nativo completo no se incorporó. |
| [PDFCraftTool/pdfcraft](https://github.com/PDFCraftTool/pdfcraft) | Herramientas PDF que procesan archivos en el navegador mediante motores locales. | Referencia funcional. Desde 6.4 el taller usa algoritmos propios sobre pdf-lib; no incorpora sus procesadores. |
| [opf/openproject](https://github.com/opf/openproject) | Gestión de proyectos, planificación y colaboración con aplicación de servidor. | Conector de lectura de proyectos de un servidor local por API v3. No se incorpora Rails ni se envían documentos al servicio. |
| [TheOpenDictionary/odict](https://github.com/TheOpenDictionary/odict) | Formato y herramientas de consulta de diccionarios locales. | Esquema original y soporte de importación/exportación ODict XML. El motor y formato binario completo ODict no se incorporaron. |
| [Akylas/OSS-Dict](https://github.com/Akylas/OSS-Dict) | Diccionarios locales importables y consultas tolerantes a variaciones del término. | Referencia de búsqueda y formatos locales; biblioteca consultable sin servidor. No se redistribuyeron sus colecciones. |
| [terasum/medict](https://github.com/terasum/medict) | Lector de diccionarios MDX/StarDict, búsquedas y vocabulario local. | Decodificación StarDict adaptada del componente go-stardict MIT incluido en Medict, con originales/licencia conservados. MDX pendiente. |
| [reader-dict/monolingual](https://github.com/reader-dict/monolingual) | Generación y distribución de diccionarios monolingües, incluidos datos de Wiktionary. | Referencia de datos y formatos. No se descargaron definiciones de terceros sin su licencia; importación local XDXF/XML disponible. |
| [tdulcet/compact-dictionaries](https://github.com/tdulcet/compact-dictionaries) | Diccionarios compactos para lectores, generados desde diversas fuentes. | Referencia de colecciones e importación StarDict, con gzip local y límites de tamaño. No se redistribuyen sus datos. |
| [elexis-eu/lexonomy](https://github.com/elexis-eu/lexonomy) | Editor de entradas lexicales estructuradas y publicación de diccionarios. | Referencia de edición lexical; lectura XML/TEI básica. No se incorpora su servidor ni todos sus esquemas de metadatos. |
| [ONLYOFFICE/core-fonts](https://github.com/ONLYOFFICE/core-fonts) | Colección de fuentes utilizadas por la suite. | Nueve familias originales añadidas, con licencias y hashes por familia: DejaVu, Abyssinica, Lohit y Padauk. |
| [kiwi0fruit/open-fonts](https://github.com/kiwi0fruit/open-fonts) | Guías y colecciones de fuentes abiertas, sustituciones y cobertura de caracteres. | Dos familias originales añadidas: DejaVu Sans Mono y Embed Serif, con licencias y hashes. |
| [wachin/Alternative-to-privative-Microsoft-Windows-Fonts](https://github.com/wachin/Alternative-to-privative-Microsoft-Windows-Fonts) | Guía de alternativas a familias de Microsoft. | Arvo y Anton originales añadidas con sus licencias; correspondencias Office conservadas. |
| [GitHub topics/fonts](https://github.com/topics/fonts) | Directorio de proyectos, no una biblioteca con una licencia común. | Directorio consultado para descubrir familias; no constituye una biblioteca con licencia única. |

## Licencias y versiones revisadas

Los enlaces siguientes fijan el estado documental consultado. Las familias distribuidas por Prisma mantienen sus licencias y archivos SOURCE.json en public/fonts. Consultar un repositorio no concede permiso para distribuir todos sus recursos.

| Repositorio | Revisión | Licencia observada |
| --- | --- | --- |
| genspark-ai/genoffice | [c8e9467c4101](https://github.com/genspark-ai/genoffice/tree/c8e9467c4101818e070644e1667bad48d4a2e1df) | Apache-2.0 |
| ONLYOFFICE/DocumentServer | [f580eb584394](https://github.com/ONLYOFFICE/DocumentServer/tree/f580eb58439432310943ece02c9730c6a21365e7) | AGPL-3.0 |
| Euro-Office/DocumentServer | [9503488edc0e](https://github.com/Euro-Office/DocumentServer/tree/9503488edc0e44c1a8e1329551e8d60192452768) | AGPL-3.0 |
| Stirling-Tools/Stirling-PDF | [313794c573df](https://github.com/Stirling-Tools/Stirling-PDF/tree/313794c573df5e92d2f020f5ec53d08b264d6e4f) | MIT fuera de directorios excluidos; motor y módulos específicos tienen licencias propias |
| word-sys/word-sys-pdf-editor | [9f44998afe04](https://github.com/word-sys/word-sys-pdf-editor/tree/9f44998afe04e5ef9feaa7ef1cb55232c5087143) | GPL-3.0 |
| PDFCraftTool/pdfcraft | [a30070241c82](https://github.com/PDFCraftTool/pdfcraft/tree/a30070241c82ae9f03b8ce6398a29182387c1764) | AGPL-3.0 |
| opf/openproject | [a2016a8c86f2](https://github.com/opf/openproject/tree/a2016a8c86f2464ba91840af7cd11a991c117eff) | GPL-3.0 |
| TheOpenDictionary/odict | [919fde3cae4f](https://github.com/TheOpenDictionary/odict/tree/919fde3cae4f018e8f0445fad975bdae35981f74) | GPL-3.0 |
| Akylas/OSS-Dict | [58b05baab44c](https://github.com/Akylas/OSS-Dict/tree/58b05baab44cd5acfd5961a9379572c74a202392) | GPL-3.0 |
| terasum/medict | [face4a4011b2](https://github.com/terasum/medict/tree/face4a4011b2cdfed9cfdcfbbcdcb4df4e58c660) | GPL-3.0 |
| reader-dict/monolingual | [6d11659099c3](https://github.com/reader-dict/monolingual/tree/6d11659099c3a0aceea93cbebcf584b08dcd6eb0) | MIT para código; los datos tienen licencias propias |
| tdulcet/compact-dictionaries | [fc9bbcd32a27](https://github.com/tdulcet/compact-dictionaries/tree/fc9bbcd32a2742681d3c747071527674b60b44f5) | GPL-3.0 para código; datos según la fuente |
| elexis-eu/lexonomy | [bb8e1728b1d7](https://github.com/elexis-eu/lexonomy/tree/bb8e1728b1d7e4bbe824061bc8cc61a5ecdddff2) | MIT |
| ONLYOFFICE/core-fonts | [7030c6681fb5](https://github.com/ONLYOFFICE/core-fonts/tree/7030c6681fb5bbed560675cb42422f91df15d5c9) | Sin licencia global identificada; revisar cada archivo |
| kiwi0fruit/open-fonts | [deb211dd1e08](https://github.com/kiwi0fruit/open-fonts/tree/deb211dd1e08becf3b9300b02365cd79415c64d4) | Licencia global no identificada por la API; revisar cada componente |
| wachin/Alternative-to-privative-Microsoft-Windows-Fonts | [ae393b1a52ac](https://github.com/wachin/Alternative-to-privative-Microsoft-Windows-Fonts/tree/ae393b1a52ac40f916125cfca4d9b2a779ed6bcd) | Sin licencia global identificada; revisar cada archivo |

La [licencia de Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF/blob/main/LICENSE) enumera exclusiones para engine, módulos de escritorio, SaaS y otros directorios. No se interpreta toda la aplicación como MIT.

## Desarrollo posterior

La conservación de partes OOXML no editadas, los flujos PDF por lotes, OCR, formatos de diccionarios binarios y colecciones de definiciones grandes necesitan implementación y validación adicionales. No se anuncian como funciones terminadas. Tampoco se añadió colaboración remota, IA externa ni almacenamiento de documentos en un servidor.

El orden de la suite continúa siendo Writer/PDF, Sheets, Slides, Data y Publisher. Slides, Data y Publisher siguen pendientes; los enlaces de suites completas aportan referencias y no hacen que estas aplicaciones existan dentro de Prisma.

Guía práctica: [instalación, fuentes y diccionario](README-install.md). La instalación se ajusta a los [requisitos y límites de PWA documentados por MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
