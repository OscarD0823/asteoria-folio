# Instalar Prisma y trabajar sin conexión

Cada web es una aplicación instalable independiente:

- [Prisma PDF](https://oscard0823.github.io/prisma-pdf/)
- [Prisma Writer](https://oscard0823.github.io/prisma-writer/)
- [Prisma Sheets](https://oscard0823.github.io/prisma-sheets/)
- [Prisma Slides](https://oscard0823.github.io/prisma-slides/)
- [Prisma Data](https://oscard0823.github.io/prisma-data/)
- [Prisma Publisher](https://oscard0823.github.io/prisma-publisher/)
- [Prisma, aplicación general](https://oscard0823.github.io/prisma/)

Pulsa **Instalar app**. En Chrome/Edge, cuando el navegador ofrece la instalación, aparece un botón para abrir su diálogo. También se muestran las instrucciones para Android, Windows, Linux, iPhone/iPad y Mac. La disponibilidad depende del navegador; Firefox de escritorio no instala PWAs mediante el manifiesto. [Documentación de instalación de MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

Los siete manifiestos tienen identidad, ámbito e iconos propios, incluidos iconos adaptables de 512 px y acceso para iOS. Los ámbitos resuelven sus recursos mediante rutas relativas, también en GitHub Pages. Prisma incluye los seis editores; las otras instalaciones son independientes.

## Recursos sin conexión

Las páginas de los editores y Prisma comparten la descarga de fuentes y diccionarios desde el mismo sitio; cada PWA conserva su caché y sus documentos independientes. Los paquetes Android y Windows contienen todos los recursos.

La primera apertura prepara el editor, los motores de PDF, el corrector de español y las fuentes esenciales. Las demás fuentes se descargan al usarlas y quedan disponibles localmente. En **Instalar app → Descargar todo para usar sin conexión** se puede preparar toda la biblioteca. El indicador muestra los archivos realmente presentes, la descarga y los errores de conexión o espacio disponible. El botón permite reintentar sin perder lo descargado.

Las actualizaciones reutilizan recursos con el mismo SHA-256 y conservan las fuentes opcionales descargadas que no han cambiado. Una descarga opcional fallida no bloquea la instalación del editor. Una actualización cuyo recurso esencial falla no sustituye el trabajador activo anterior. Se conserva una caché anterior para las pestañas que todavía usan sus recursos.

El service worker únicamente guarda recursos de aplicación incluidos en el inventario de compilación. Los documentos y diccionarios personales se guardan mediante IndexedDB, fuera de la caché de recursos. No existe un servidor de documentos. Las comprobaciones de versión consultan datos públicos, sin adjuntar archivos del usuario.

La preparación debe terminar con conexión antes de depender de ella. Si el navegador borra los datos del sitio o recupera espacio, habrá que repetirla. Las versiones APK/EXE incluyen todos los recursos. Los proyectos y el diccionario se pueden exportar como respaldo para trasladarlos a otro dispositivo; las apps nativas tienen almacenamiento separado.

## Diccionario personal

En Writer/PDF: **Revisar → Ortografía → Diccionario personal**. Permite términos, definiciones, búsqueda, edición, eliminación e importación/exportación. Acepta TXT/TSV (término y definición separados por tabulación) y JSON propio de Prisma. Hasta 5.000 entradas, 2 MB por importación, 120 caracteres por término y 1.000 por definición. La importación se valida completamente antes de guardar. Los duplicados conservan su definición si la entrada nueva no aporta otra.

La búsqueda omite diferencias de mayúsculas y tildes. La lista que acepta el corrector conserva las tildes y únicamente admite palabras, evitando confundir «si» con «sí». Las definiciones se muestran como texto, nunca como HTML. El diccionario se comparte entre las webs del mismo origen y perfil de navegador; los entornos que separan el almacenamiento requieren importar una copia. No se incorporaron bases de definiciones de terceros ni soporte MDX/StarDict en esta entrega.

## Fuentes en Sheets

Sheets utiliza la biblioteca compartida: búsqueda, categorías, favoritas, recientes y vista previa. XLSX conserva los nombres de fuentes; las previsualizaciones y PDF resuelven los nombres conocidos a los archivos incluidos. Calibri → Carlito, Cambria → Caladea, Arial → Arimo, Times New Roman → Liberation Serif, Courier New → Liberation Mono y Georgia → Gelasio. Son alternativas y pueden cambiar el diseño. Las fuentes desconocidas conservan su nombre y utilizan la fuente instalada o una alternativa para la vista previa. XLSX no incorpora los archivos de fuentes.

## Comprobación

Las pruebas automatizadas cubren instalación temprana y eventos de un solo uso, reutilización de recursos, descargas opcionales, fallos de cuota y reintento, actualizaciones incompletas, exclusión de archivos privados, importación local atómica, persistencia, Unicode y correspondencia de nombres tipográficos en XLSX/PDF. La instalación final debe probarse en el navegador y sistema de destino; una comprobación del manifiesto no equivale a instalar físicamente la aplicación.
