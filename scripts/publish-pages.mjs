import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const products=JSON.parse(fs.readFileSync('products.json','utf8'));
const selection=process.argv.slice(2);
if(selection.some(kind=>!Object.hasOwn(products,kind)))throw Error('Aplicación desconocida.');
for(const[kind,product]of Object.entries(products)){
 if(selection.length&&!selection.includes(kind))continue;
 const result=spawnSync(process.platform==='win32'?'gh.exe':'gh',['workflow','run','pages.yml','--repo','OscarD0823/'+product.siteSlug],{stdio:'inherit'});
 if(result.status!==0)throw Error('No se pudo iniciar la publicación de '+product.name+'.');
 console.log('Publicación solicitada: '+product.name+' → https://oscard0823.github.io/'+product.siteSlug+'/');
}
