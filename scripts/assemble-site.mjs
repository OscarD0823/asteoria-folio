import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const products=JSON.parse(fs.readFileSync('products.json','utf8'));
const site=path.resolve(process.env.PRISMA_SITE_OUTDIR||'dist-site');
if(path.basename(site)!=='dist-site')throw Error('La salida debe llamarse dist-site.');
if(process.env.PRISMA_SITE_OUTDIR){if(fs.existsSync(site)&&fs.readdirSync(site).length)throw Error('Usa una carpeta de publicación vacía.');}
else {if(path.dirname(site)!==path.resolve('.'))throw Error('Salida fuera del proyecto.');fs.rmSync(site,{recursive:true,force:true});}
fs.mkdirSync(site,{recursive:true});
for(const kind of Object.keys(products)){
 const output=kind==='pdf'?site:path.join(site,kind),source=fs.realpathSync(kind==='pdf'?'dist':'dist-'+kind);
 fs.cpSync(source,output,{recursive:true,dereference:true});
 if(kind!=='pdf'){
  const html=fs.readFileSync(path.join(output,'index.html'),'utf8').replace('<head>','<head>\n    <meta name="prisma-resource-base" content="../" />').replace('href="./fonts/fonts.css"','href="../fonts/fonts.css"');
  fs.writeFileSync(path.join(output,'index.html'),html);
  for(const folder of ['fonts','spelling'])fs.rmSync(path.join(output,folder),{recursive:true,force:true});
 }
 if(['sheets','slides','data','publisher'].includes(kind))fs.rmSync(path.join(output,'ocr'),{recursive:true,force:true});
 const result=spawnSync(process.execPath,['scripts/build-offline.mjs'],{stdio:'inherit',env:{...process.env,PRISMA_OUTDIR:output,...(kind==='pdf'?{}:{PRISMA_SHARED_ROOT:site})}});if(result.status!==0)throw Error('No se pudo preparar '+kind);
}
console.log('Siete aplicaciones publicables en '+site+'; fuentes y diccionarios compartidos.');
