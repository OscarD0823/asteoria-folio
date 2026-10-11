import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {buildFlowDocument,defaultLayout,type RichNode} from '../src/flow';import {setFontLoader} from '../src/fonts';import * as mupdf from 'mupdf';
setFontLoader(async name=>new Uint8Array(fs.readFileSync('public/fonts/'+name)));
test('filas largas y celdas combinadas continúan entre páginas sin perder texto',async()=>{
 const lines=Array.from({length:100},(_,i)=>`RegistroUnico${String(i).padStart(3,'0')} contenido de la fila`);
 const paragraph=(text:string):RichNode=>({type:'paragraph',attrs:{fontSize:12,fontFamily:'PrismaSans'},content:[{type:'text',text}]});
 const cell=(text:string,rowspan=1):RichNode=>({type:'tableCell',attrs:{colspan:1,rowspan},content:[paragraph(text)]});
 const flow={content:{type:'doc',content:[{type:'table',content:[{type:'tableRow',content:[{type:'tableHeader',content:[paragraph('Identificador')]},{type:'tableHeader',content:[paragraph('Descripción')]}]},{type:'tableRow',content:[cell('Celda combinada',2),cell(lines.join(' '))]},{type:'tableRow',content:[cell('Fila final')]}]}]},layout:defaultLayout()};
 const result=await buildFlowDocument(flow),doc=mupdf.Document.openDocument(result.bytes,'application/pdf');assert.ok(doc.countPages()>1);let text='';for(let i=0;i<doc.countPages();i++)text+=doc.loadPage(i).toStructuredText("preserve-whitespace").asText();for(const token of lines.map(l=>l.split(' ')[0]))assert.equal(text.split(token).length-1,1,token);assert.match(text,/Fila final/);
});

