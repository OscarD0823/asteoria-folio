import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const alias={};
for(const [name,entry] of [['docx-engine','index'],['pptx-engine','index'],['pptx-engine/custgeom','custgeom'],['zip-gate','index'],['agent-core/redact-range','redact-range']]){
 const [pkg]=name.split('/');alias['@genoffice/'+name]=resolve('vendor/genoffice/packages/'+pkg+'/src/'+entry+'.ts');
}
mkdirSync('vendor/pdfcraft/dist',{recursive:true});
const pdfcraftPlugin={name:'pdfcraft-local-adapters',setup(api){
 api.onResolve({filter:/^\.\/validation$/},args=>args.importer.endsWith('processor.ts')?{path:resolve('vendor/pdfcraft/validation.ts')}:undefined);
 api.onResolve({filter:/^\.\.\/loader$/},()=>({path:resolve('vendor/pdfcraft/loader.ts')}));
}};
await build({entryPoints:['vendor/pdfcraft/entry.ts'],bundle:true,platform:'browser',format:'esm',outfile:'vendor/pdfcraft/dist/index.mjs',target:'es2022',legalComments:'inline',alias:{'@/types/pdf':resolve('vendor/pdfcraft/src/types/pdf.ts')},plugins:[pdfcraftPlugin],packages:'external'});
writeFileSync('vendor/pdfcraft/dist/index.d.mts','declare const engine: any; export = engine;\n');
console.log('PDFCraft local processors generated.');
const browserPlugin={name:'prisma-browser-engines',setup(api){
 api.onResolve({filter:/^node:(?:fs(?:\/promises)?|stream\/promises)$/},args=>({path:args.path,namespace:'prisma-node-stub'}));
 api.onLoad({filter:/.*/,namespace:'prisma-node-stub'},()=>({contents:`const unavailable=()=>{throw new Error('Esta operación requiere el motor local de PC.');};export {unavailable as open,unavailable as createWriteStream,unavailable as pipeline};`,loader:'js'}));
}};
for(const name of ['table-grid','identity','background-promote'])alias['@genoffice/pptx-engine/'+name]=resolve('vendor/genoffice/packages/pptx-engine/src/'+name+'.ts');
alias['@genoffice/pptx-render']=resolve('vendor/genoffice/packages/pptx-render/src/index.ts');
await build({entryPoints:['vendor/genoffice/entry-render.ts'],bundle:true,platform:'browser',format:'esm',outfile:'vendor/genoffice/dist/render.mjs',target:'es2022',alias,legalComments:'inline'});
writeFileSync('vendor/genoffice/dist/render.d.mts','declare const engine: any; export = engine;\n');
mkdirSync('vendor/genoffice/dist',{recursive:true});
for(const [name,entry] of [['docx','docx-engine'],['pptx','pptx-engine']]){
 const common={entryPoints:[name==='docx'?'vendor/genoffice/entry-docx.ts':'vendor/genoffice/packages/'+entry+'/src/index.ts'],bundle:true,alias,logLevel:'warning',target:'es2022',legalComments:'inline'};
 await build({...common,platform:'browser',format:'esm',outfile:'vendor/genoffice/dist/'+name+'.mjs',inject:['vendor/browser/inject.ts'],alias:{...alias,'node:crypto':resolve('vendor/browser/crypto.ts'),'node:zlib':resolve('vendor/browser/zlib.ts')},plugins:[browserPlugin]});
 await build({...common,platform:'node',format:'cjs',outfile:'vendor/genoffice/dist/'+name+'.cjs'});
 writeFileSync('vendor/genoffice/dist/'+name+'.d.mts','declare const engine: any; export = engine;\n');
 console.log('GenOffice '+name+': browser and local-PC bundles generated.');
}
