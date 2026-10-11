import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const products=JSON.parse(fs.readFileSync('products.json','utf8'));
const kind=process.argv[2]??process.env.VITE_PRODUCT;
if(!Object.hasOwn(products,kind))throw Error('Selecciona pdf, writer, sheets, slides, data, publisher o prisma.');
const product=products[kind],output=path.resolve(process.env.PRISMA_OUTDIR||'dist-pages');
if(fs.existsSync(output)&&fs.readdirSync(output).length)throw Error('Usa una carpeta de publicación vacía para '+product.name+'.');
const env={...process.env,VITE_PRODUCT:kind,PRISMA_OUTDIR:output};
const run=(args,overrides={})=>{const result=spawnSync(process.execPath,args,{stdio:'inherit',env:{...env,...overrides}});if(result.status!==0)throw Error('No se pudo completar: '+args.join(' '));};
try {
run(['scripts/bundle-prisma-engines.mjs']);
run(['scripts/prepare-assets.mjs']);
run(['node_modules/typescript/bin/tsc','--noEmit']);
run(['node_modules/vite/bin/vite.js','build','--outDir',output]);
if(kind!=='pdf'){
 fs.cpSync('public/'+kind+'-logo.svg',path.join(output,'logo.svg'));
 fs.cpSync('public/'+kind+'-icons',path.join(output,'icons'),{recursive:true});
}
const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
Object.assign(manifest,{name:product.name,short_name:product.name,description:product.description,id:'./',start_url:'./',scope:'./',categories:['productivity']});
fs.writeFileSync(path.join(output,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
run(['scripts/package-source.mjs']);
run(['scripts/build-offline.mjs']);
} finally {run(['scripts/prepare-assets.mjs'],{VITE_PRODUCT:'pdf'});}
console.log(product.name+' publicada de forma independiente en https://oscard0823.github.io/'+product.siteSlug+'/');
