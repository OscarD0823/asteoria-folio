import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync,strToU8} from 'fflate';
import {parseDictionaryFiles,parseDictionaryXml,exportOdictXml,mergeDictionary} from '../src/dictionary-formats';
test('StarDict decodes 32/64 bit indices and local gzip; rejects out-of-range records',async()=>{
 for(const bits of [32,64]){const term=strToU8('árbol'),definition=strToU8('Planta con tronco leñoso.'),index=new Uint8Array(term.length+1+bits/8+4);index.set(term);const view=new DataView(index.buffer),position=term.length+1;if(bits===64)view.setBigUint64(position,0n,false);else view.setUint32(position,0,false);view.setUint32(position+bits/8,definition.length,false);
 const files=(data:Uint8Array)=>[new File(['StarDict\nversion=3.0.0\nidxoffsetbits='+bits+'\nsametypesequence=m'],'demo.ifo'),new File([gzipSync(data)],'demo.idx.gz'),new File([gzipSync(definition)],'demo.dict.dz')];
 assert.deepEqual(await parseDictionaryFiles(files(index)),[{term:'árbol',definition:'Planta con tronco leñoso.'}]);view.setUint32(position+bits/8,definition.length+1,false);await assert.rejects(parseDictionaryFiles(files(index)),/fuera/);
 }
});
test('ODict XML preserves escaped Unicode and definitions; refuses entities and merges NFC terms',()=>{
 const entries=[{term:'árbol & raíz',definition:'Botánica: definición y uso.'}];assert.deepEqual(parseDictionaryXml(exportOdictXml(entries)),entries);
 assert.throws(()=>parseDictionaryXml('<!DOCTYPE dictionary [<!ENTITY a SYSTEM "file:///x">]><dictionary/>'),/XML/);
 assert.deepEqual(mergeDictionary([{term:'a\u0301rbol',definition:'antigua'}],[{term:'ÁRBOL',definition:'<b>nueva</b>'}]),[{term:'ÁRBOL',definition:'nueva'}]);
 assert.deepEqual(parseDictionaryXml('<TEI><text><body><entry><form><orth>prisma</orth></form><sense><def>Sólido geométrico.</def></sense></entry></body></text></TEI>'),[{term:'prisma',definition:'Sólido geométrico.'}]);
});
