# Prisma PDF 2.0

Editor web de PDF en español con procesamiento exclusivo en el navegador.

## Uso

Abrir PDF permite seleccionar y sustituir líneas del texto original. Selecciona una línea, modifica sus palabras y pulsa Aplicar edición. MuPDF elimina el contenido anterior, y pdf-lib añade el reemplazo como texto seleccionable. No se trata de tapar el texto con un rectángulo.

En Imágenes originales, selecciona una imagen y pulsa Habilitar movimiento. El original se elimina y se convierte a un elemento PNG que puedes arrastrar, redimensionar o borrar. Las imágenes añadidas admiten PNG, JPEG y WebP; la firma es un dibujo, no una firma certificada.

Incluye texto añadido, negrita/cursiva, fuentes Sans/Serif/Mono, color, posición, tamaño, opacidad, orden de elementos, resaltado, dibujo, subrayado, tachado, formas, flechas y eliminación real por área. Puedes unir PDF, extraer rangos, reordenar, girar, duplicar, eliminar y añadir páginas. También numerar, poner una marca de agua, convertir imágenes a páginas PDF, descargar una página como PNG y optimizar sin reducir calidad.

## Privacidad

El servidor sirve exclusivamente código y recursos estáticos de la aplicación. Los archivos elegidos nunca se envían por fetch, formularios, APIs ni telemetría. La lectura usa File.arrayBuffer; las operaciones se realizan en memoria y en un Web Worker local con MuPDF WASM. PDF.js usa recursos y fuentes alojados junto a la aplicación, sin CDN ni fuentes externas.

La sesión actual se guarda automáticamente en IndexedDB (`prisma-pdf-local-v2`), en el perfil del navegador y en este origen. Solo se guarda el estado vigente, no el historial de deshacer. Al volver a abrir la página, se recupera la sesión. En Guía y privacidad, Borrar sesión local cierra el documento y borra esta copia. Los PDF descargados pertenecen al usuario y no se borran con esa acción. Borrar los datos del navegador, cambiar de navegador o usar modo privado puede eliminar o impedir la recuperación. No hay sincronización en la nube.

La primera apertura web descarga el código y los recursos de la aplicación. Un service worker guarda únicamente esos recursos estáticos en Cache Storage y permite abrir el editor sin conexión cuando termina la descarga. Nunca incluye documentos del usuario. Android y Windows incluyen los recursos en el instalador y funcionan localmente desde el primer inicio. La versión Android no solicita permiso de Internet y deshabilita la copia de seguridad de los datos del editor.

## Instalar

- Web pública: https://oscard0823.github.io/prisma-pdf/
- APK y EXE: https://github.com/OscarD0823/prisma-pdf/releases/latest
- Android PWA: abre la web en Chrome y elige Instalar aplicación.
- PC PWA: abre la web en Chrome/Edge y usa el icono de instalación.
- iPhone/iPad: en Safari, Compartir y Añadir a pantalla de inicio.
- Windows: ejecuta el instalador EXE para agregar la aplicación al menú Inicio.
- APK: instalación directa en Android 7 o posterior, con un Android System WebView actualizado. No se requiere una cuenta ni un servidor.

En Android, Descargar abre el menú del sistema para guardar o compartir el archivo creado localmente. Los archivos temporales quedan en la caché privada y se borran con Borrar sesión local. La aplicación Windows abre el diálogo de guardar. El instalador Windows no tiene un certificado comercial de firma de código.

## Límites

- Texto real horizontal, por línea. No hay OCR para texto dentro de escaneos. Fuentes originales se aproximan con Helvetica, Times o Courier; las líneas con estilos mixtos usan el estilo del primer carácter. Revisa espaciado y saltos. Letras latinas y signos comunes; no emojis.
- Texto intrínsecamente vertical o girado se puede eliminar por área y reemplazar manualmente. Las rotaciones añadidas en el editor conservan las coordenadas.
- Las imágenes originales se convierten a PNG al moverlas (máximo 2200 px por lado); imágenes superpuestas dentro de la misma región pueden requerir borrado manual. No se editan elementos vectoriales individuales.
- Formularios, enlaces, adjuntos, marcadores y firmas certificadas no tienen herramientas específicas. Copiar o editar páginas puede perder formularios interactivos e invalidar firmas.
- Hasta 100 MB de archivos originales por apertura/unión; el procesamiento puede requerir bastante memoria según el PDF. Optimizar es sin pérdida y no garantiza reducción.
- Borrar por área elimina objetos y puede afectar contenido que toca el rectángulo. Revisa el PDF exportado. Deshacer y el original local permiten recuperar contenido antes de cerrar.

## Desarrollo

Node.js 22 o posterior, pnpm y `tar` disponible en PATH:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
pnpm desktop:build
pnpm android:sync
```

`prepare-assets.mjs` copia los recursos originales de PDF.js y MuPDF al directorio público. `package-source.mjs` crea un archivo de código fuente para los visitantes, sin documentos, caché del navegador, credenciales, QA ni metadatos Git. En producción se sirve `dist/`. La configuración privada de Sites se conserva en `.openai/hosting.json` y no se incluye en la descarga del código.

El proyecto Android está en `android/`, usa SDK 36 y un JDK 21 para compilar sus plugins. Tras `pnpm android:sync`, ejecuta `android/gradlew assembleRelease` para generar un APK sin firmar. En Windows, `scripts/build-android.ps1` crea y reutiliza una clave de firma fuera del proyecto, con la contraseña protegida mediante Windows DPAPI. La clave y la contraseña nunca se suben al repositorio. Guarda una copia privada de esa carpeta para poder firmar actualizaciones con la misma identidad.

GitHub Pages se publica automáticamente con `.github/workflows/pages.yml`. Ningún flujo de publicación incluye los PDF del usuario.

## Verificación

Pruebas reales de lectura y exportación: sustitución de texto original sin borrar la línea vecina, extracción y movimiento de imagen original, borrado por área, optimización, páginas rotadas y recortadas, rangos, unión, reordenado, duplicación y conservación del contenido.

## Licencia

Prisma PDF se distribuye bajo AGPL-3.0-or-later para compatibilidad con MuPDF. Consulta LICENSE y public/licencias.txt. El archivo de código fuente descargable contiene el editor, sus instrucciones de compilación y el archivo de versiones exactas. MuPDF.js/WASM se distribuye sin modificaciones; su fuente y construcción están enlazadas en las licencias. No hay garantía.
