import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
import {fontFamilies} from '../src/fonts';
test('vendored sources and reference fonts match pinned original hashes and keep license files',()=>{
 for(const root of ['vendor/dictionaries/medict','vendor/dictionaries/odict']){const source=JSON.parse(fs.readFileSync(root+'/SOURCE.json','utf8'));assert.match(source.commit,/^[a-f0-9]{40}$/);for(const file of source.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(root+'/'+file.path)).digest('hex'),file.sha256,file.path);}
 let count=0;for(const entry of fs.readdirSync('public/fonts',{withFileTypes:true})){if(!entry.isDirectory())continue;const sourceFile='public/fonts/'+entry.name+'/SOURCE.json';if(!fs.existsSync(sourceFile))continue;const source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));if(!source.upstream?.match(/ONLYOFFICE|kiwi0fruit|wachin/))continue;assert.ok(source.files.some((f:any)=>/license|ofl|copyright/i.test(f.file)));for(const file of source.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('public/fonts',entry.name,file.file))).digest('hex'),file.sha256,file.file);count++;}assert.equal(count,13);assert.ok(fontFamilies.length>=94);
});
test('local OCR models have their delivered hashes and use Android-safe uncompressed filenames',()=>{
 const source=JSON.parse(fs.readFileSync('public/ocr/SOURCE.json','utf8'));
 for(const model of source.models){assert.match(model.file,/\.traineddata$/);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/ocr/'+model.file)).digest('hex'),model.sha256);assert.ok(!fs.existsSync('public/ocr/'+model.file+'.gz'));}
});
