# Prisma: aplicación general y editores independientes

**Prisma** es la aplicación general. Reúne seis editores propios: **Prisma Writer**, **Prisma Sheets**, **Prisma Slides**, **Prisma PDF**, **Prisma Data** y **Prisma Publisher**. Cada editor también conserva su página, PWA, APK, instalador Windows, icono, identificador y actualización independientes. Prisma tiene su propio identificador `com.oscard.prisma`, versión y distribución.

Cada aplicación tiene una página y un repositorio de publicación con su propio nombre. Prisma general se publica en [/prisma/](https://oscard0823.github.io/prisma/).

| Aplicación | Página |
|---|---|
| Prisma | https://oscard0823.github.io/prisma/ |
| Prisma PDF | https://oscard0823.github.io/prisma-pdf/ |
| Prisma Writer | https://oscard0823.github.io/prisma-writer/ |
| Prisma Sheets | https://oscard0823.github.io/prisma-sheets/ |
| Prisma Slides | https://oscard0823.github.io/prisma-slides/ |
| Prisma Data | https://oscard0823.github.io/prisma-data/ |
| Prisma Publisher | https://oscard0823.github.io/prisma-publisher/ |

Las direcciones anteriores bajo `/prisma-pdf/writer/`, `/prisma-pdf/prisma/` y las demás subcarpetas permanecen como accesos compatibles. No se modifica la identidad de los proyectos locales. Las páginas nuevas empaquetan sus propios recursos, manifiesto y caché de aplicación; no necesitan cargar fuentes o diccionarios desde la página PDF.

El código compartido y los instaladores se mantienen en este repositorio. Cada repositorio de publicación compila el producto correspondiente desde el código público de `main`. Después de subir una actualización del código compartido, `pnpm publish:pages` inicia los siete despliegues con GitHub CLI autenticado. Se puede publicar una aplicación con `pnpm publish:pages writer`. Para compilar una página individual: `pnpm build:product writer` en una carpeta de salida vacía.

## Uso y almacenamiento

El panel abre los editores dentro del mismo paquete; no necesita abrir sus páginas públicas ni tener otras aplicaciones instaladas. Se carga un editor a la vez. «Inicio de Prisma» vuelve al panel; «Cambiar aplicación» abre otro editor después de guardar. Si el guardado falla o hay una operación en curso, el cambio se detiene y muestra el motivo.

En las páginas públicas, fuentes y diccionarios se publican una sola vez y cada PWA mantiene su propia caché y ámbito. Los APK/EXE incluyen copias completas de estos recursos. No necesitan un servidor local ni descargar fuentes para empezar a trabajar.

«Abrir un archivo» reconoce PDF/proyectos .prisma, DOCX/DOCM/TXT, XLSX/XLSM/CSV/TSV, PPTX/PPTM y SQLite. El archivo pasa al editor mediante un registro local temporal de IndexedDB que se consume una sola vez. No hay subida a un servidor. Los registros pendientes caducan después de 24 horas y se limpian al preparar una nueva apertura.

La biblioteca reúne metadatos de proyectos guardados en PDF/Writer, archivos de Slides/Data/Publisher y el último libro de Sheets. Permite buscar, filtrar y reabrir. Al cambiar de editor, PDF/Writer guardan proyecto y sesión; Sheets conserva el libro; los otros editores guardan su archivo nativo. Las preferencias y documentos de cada editor mantienen sus identidades originales.

Los editores web del mismo origen comparten sus bibliotecas con Prisma. Las aplicaciones nativas tienen perfiles separados: Prisma no puede acceder automáticamente al almacenamiento privado de los APK/EXE independientes. Exporta el documento o proyecto desde la aplicación original y ábrelo en Prisma. La biblioteca de Sheets se indexa al usar la versión nueva del editor. No hay sincronización entre dispositivos. Mantén también copias descargadas.

Instalación y actualización pertenecen a Prisma cuando se usa el paquete general, incluso dentro de Writer o PDF. Los paquetes sueltos mantienen sus actualizaciones propias. El mismo código se utiliza en web/PWA, Android y Windows; compartir, imprimir e instalar utilizan las funciones disponibles en cada plataforma.

## Orden de desarrollo acordado

1. Completar nuestros propios equivalentes de Office, aplicación por aplicación: Writer/PDF, Sheets, Slides, Data y Publisher. La prioridad es edición, diseño, revisión, automatización y fidelidad de intercambio con archivos originales de Office. OneNote y Outlook siguen pendientes de una definición y desarrollo propios.
2. Para cada función, comparar un archivo original y el archivo exportado, verificar contenido y partes preservadas y revisar visualmente el resultado. Un motor que abre archivos o conserva XML no equivale a todo Office.
3. Después de cubrir la base de cada aplicación, revisar los repositorios aportados como referencias adicionales de funciones y mejoras: GenOffice, ONLYOFFICE, Euro-Office, Stirling PDF, word-sys, PDFCraft, OpenProject, los proyectos de diccionarios y fuentes. Implementar las ideas necesarias con interfaces y motores propios; conservar licencias y atribución cuando se utilizan datos o bibliotecas abiertas. Los conectores locales opcionales existentes no sustituyen la implementación propia.

Consulta [la matriz de Office y limitaciones](README-office-analysis.md), [los formatos](README-office.md) y [las macros Prisma](README-programming.md). El panel global no implica que se haya alcanzado toda la funcionalidad de Microsoft Office.

## Plantillas y diseño

El panel permite elegir una aplicación con búsqueda y filtros, abrirla o comenzar desde una plantilla editable. Writer/PDF tienen informes, cartas y otros documentos; Sheets incluye presupuesto, inventario, gastos y planificación; Slides ofrece presentaciones e informes; Data incluye estructuras de contactos, inventario y tareas; Publisher ofrece cartel, boletín, tríptico, invitación y certificado. Slides y Publisher permiten aplicar cinco paletas de diseño sin reemplazar el contenido. Las aplicaciones independientes muestran sus propias plantillas y créditos de OscarD0823, sin el selector global.

Sheets dispone de «Conservar formato original» para cambiar contenido de celdas sin reconstruir el paquete XLSX/XLSM. Conserva partes desconocidas, estilos y el proyecto VBA para Excel. Cambiar estructura, hojas o formato requiere exportar una copia XLSX. Prisma no ejecuta VBA.
