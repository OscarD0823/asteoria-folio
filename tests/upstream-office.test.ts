import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {unzipSync,zipSync,strToU8,strFromU8} from 'fflate';
import {importOfficeDocx} from '../src/document-import';
import {preserveOfficeDocx} from '../src/office-engines';
import {Document,Packer} from 'docx';
Object.assign(globalThis,{DOMParser});
async function original(){
 const parts=unzipSync(new Uint8Array(await Packer.toBuffer(new Document({sections:[{children:[]}]}))));
 parts['word/document.xml']=strToU8(strFromU8(parts['word/document.xml']).replace('<w:body>','<w:body><w:p><w:r><w:t>Hola original</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>'));
 parts['word/footnotes.xml']=strToU8('<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="1"><w:p><w:r><w:t>Nota original</w:t></w:r></w:p></w:footnote></w:footnotes>');
 parts['customXml/unknown.xml']=strToU8('<datos>Conservar exactamente</datos>');
 return zipSync(parts);
}
test('Prisma keeps an unedited DOCX byte identical and unknown parts through a text edit',async()=>{
 const bytes=await original(),{flow}=await importOfficeDocx(bytes);
 for(const node of flow.content.content??[])node.attrs={...node.attrs,page:1,indexLevel:1,indexLeader:'dots'};
 assert.deepEqual(await preserveOfficeDocx(flow),bytes);
 const node=flow.content.content?.find(p=>p.content?.some(r=>r.text==='Hola original'));
 assert.ok(node);node.content![0].text='Hola modificado';
 const result=await preserveOfficeDocx(flow);assert.ok(result,JSON.stringify({anchors:flow.officeOriginal?.anchors,nodes:flow.officeOriginal?.nodes,current:flow.content.content}));
 const parts=unzipSync(result);
 assert.match(strFromU8(parts['word/document.xml']),/Hola modificado/);
 assert.deepEqual(parts['customXml/unknown.xml'],unzipSync(bytes)['customXml/unknown.xml']);
 assert.deepEqual(parts['word/footnotes.xml'],unzipSync(bytes)['word/footnotes.xml']);
 assert.match(strFromU8(parts['word/document.xml']),/footnoteReference/);
});
test('Word note edits are saved and structural changes request the normal export path',async()=>{
 const {flow}=await importOfficeDocx(await original());
 assert.equal(flow.officeOriginal?.footnotes[0].text,'Nota original');
 flow.officeOriginal!.edits={footnotes:[{...flow.officeOriginal!.footnotes[0],text:'Nota corregida'}]};
 const bytes=await preserveOfficeDocx(flow);assert.ok(bytes);
 assert.match(strFromU8(unzipSync(bytes)['word/footnotes.xml']),/Nota corregida/);
 flow.content.content!.push({type:'paragraph',content:[{type:'text',text:'Nueva estructura'}]});
 assert.equal(await preserveOfficeDocx(flow),undefined);
});
