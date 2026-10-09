import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PDFDocument,StandardFonts,degrees} from 'pdf-lib';
import {nativeOperation,loadNativeEngine,type Inspection} from '../src/native-core';
import {appendPdf,emptyWorkspace,buildPdf,demoWorkspace,pageRange,uid} from '../src/pdf';
const inspect=async(bytes:Uint8Array,index=0)=>(await nativeOperation({action:'inspect',bytes,index})) as Inspection;
test('replace real source text, preserve adjacent lines and export selectable replacement',async()=>{
  const original=await demoWorkspace(),source=original.sources[0];
  const before=await inspect(source.bytes),line=before.objects.find(o=>o.text==='Las buenas ideas')!;
  assert.ok(line?.editable);
  const edited=await nativeOperation({action:'remove',bytes:source.bytes,index:0,objectId:line.id}) as Uint8Array;
  const after=await inspect(edited),texts=after.objects.map(o=>o.text).join('\n');
  assert.ok(!texts.includes('Las buenas ideas'));assert.ok(texts.includes('merecen claridad.'));assert.ok(texts.includes('El proyecto'));
  const workspace=await appendPdf(emptyWorkspace(),edited,'Texto editado.pdf');workspace.pages[0].marks.push({id:uid(),type:'text',x:line.x,y:line.baseline!-line.size,width:line.width,height:line.size*1.25,size:line.size,color:line.color,font:line.font,bold:line.bold,text:'Las mejores ideas',viewRotation:0});
  const output=await buildPdf(workspace),finalText=(await inspect(output)).objects.map(o=>o.text).join('\n');assert.ok(finalText.includes('Las mejores ideas'));assert.ok(!finalText.includes('Las buenas ideas'));
  await mkdir('qa',{recursive:true});await writeFile('qa/native-text.pdf',output);
});
test('extract and move an original image while preserving surrounding text',async()=>{
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),image=await doc.embedPng(await readFile('public/icons/prisma-192.png')),p=doc.addPage([400,400]);p.drawText('Texto que se conserva',{x:20,y:360,font,size:14});p.drawImage(image,{x:30,y:200,width:80,height:80});
  const bytes=await doc.save(),object=(await inspect(bytes)).objects.find(o=>o.kind==='image')!;assert.ok(object.data?.startsWith('data:image/png;base64,'));assert.equal(object.x,30);assert.equal(object.y,120);
  const m=await loadNativeEngine(),png=new m.Image(new Uint8Array(Buffer.from(object.data!.split(',')[1],'base64'))),pix=png.toPixmap();assert.equal(pix.getAlpha(),1);assert.equal(pix.getPixels()[3],0,'transparent corners are preserved');pix.destroy();png.destroy();
  const removed=await nativeOperation({action:'remove',bytes,index:0,objectId:object.id}) as Uint8Array;const removedObjects=(await inspect(removed)).objects;assert.equal(removedObjects.filter(o=>o.kind==='image').length,0);assert.ok(removedObjects.some(o=>o.text==='Texto que se conserva'));
  const workspace=await appendPdf(emptyWorkspace(),removed,'Imagen movida.pdf');workspace.pages[0].marks.push({id:uid(),type:'image',x:200,y:200,width:100,height:100,size:0,color:'#000000',data:object.data,viewRotation:0});const output=await buildPdf(workspace),moved=(await inspect(output)).objects.find(o=>o.kind==='image')!;assert.ok(Math.abs(moved.x-200)<.1);assert.ok(Math.abs(moved.y-200)<.1);await writeFile('qa/native-image.pdf',output);
});
test('area removal deletes content rather than masking it and optimization preserves words',async()=>{
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),p=doc.addPage([300,300]);p.drawText('SECRETO',{x:30,y:240,size:20,font});p.drawText('PUBLICO',{x:30,y:170,size:20,font});const bytes=await doc.save();
  const removed=await nativeOperation({action:'redact',bytes,index:0,rect:[20,30,180,80]}) as Uint8Array;const texts=(await inspect(removed)).objects.map(o=>o.text).join(' ');assert.ok(!texts.includes('SECRETO'));assert.ok(texts.includes('PUBLICO'));
  const optimized=await nativeOperation({action:'compress',bytes:removed,index:0}) as Uint8Array;assert.ok((await inspect(optimized)).objects.some(o=>o.text==='PUBLICO'));
});
test('range validation and edited rotated crop export',async()=>{
  assert.deepEqual(pageRange('1-3, 5, 2',5),[0,1,2,4]);assert.throws(()=>pageRange('0, 7',5));assert.throws(()=>pageRange('2-1',5));assert.throws(()=>pageRange('hola',5));
  const doc=await PDFDocument.create(),p=doc.addPage([400,500]),font=await doc.embedFont(StandardFonts.Helvetica);p.setCropBox(25,40,300,400);p.drawText('CROP TEXTO',{x:45,y:380,size:12,font});const bytes=await doc.save();const line=(await inspect(bytes)).objects.find(o=>o.text==='CROP TEXTO')!;const removed=await nativeOperation({action:'remove',bytes,index:0,objectId:line.id}) as Uint8Array;assert.ok(!(await inspect(removed)).objects.some(o=>o.text==='CROP TEXTO'));
  const work=await appendPdf(emptyWorkspace(),removed,'Recorte.pdf');work.pages[0].rotation=90;work.pages[0].marks.push({id:uid(),type:'text',x:line.x,y:line.baseline!-12,width:100,height:15,size:12,color:'#000000',text:'NUEVO TEXTO',viewRotation:0});const out=await buildPdf(work);const final=await PDFDocument.load(out);assert.equal(final.getPage(0).getRotation().angle,90);assert.equal(final.getPage(0).getCropBox().x,25);assert.ok((await inspect(out)).objects.some(o=>o.text==='NUEVO TEXTO'));
});
