import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const languages=[['es','dictionary-es'],['es-CO','dictionary-es-co'],['en','dictionary-en'],['en-GB','dictionary-en-gb'],['fr','dictionary-fr'],['pt','dictionary-pt'],['pt-PT','dictionary-pt-pt'],['de','dictionary-de'],['it','dictionary-it'],['nl','dictionary-nl'],['ca','dictionary-ca']];
const catalog=[];
for(const [id,name] of languages){
 const source=path.dirname(require.resolve(name)),target=path.join('public/spelling',id),pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8'));fs.mkdirSync(target,{recursive:true});const files={};
 for(const file of ['index.aff','index.dic','license']){const bytes=fs.readFileSync(path.join(source,file));fs.writeFileSync(path.join(target,file==='license'?'LICENSE.txt':file),bytes);files[file]=crypto.createHash('sha256').update(bytes).digest('hex');}
 const record={id,package:name,version:pkg.version,license:pkg.license,source:'https://github.com/wooorm/dictionaries/tree/main/dictionaries/'+name.slice('dictionary-'.length),files};fs.writeFileSync(path.join(target,'SOURCE.json'),JSON.stringify(record,null,2));catalog.push(record);
}
fs.writeFileSync('public/spelling/catalog.json',JSON.stringify(catalog,null,2));console.log('11 diccionarios locales preparados con licencias y hashes.');
