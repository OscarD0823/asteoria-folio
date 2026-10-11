import type {Editor} from '@tiptap/core';
import {replacementMatches} from './find-replace';
import type {MacroOperation,MacroSnapshot} from './prisma-macros';
import type {SheetsBook} from './sheets-core';
import {parseAddress} from './sheets-core';
import {closeHistory} from '@tiptap/pm/history';

export function macroString(operation:MacroOperation,key:string,max=100000){const value=operation.args[key];if(typeof value!=='string'||value.length>max)throw Error('La operación '+operation.op+' necesita '+key+' como texto.');return value;}
export function assertMacroRevision(actual:string,expected:string){if(actual!==expected)throw Error('El documento cambió desde la vista previa. Vuelve a comprobar la macro.');}
export const editorMacroSnapshot=(editor:Editor):MacroSnapshot=>({revision:JSON.stringify(editor.state.doc.toJSON()),text:editor.state.doc.textContent});
export function applyEditorMacro(editor:Editor,operations:MacroOperation[],revision:string){
 assertMacroRevision(editorMacroSnapshot(editor).revision,revision);const tr=editor.state.tr;
 for(const operation of operations){
  if(operation.op==='replaceText'){
   const query=macroString(operation,'find',1000),replacement=macroString(operation,'replace');if(!query)throw Error('Escribe el texto que quieres buscar.');
   for(const match of replacementMatches(tr.doc,query,operation.args.caseSensitive===true,operation.args.wholeWord===true).reverse()){
    const marks=tr.doc.resolve(match.from).marks();if(replacement)tr.replaceWith(match.from,match.to,editor.schema.text(replacement,marks));else tr.delete(match.from,match.to);
   }
  }else if(operation.op==='appendParagraph'){
   const text=macroString(operation,'text');tr.insert(tr.doc.content.size,editor.schema.nodes.paragraph.create(null,text?editor.schema.text(text):undefined));
  }else throw Error('Operación de Writer no admitida: '+operation.op);
 }
 // One dispatch gives one undo step; a failure above never touches the editor.
 if(tr.docChanged)editor.view.dispatch(closeHistory(tr).scrollIntoView());
}
export function sheetMacroSnapshot(book:SheetsBook):MacroSnapshot{
 const values:NonNullable<MacroSnapshot['values']>={};
 for(const sheet of book.workbook.worksheets)sheet.eachRow((row,r)=>row.eachCell((cell,c)=>{const value=book.value(sheet.name,r-1,c-1);values[sheet.name+'!'+cell.address]=typeof value==='number'||typeof value==='boolean'?value:String(value??'');}));
 return {revision:JSON.stringify(book.workbook.model),values};
}
export function applySheetMacro(book:SheetsBook,operations:MacroOperation[],revision:string){
 assertMacroRevision(sheetMacroSnapshot(book).revision,revision);
 const expanded:MacroOperation[]=[];
 for(const operation of operations){
  if(operation.op!=='replaceText'){expanded.push(operation);continue;}
  const query=macroString(operation,'find',1000),replacement=macroString(operation,'replace');if(!query)throw Error('Escribe el texto que quieres buscar.');
  const pattern=macroReplacementPattern(query,operation);
  for(const sheet of book.workbook.worksheets)sheet.eachRow((row,r)=>row.eachCell((cell,c)=>{const input=book.input(sheet.name,r-1,c-1);if(typeof cell.value!=='string'||input.startsWith('='))return;const value=cell.value.replace(pattern,()=>replacement);if(value!==cell.value)expanded.push({op:'setCell',args:{sheet:sheet.name,cell:cell.address,value:"'"+value}});}));
 }
 const changes=expanded.map(operation=>{
  if(operation.op!=='setCell')throw Error('Operación de Sheets no admitida: '+operation.op);
  const sheet=macroString(operation,'sheet',120),cell=macroString(operation,'cell',20),position=parseAddress(cell);
  if(!book.workbook.getWorksheet(sheet)||!position||position.row<0||position.col<0||position.row>=100000||position.col>=1000)throw Error('Hoja o celda fuera de los límites: '+sheet+'!'+cell);
  const value=operation.args.value;if(value===undefined||typeof value==='number'&&!Number.isFinite(value))throw Error('Valor de celda no válido.');
  return {sheet,position,value:value===null?'':String(value)};
 });
 const previous=structuredClone(book.workbook.model);
 try{for(const change of changes)book.set(change.sheet,change.position.row,change.position.col,change.value);}catch(error){book.restore(previous);throw error;}
}
function macroReplacementPattern(query:string,operation:MacroOperation){const literal=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(operation.args.wholeWord===true?'(?<![\\p{L}\\p{M}\\p{N}_])'+literal+'(?![\\p{L}\\p{M}\\p{N}_])':literal,operation.args.caseSensitive===true?'gu':'giu');}
export function replacePresentationText(opened:any,operations:MacroOperation[]){
 for(const operation of operations){
  if(operation.op!=='replaceText')throw Error('Operación de presentación no admitida.');
  const query=macroString(operation,'find',1000),replacement=macroString(operation,'replace');if(!query)throw Error('Escribe el texto que quieres buscar.');
  const pattern=macroReplacementPattern(query,operation);
  for(const slide of opened.deck.slides)for(const element of slide.elements){
   const paragraphs=[...(element.text?.paragraphs??[]),...(element.rows??[]).flatMap((row:any)=>row.flatMap((cell:any)=>cell.text?.paragraphs??[]))];
   for(const paragraph of paragraphs){
    const old=paragraph.runs.map((run:any)=>run.text??'').join(''),matches=[...old.matchAll(pattern)];if(!matches.length)continue;
    // Split at run boundaries so formatting survives replacements across runs.
    let runs=paragraph.runs.map((run:any)=>({...run}));
    for(const match of matches.reverse()){
     const from=match.index!,to=from+match[0].length;let offset=0,inserted=false;const next:any[]=[];
     for(const run of runs){const text=run.text??'',end=offset+text.length;
      if(end<=from||offset>=to)next.push(run);
      else{if(offset<from)next.push({...run,text:text.slice(0,from-offset)});if(!inserted){if(replacement)next.push({...run,text:replacement});inserted=true;}if(end>to)next.push({...run,text:text.slice(to-offset)});}
      offset=end;
     }runs=next;
    }
    paragraph.runs=runs;element.dirty=true;slide.dirty=true;
   }
  }
 }
}
