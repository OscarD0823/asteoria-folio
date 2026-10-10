# Tipografías locales de Prisma PDF

Cada subcarpeta contiene los archivos estáticos, la licencia completa y un `SOURCE.json` con revisión, URL y SHA-256. Los archivos adicionales son originales, excepto la instancia TTF regular de Noto Sans SC, cuyo proceso de derivación se documenta en su `DERIVATION.md`. El catálogo `catalog.json` enumera las variantes incluidas. Los archivos de Liberation originales permanecen en esta carpeta.

El CSS carga únicamente archivos del propio sitio, y el exportador PDF incrusta subconjuntos de las fuentes usadas, salvo Noto Sans SC, que se incrusta completa para evitar pérdida de glifos con Fontkit 1.1.1. Un PDF que use esta fuente CJK aumenta aproximadamente 6 MiB. La caché de bytes en memoria está limitada a 20 MiB.

Se incluyen 31 familias de fuentes reales, más tres opciones clásicas PDF para mantener la compatibilidad con proyectos anteriores. Algunas familias sólo publican regular o regular/negrita. `fontStyleAvailable` distingue las variantes reales; cuando falta una variante se utiliza la regular o negrita disponible.

Noto Sans/Serif ofrecen latín, griego y cirílico; las familias Noto complementarias amplían la cobertura con símbolos, matemáticas, árabe, hebreo, tailandés, devanagari y CJK simplificado. Noto Sans SC se distribuye como una instancia TTF estática del archivo variable oficial y sólo incluye regular para mantener acotado el tamaño de instalación. La cobertura no comprende todo Unicode ni todos los emoji.

`fontCss` añade respaldos locales para la presentación. `resolveFontRuns` conserva la familia escogida en los caracteres que cubre y selecciona fuentes locales para los restantes. Lanza `UnsupportedGlyphError` si alguna fuente necesaria no existe, de modo que no se exporten glifos ausentes inadvertidamente.

El catálogo ocupa aproximadamente 46,1 MiB en disco y 23,6 MiB al comprimir los archivos individualmente con gzip. No se descargan fuentes de terceros al escribir ni al exportar.
