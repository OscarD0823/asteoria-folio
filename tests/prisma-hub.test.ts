import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {editorKinds, productInfo, resolveProducts} from '../src/product-core';
import {editorForFile, storeLaunch, takeLaunch} from '../src/prisma-launch';
import {listPrismaLibrary} from '../src/prisma-library';
import {saveBook, loadBook} from '../src/sheets-storage';
import {saveOfficeFile} from '../src/office-storage';
import {resourceBase} from '../src/resource-base';

test('Prisma hosts each editor while standalone identities ignore hub routing',()=>{
  const ids=new Set<string>();
  for(const editor of editorKinds){
    assert.deepEqual(resolveProducts('prisma','?editor='+editor),{distribution:'prisma',active:editor});
    assert.deepEqual(resolveProducts(editor,'?editor=data'),{distribution:editor,active:editor});
    ids.add(productInfo(editor).nativeId);
  }
  ids.add(productInfo('prisma').nativeId);assert.equal(ids.size,7);
  assert.equal(productInfo('prisma').name,'Prisma');assert.equal(productInfo('prisma').assetName,'Prisma');
  assert.equal(resolveProducts('prisma','?editor=__proto__').active,'prisma');
  assert.equal(resolveProducts('__proto__').distribution,'pdf');
});
test('file routing admits only actually supported original formats',()=>{
  for(const [name,kind] of [['Mi.PDF','pdf'],['t.docm','writer'],['t.xlsm','sheets'],['t.pptm','slides'],['t.sqlite','data'],['t.prisma','pdf']]) assert.equal(editorForFile(name),kind);
  for(const name of ['t.doc','t.xls','t.ppt','t.pub','t.accdb','t.exe']) assert.equal(editorForFile(name),undefined);
});
test('Pages shares only same-origin assets while native and standalone packages retain local resources',()=>{
  assert.equal(resourceBase('https://example.org/prisma-pdf/prisma/','../'),'https://example.org/prisma-pdf/');
  assert.equal(resourceBase('prisma://app/index.html'),'prisma://app/index.html');
  assert.equal(resourceBase('https://localhost/index.html'),'https://localhost/index.html');
  assert.equal(resourceBase('https://example.org/writer/','https://evil.test/'),'https://example.org/writer/');
});
test('local handoff is atomic, single use and refuses delivery to another editor',async()=>{
  Object.assign(globalThis,{indexedDB:new IDBFactory()});
  const token=await storeLaunch({editor:'writer',action:'recent',id:'private-project'});
  assert.equal(await takeLaunch(token,'pdf'),undefined);
  const results=await Promise.all([takeLaunch(token,'writer'),takeLaunch(token,'writer')]);
  assert.equal(results.filter(Boolean).length,1);assert.equal(results.find(Boolean)?.id,'private-project');
  assert.equal(await takeLaunch(token,'writer'),undefined);
});
test('global library unites metadata without leaking file bytes, with independent product labels',async()=>{
  Object.assign(globalThis,{indexedDB:new IDBFactory()});
  assert.deepEqual(await listPrismaLibrary(),{cards:[],errors:0});
  await saveOfficeFile({id:'s1',product:'slides',name:'Presentación privada',bytes:new Uint8Array([7,8]),updated:100});
  await saveOfficeFile({id:'p1',product:'publisher',name:'Mi publicación',bytes:new Uint8Array([5,6]),updated:200});
  await saveBook({name:'Mi libro',bytes:new Uint8Array([1,2]),original:new Uint8Array([9]),warnings:[]});
  const result=await listPrismaLibrary();assert.equal(result.errors,0);assert.equal(result.cards.length,3);
  assert.deepEqual(result.cards.map(c=>c.editor),['sheets','publisher','slides']);
  assert.equal(JSON.stringify(result).includes('bytes'),false);
  assert.deepEqual((await loadBook())?.bytes,new Uint8Array([1,2]));
});
test('Sheets index migration preserves an older workbook and its original bytes',async()=>{
  Object.assign(globalThis,{indexedDB:new IDBFactory()});
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('prisma-sheets-local-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('books');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  await new Promise<void>(resolve=>{const tx=db.transaction('books','readwrite');tx.objectStore('books').put({name:'Anterior',bytes:new Uint8Array([3]),original:new Uint8Array([4]),warnings:[]},'current');tx.oncomplete=()=>resolve();});db.close();
  assert.equal((await loadBook())?.name,'Anterior');assert.deepEqual((await loadBook())?.original,new Uint8Array([4]));
  assert.equal((await listPrismaLibrary()).cards[0].name,'Anterior');
});
