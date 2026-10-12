import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from '@xmldom/xmldom';
import {strToU8,zipSync} from 'fflate';
import {importDocx} from '../src/document-import';
import {normalizeAcademicDocument} from '../src/academic';
import {plainText} from '../src/flow';
Object.assign(globalThis,{DOMParser});
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const run=(text:string)=>`<w:r><w:t>${text}</w:t></w:r>`;
const p=(text:string)=>`<w:p>${run(text)}</w:p>`;
const field=(kind:string)=>`<w:r><w:fldChar w:fldCharType="${kind}"/></w:r>`;
const heading=(name:string,level=1)=>`<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:bookmarkStart w:id="1" w:name="${name}"/>${run('Título '+level)}<w:bookmarkEnd w:id="1"/></w:p>`;
const doc=(body:string)=>zipSync({'word/document.xml':strToU8(`<w:document xmlns:w="${W}"><w:body>${body}<w:sectPr/></w:body></w:document>`)});
test('Word TOC fields spanning paragraphs become one updating index and do not leave cached entries as prose',()=>{
 const {flow}=importDocx(doc(p('Tabla de contenido')+`<w:p>${field('begin')}<w:r><w:instrText> TO</w:instrText></w:r><w:r><w:instrText>C \\o "1-3" \\h </w:instrText></w:r>${field('separate')}</w:p>`+`<w:p><w:hyperlink w:anchor="_Toc1">${run('Título antiguo')}</w:hyperlink>${field('begin')}<w:r><w:instrText> PAGEREF _Toc1 \\h </w:instrText></w:r>${field('separate')}${run('3')}${field('end')}</w:p>`+`<w:p>${field('end')}</w:p>`+heading('_Toc1')+p('Texto del documento')));
 const blocks=flow.content.content!,index=blocks.find(n=>n.type==='generatedIndex')!;
 assert.equal(blocks.filter(n=>n.type==='generatedIndex').length,1);assert.equal(blocks.filter(n=>plainText(n).includes('Título antiguo')).length,0);assert.equal(index.attrs?.kind,'contents');assert.equal((index.attrs?.entries as any[])[0].targetId,blocks.find(n=>n.type==='heading')!.attrs?.id);
 blocks.find(n=>n.type==='heading')!.content=[{type:'text',text:'Título actualizado'}];
 const normalized=normalizeAcademicDocument(flow.content,[],'free');assert.equal((normalized.content!.find(n=>n.type==='generatedIndex')!.attrs!.entries as any[])[0].label,'Título actualizado');
});
test('Word simple TOC fields and caption lists retain their index type',()=>{
 for(const [code,kind] of [['TOC \\o "2-4"','contents'],['TOC \\c "Tabla"','tables'],['TOC \\c "Figura"','figures'],['TOC \\c "Apéndice"','appendices']]){
  const {flow}=importDocx(doc(`<w:p><w:fldSimple w:instr='${code}'>${run('Resultado')}</w:fldSimple></w:p>`+heading('_Toc1',2)));
  const index=flow.content.content![0];assert.equal(index.type,'generatedIndex');assert.equal(index.attrs!.kind,kind);
 }
});
test('Word bookmark hyperlinks and REF field links resolve to the imported heading ID',()=>{
 const {flow}=importDocx(doc(`<w:p><w:hyperlink w:anchor="_Toc1">${run('Ir al título')}</w:hyperlink></w:p>`+`<w:p><w:fldSimple w:instr='REF _Toc1 \\h'>${run('Referencia simple')}</w:fldSimple></w:p>`+`<w:p>${field('begin')}<w:r><w:instrText> HYPERLINK \\l "_Toc1" </w:instrText></w:r>${field('separate')}${run('Referencia compleja')}${field('end')}</w:p>`+heading('_Toc1')));
 const blocks=flow.content.content!,target='#'+blocks.find(n=>n.type==='heading')!.attrs!.id;
 for(const block of blocks.slice(0,3))assert.equal(block.content![0].marks!.find(m=>m.type==='link')!.attrs!.href,target);
});
test('an unfinished Word field never consumes the rest of the document',()=>{
 const {flow}=importDocx(doc(`<w:p>${field('begin')}<w:r><w:instrText>TOC \\o "1-3"</w:instrText></w:r>${run('Campo incompleto')}</w:p>`+heading('_Toc1')+p('Debe conservarse')));
 assert.ok(flow.content.content!.some(n=>plainText(n)==='Debe conservarse'));
});
