import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require=createRequire(import.meta.url);
const sharp=require(require.resolve('sharp',{paths:['C:/Users/odcon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
mkdirSync('public/icons',{recursive:true});
for (const size of [192,512,1024]) await sharp('public/logo.svg').resize(size,size).png().toFile(`public/icons/prisma-${size}.png`);
console.log('Logo PNG exportado en 192, 512 y 1024 px.');
