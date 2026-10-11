import test from 'node:test';import assert from 'node:assert/strict';import {unzipSync,strFromU8} from 'fflate';import {DOMParser} from '@xmldom/xmldom';
import {exportOdt,exportRtf,exportOds} from '../src/open-formats';import {exportDocx} from '../src/document-export';import {importOfficeDocx} from '../src/document-import';import {defaultLayout,type FlowDocument} from '../src/flow';import {SheetsBook} from '../src/sheets-core';import {readFile} from 'node:fs/promises';import {setFontLoader} from '../src/fonts';
setFontLoader(async file=>new Uint8Array(await readFile('public/fonts/'+file)));
const odfPlain=(xml:string)=>xml.replace(/<text:s text:c="(\d+)"\/>/g,(_,n)=>' '.repeat(Number(n))).replace(/<[^>]*>/g,'');
Object.assign(globalThis,{DOMParser});
test('own OpenDocument and RTF preserve punctuation, Unicode, spaces, page layout and text formatting',()=>{
 const flow:FlowDocument={language:'fr',layout:{...defaultLayout(),orientation:'landscape'},content:{type:'doc',content:[{type:'heading',attrs:{level:1},content:[{type:'text',text:'Étude, «citas»… 🧪',marks:[{type:'bold'}]}]},{type:'paragraph',content:[{type:'text',text:'Dos  espacios\tá\n漢字',marks:[{type:'italic'}]}]},{type:'table',content:[{type:'tableRow',content:[{type:'tableCell',content:[{type:'paragraph',content:[{type:'text',text:'A & B'}]}]}]}]}]}};
 const odt=exportOdt(flow,'Trabajo'),parts=unzipSync(odt),xml=strFromU8(parts['content.xml']),styles=strFromU8(parts['styles.xml']);
 assert.equal(strFromU8(parts.mimetype),'application/vnd.oasis.opendocument.text');assert.equal(odt[8],0);assert.equal(odt[9],0); // first entry uncompressed, as ODF requires
 assert.match(odfPlain(xml),/Étude, «citas»… 🧪/);assert.match(xml,/<text:s text:c="2"\/>/);assert.match(xml,/<text:tab\/>/);assert.match(xml,/<text:line-break\/>/);assert.match(xml,/漢字/);assert.match(xml,/A<text:s text:c="1"\/> &amp;|A<text:s text:c="1"\/>&amp;/);assert.match(xml,/table:table/);assert.match(styles,/fo:language="fr"/);assert.match(styles,/style:print-orientation="landscape"/);
 for(const [path,bytes] of Object.entries(parts))if(path.endsWith('.xml')){let failed=false;new DOMParser({onError:()=>{failed=true;}}).parseFromString(strFromU8(bytes),'application/xml');assert.equal(failed,false,path);}
 const rtf=strFromU8(exportRtf(flow));assert.match(rtf,/^\{\\rtf1/);assert.match(rtf,/\\u-10178\?\\u-8726\?/);assert.match(rtf,/\\b /);assert.match(rtf,/\\i /);assert.match(rtf,/\\cell/);assert.match(rtf,/\\paperw16838/);
});
test('ODS exports every sheet with calculated values and typed cells',()=>{
 const book=new SheetsBook();book.set('Hoja1',0,0,'7');book.set('Hoja1',0,1,'=A1*2');book.addSheet();book.set('Hoja2',0,0,"'«Texto», español");const parts=unzipSync(exportOds(book)),xml=strFromU8(parts['content.xml']);assert.match(xml,/table:name="Hoja1"/);assert.match(xml,/table:name="Hoja2"/);assert.match(xml,/office:value="14"/);assert.match(xml,/«Texto»,/);assert.doesNotMatch(xml,/table:formula/);book.destroy();
});
test('DOCX persists the selected proofing language and imports it again',async()=>{
 const flow:FlowDocument={language:'en-GB',layout:defaultLayout(),content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Hello, world.'}]}]}};const bytes=await exportDocx(flow,'Idioma');assert.match(strFromU8(unzipSync(bytes)['word/styles.xml']),/w:lang w:val="en-GB"/);const imported=await importOfficeDocx(bytes);assert.equal(imported.flow.language,'en-GB');
});
