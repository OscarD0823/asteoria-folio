# Prisma PDF

[Usar la aplicación](https://oscard0823.github.io/prisma-pdf/) · [Prisma completo](https://oscard0823.github.io/prisma/)

Editor PDF local y privado. Gratuito, instalable y con archivos procesados en el dispositivo. Autor: [OscarD0823](https://github.com/OscarD0823).

Este repositorio contiene el código propio del programa en `src/` y sus pruebas en `tests/`. Los motores compartidos y el entorno se mantienen en [prisma](https://github.com/OscarD0823/prisma). El editor independiente y el de la suite usan estos mismos módulos; no hay una copia que editar por separado.

## Desarrollo

Con Node 22 y pnpm 11: `pnpm dev`, `pnpm build`, `pnpm test`. El lanzador enlaza este repositorio con el entorno Prisma y clona las aplicaciones necesarias. También puedes abrir `prisma.code-workspace` desde el repositorio general y editar todos los programas juntos. `PRISMA_WORKSPACE_ROOT` selecciona un entorno existente.

Confirma los cambios con Git y ejecuta `pnpm publish:pages`: publica el programa y solicita la publicación de Prisma. Un push directo publica este programa; Prisma comprueba cambios automáticamente cada 15 minutos, sujeto al tiempo de cola de GitHub Actions. No se necesitan tokens adicionales para la comprobación periódica.

## Distribución y compatibilidad

[Windows y Android 6.6.0](https://github.com/OscarD0823/prisma-pdf/releases/tag/v6.6.0). Los instaladores existentes conservan sus identidades y rutas de actualización. La compilación de nuevos instaladores se realiza desde el entorno común.

La compatibilidad con Office es parcial; consulta [el estado y los pendientes](https://github.com/OscarD0823/prisma/blob/main/docs/ESTADO-Y-PENDIENTES.md). No se ejecuta VBA completo ni se promete reproducir todos los formatos propietarios.

## Procedencia y licencia

Código trasladado desde `OscarD0823/prisma-pdf`, commit `a742c87ddd8e51ece4601c4acb80d4d756482cd2`; su historia anterior sigue disponible allí. Licencia AGPL-3.0-or-later. Los recursos de terceros conservan sus avisos en el repositorio del entorno. No se incluyen archivos privados de usuarios.
