import test from 'node:test';import assert from 'node:assert/strict';import {DOMParser} from '@xmldom/xmldom';import {Document,Paragraph,TextRun,Packer} from 'docx';import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
import {importOfficeDocx} from '../src/document-import';
Object.assign(globalThis,{DOMParser});
test('una fuente de escritura compleja no reemplaza la fuente latina heredada de Word',async()=>{
 const original=new Uint8Array(await Packer.toArrayBuffer(new Document({sections:[{children:[new Paragraph({children:[new TextRun('Fuente heredada')]} )]}]}))),parts=unzipSync(original);
 parts['word/styles.xml']=strToU8('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="480" w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>');
 parts['word/document.xml']=strToU8(strFromU8(parts['word/document.xml']).replace('<w:r>','<w:r><w:rPr><w:rFonts w:cs="Arial"/></w:rPr>'));
 const {flow}=await importOfficeDocx(zipSync(parts)),p=flow.content.content![0],run=p.content![0];assert.equal(p.attrs!.fontFamily,'PrismaSerif');assert.equal(p.attrs!.lineHeight,2);assert.equal(p.attrs!.spaceAfter,0);assert.equal(run.marks!.find(m=>m.type==='textStyle')!.attrs!.fontFamily,'PrismaSerif');
});
