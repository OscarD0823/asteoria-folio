import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require=createRequire(import.meta.url);
const base=dirname(require.resolve('pdfjs-dist/package.json'));
mkdirSync('public/pdfjs',{recursive:true});
for(const name of ['cmaps','standard_fonts','wasm'])cpSync(join(base,name),join('public/pdfjs',name),{recursive:true});
const engine=dirname(require.resolve('mupdf'));
mkdirSync('public/engine',{recursive:true});
for(const name of ['mupdf.js','mupdf-wasm.js','mupdf-wasm.wasm'])cpSync(join(engine,name),join('public/engine',name));
mkdirSync('public/third-party',{recursive:true});
for(const dependency of ['mupdf','pdf-lib','pdfjs-dist','react','react-dom','lucide-react','@capacitor/core','@capacitor/android','@capacitor/filesystem','@capacitor/share']){
  const root=dependency==='mupdf'?dirname(engine):dirname(require.resolve(dependency+'/package.json'));
  const license=['LICENSE','LICENSE.md','LICENSE.txt'].map(name=>join(root,name)).find(path=>existsSync(path));
  if(license)cpSync(license,join('public/third-party',dependency.replaceAll('/','-')+'-LICENSE.txt'));
}
