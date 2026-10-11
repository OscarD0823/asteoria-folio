import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {setFontLoader} from '../src/fonts';import {buildFlowPdf,defaultLayout} from '../src/flow';import {nativeOperation,type Inspection} from '../src/native-core';
setFontLoader(async file=>new Uint8Array(await readFile('public/fonts/'+file)));
test('local emoji fallback renders unsupported technical emoji and keeps punctuation and copyable Unicode',async()=>{
 const bytes=await buildFlowPdf({layout:defaultLayout(),content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Hola, documento. 🧪 🚀'}]}]}}),result=await nativeOperation({action:'inspect',bytes,index:0}) as Inspection;const text=result.objects.map(object=>object.text??'').join('');assert.match(text,/Hola, documento\./);assert.ok(text.includes('🧪'),JSON.stringify(result.objects.map(object=>object.text)));assert.ok(text.includes('🚀'));
});
