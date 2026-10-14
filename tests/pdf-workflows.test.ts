import test from 'node:test';import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {processPdfWorkflow,inspectPdfFields} from '@prisma/pdf/pdf-workflows';
import {appendPdf,emptyWorkspace,buildPdf} from '@prisma/pdf/pdf';
async function fixture(){const pdf=await PDFDocument.create();for(let i=1;i<=8;i++)pdf.addPage([300+i,400]);pdf.setTitle('Original');const form=pdf.getForm(),field=form.createTextField('Nombre');field.setText('Óscar');field.addToPage(pdf.getPage(0),{x:20,y:40,width:180,height:24});return pdf.save();}
test('PDF workflows reverse, impose and divide pages with expected dimensions and counts',async()=>{
 const bytes=await fixture(),file=new File([bytes],'prueba.pdf',{type:'application/pdf'});
 const reversed=await PDFDocument.load(await processPdfWorkflow('reverse',[file],{}));assert.equal(reversed.getPage(0).getWidth(),308);assert.equal(reversed.getPage(7).getWidth(),301);
 assert.equal(reversed.getForm().getFields().length,0);assert.ok(reversed.getPage(7).node.Contents());
 const nup=await PDFDocument.load(await processPdfWorkflow('nup',[file],{pagesPerSheet:4,pageSize:'A4'}));assert.equal(nup.getPageCount(),2);
 const divided=await PDFDocument.load(await processPdfWorkflow('divide',[file],{divisionType:'grid-2x2'}));assert.equal(divided.getPageCount(),32);
 const booklet=await PDFDocument.load(await processPdfWorkflow('booklet',[file],{}));assert.equal(booklet.getPageCount(),4);
});
test('Form values survive the editor and can be filled, flattened, and metadata edited',async()=>{
 const bytes=await fixture(),state=await appendPdf(emptyWorkspace(),bytes,'prueba.pdf');assert.deepEqual(await buildPdf(state),bytes);
 assert.equal((await inspectPdfFields(bytes))[0].value,'Óscar');
 const file=new File([bytes],'formulario.pdf',{type:'application/pdf'});
 const filled=await processPdfWorkflow('forms',[file],{fields:[{fieldName:'Nombre',value:'Ana'}]});assert.equal((await inspectPdfFields(filled))[0].value,'Ana');
 const metadata=await PDFDocument.load(await processPdfWorkflow('metadata',[file],{metadata:{title:"ASTEORIA",author:'Persona'}}));assert.equal(metadata.getTitle(),"ASTEORIA");assert.equal(metadata.getAuthor(),'Persona');
 const flattened=await processPdfWorkflow('flatten',[file],{});assert.equal((await inspectPdfFields(flattened)).length,0);
 const choices=await PDFDocument.load(bytes),dropdown=choices.getForm().createDropdown('Categoría');dropdown.addOptions(['A','B']);dropdown.select('A');dropdown.addToPage(choices.getPage(0),{x:20,y:80,width:120,height:25});const clear=await processPdfWorkflow('forms',[new File([new Uint8Array(await choices.save())],'opciones.pdf')],{fields:[{fieldName:'Categoría',value:''}]});assert.equal((await PDFDocument.load(clear)).getForm().getDropdown('Categoría').getSelected().length,0);
});
