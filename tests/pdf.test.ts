import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { appendPdf, buildPdf, demoWorkspace, emptyWorkspace, type Mark, uid } from '@prisma/pdf/pdf';

const mark=(patch:Partial<Mark>={}):Mark=>({id:uid(),type:'text',x:60,y:420,width:280,height:28,color:'#183e3b',size:18,text:'Revisión aprobada: acción, año, café.',viewRotation:0,...patch});
test('preserves pages, applies marks, reorders, duplicates and extracts a page',async()=>{
  const original=await demoWorkspace();
  const state={...original,pages:[{...original.pages[2],marks:[mark()]},original.pages[0],{...original.pages[0],id:uid(),marks:[mark({type:'highlight',text:undefined,x:48,y:166,width:330,height:34,color:'#ffce54'})]}]};
  const bytes=await buildPdf(state);const doc=await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(),3);assert.equal(doc.getTitle(),'Propuesta de proyecto');
  const extraction=await buildPdf(state,[state.pages[1].id]);assert.equal((await PDFDocument.load(extraction)).getPageCount(),1);
  mkdirSync('qa',{recursive:true});writeFileSync('qa/integrity.pdf',bytes);writeFileSync('qa/input.pdf',original.sources[0].bytes);
});
test('merges actual documents while keeping source order',async()=>{
  const a=await demoWorkspace();const second=await PDFDocument.create();second.addPage([400,300]);
  const merged=await appendPdf(a,await second.save(),'Segundo.pdf');
  assert.equal(merged.pages.length,4);assert.equal(merged.sources.length,2);
  const result=await PDFDocument.load(await buildPdf(merged));assert.deepEqual(result.getPages()[3].getSize(),{width:400,height:300});
});
test('rejects corrupted input, empty exports and unsupported characters',async()=>{
  await assert.rejects(()=>appendPdf(emptyWorkspace(),new Uint8Array([0,1,2]),'inválido.pdf'));
  await assert.rejects(()=>buildPdf(emptyWorkspace()),/al menos una página/);
  const a=await demoWorkspace();a.pages[0].marks.push(mark({text:'Hola 😀'}));await assert.rejects(()=>buildPdf(a),/caracteres no compatibles/);
});
test('annotations use the correct coordinate system for every original rotation and crop box',async()=>{
  let state=emptyWorkspace();
  for(const originalRotation of [0,90,180,270]){
    const source=await PDFDocument.create();const p=source.addPage([400,500]);p.setCropBox(20,30,340,430);p.setRotation(degrees(originalRotation));const font=await source.embedFont(StandardFonts.Helvetica);p.drawText('Original',{font,size:12,x:40,y:400});
    state=await appendPdf(state,await source.save(),`Rotación ${originalRotation}.pdf`);
    const original=state.pages.at(-1)!;
    state.pages=state.pages.slice(0,-1);
    for(const change of [0,90,180,270])state.pages.push({...original,id:uid(),rotation:change,marks:[mark({type:'highlight',text:undefined,x:30,y:40,width:90,height:25,color:'#ff0000'}),mark({x:140,y:40,text:`${originalRotation} + ${change}`,width:150,height:22,size:13})]});
  }
  const bytes=await buildPdf(state);const result=await PDFDocument.load(bytes);assert.equal(result.getPageCount(),16);
  for(let i=0;i<16;i++){assert.equal(result.getPages()[i].getRotation().angle,(([0,90,180,270][Math.floor(i/4)]+[0,90,180,270][i%4])%360));assert.deepEqual(result.getPages()[i].getCropBox(),{x:20,y:30,width:340,height:430});}
  mkdirSync('qa',{recursive:true});writeFileSync('qa/rotations.pdf',bytes);
});
