import test from 'node:test';import assert from 'node:assert/strict';
import {planPrismaMacro,macroExample} from '../src/prisma-macros';
import {applySheetMacro,sheetMacroSnapshot,replacePresentationText} from '../src/macro-adapters';
import {SheetsBook} from '../src/sheets-core';
import {DataDatabase} from '../src/data-core';import initSql from 'sql.js';
import {createPresentation,presentationEngine as engine,EMU,slideText} from '../src/slides-core';
import {strFromU8,unzipSync} from 'fflate';

test('portable macros preview computations, read prior planned writes and apply one atomic cell batch',()=>{
 const book=new SheetsBook(),snapshot=sheetMacroSnapshot(book),plan=planPrismaMacro(macroExample('sheets'),snapshot,['setCell']);
 assert.equal(book.value('Hoja1',0,0),null);assert.equal(plan.operations.length,5);applySheetMacro(book,plan.operations,plan.revision);assert.equal(book.value('Hoja1',4,0),50);
 const next=planPrismaMacro(JSON.stringify({version:1,name:'Lectura',steps:[{op:'setCell',args:{sheet:'Hoja1',cell:'B1',value:7}},{op:'setCell',args:{sheet:'Hoja1',cell:'B2',value:{add:[{read:'Hoja1!B1'},4]}}}]}),sheetMacroSnapshot(book),['setCell']);assert.equal(next.operations[1].args.value,11);
 assert.throws(()=>applySheetMacro(book,plan.operations,plan.revision),/cambió/);
 const before=sheetMacroSnapshot(book);assert.throws(()=>applySheetMacro(book,[{op:'setCell',args:{sheet:'Hoja1',cell:'A1',value:999}},{op:'setCell',args:{sheet:'No existe',cell:'A1',value:3}}],before.revision));assert.equal(sheetMacroSnapshot(book).revision,before.revision);
 book.set('Hoja1',0,2,"'helllo helllos");book.set('Hoja1',1,2,'=A1+1');applySheetMacro(book,[{op:'replaceText',args:{find:'helllo',replace:'hello',wholeWord:true}}],sheetMacroSnapshot(book).revision);assert.equal(book.value('Hoja1',0,2),'hello helllos');assert.equal(book.input('Hoja1',1,2),'=A1+1');book.destroy();
});
test('macro language bounds loops and rejects Javascript, filesystem, network and polluted objects',()=>{
 const snapshot={revision:'1'};for(const step of [{op:'fetch',args:{url:'https://example.com'}},{op:'eval',args:{source:'1+1'}},{repeat:1001,steps:[]},{log:{divide:[1,0]}}])assert.throws(()=>planPrismaMacro(JSON.stringify({version:1,name:'Test',steps:[step]}),snapshot,['setCell']));
 assert.throws(()=>planPrismaMacro('{"version":1,"name":"Test","steps":[],"__proto__":{}}',snapshot,[]),/permitido/);
 assert.throws(()=>planPrismaMacro(JSON.stringify({version:1,name:'Test',steps:[{repeat:1000,steps:[{repeat:1000,steps:[{log:'x'}]}]}]}),snapshot,[]));
});
test('Prisma presentation replacements span styled runs, leave other words and survive repeated save and duplication',async()=>{
 const opened=await createPresentation(),element=engine.addElement(opened.deck.slides[0],{kind:'textbox',offset:{x:EMU,y:EMU,cx:6*EMU,cy:EMU},paragraphs:[{runs:[{text:'Una i',bold:true,fontFamily:'Carlito',fontSize:24},{text:'dea, ideas.',italic:true,fontFamily:'Carlito',fontSize:24}]}]});
 replacePresentationText(opened,[{op:'replaceText',args:{find:'idea',replace:'proyecto',wholeWord:true}}]);assert.equal(slideText(element),'Una proyecto, ideas.');assert.ok(element.text!.paragraphs[0].runs.some(run=>run.bold&&run.text==='proyecto'));
 engine.duplicateSlide(opened,0);engine.setSlideNotes(opened,0,'Hola, España. 🧪');const first=await engine.savePptx(opened);await engine.savePptx(opened);const last=await engine.savePptx(opened),loaded=await engine.openPptx(last);assert.equal(loaded.deck.slides.length,2);assert.equal(engine.getSlideNotes(loaded.archive,loaded.deck.slides[0].path),'Hola, España. 🧪');
 for(const [path,bytes] of Object.entries(unzipSync(last)))if(path.endsWith('.rels')){const ids=[...strFromU8(bytes).matchAll(/\bId="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,path);}
 assert.equal(unzipSync(first)['ppt/slides/slide1.xml'].length,unzipSync(last)['ppt/slides/slide1.xml'].length);
});
test('SQL macros roll back a failed batch and cannot commit partial changes themselves',async()=>{
 const SQL=await initSql(),db=new DataDatabase(SQL);db.sql('CREATE TABLE prueba (valor INTEGER);');
 assert.throws(()=>db.sql('INSERT INTO prueba VALUES(4); COMMIT; INSERT INTO desconocida VALUES(8);'),/transacción/);assert.equal(db.snapshot('prueba').count,0);
 assert.throws(()=>db.sql('INSERT INTO prueba VALUES(4); INSERT INTO desconocida VALUES(8);'));assert.equal(db.snapshot('prueba').count,0);db.sql("INSERT INTO prueba VALUES(5); SELECT 'COMMIT; --' AS texto;");assert.equal(db.snapshot('prueba').count,1);db.close();
});
