import type { Workspace } from './pdf';
const DB='prisma-pdf-local-v2';
let queue:Promise<void>=Promise.resolve();
let generation=0;
export type LocalSession={version:2;workspace:Workspace;updatedAt:number};
async function openDatabase():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore('session');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export function pruneSources(workspace:Workspace):Workspace{const used=new Set(workspace.pages.map(p=>p.sourceId));return {...workspace,sources:workspace.sources.filter(s=>used.has(s.id))};}
export function saveSession(workspace:Workspace):Promise<void>{const expected=generation;const task=queue.catch(()=>{}).then(async()=>{if(expected!==generation)return;const db=await openDatabase();try{if(expected!==generation)return;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('session','readwrite');tx.objectStore('session').put({version:2,workspace:pruneSources(workspace),updatedAt:Date.now()},'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}});queue=task;return task;}
export async function loadSession():Promise<LocalSession|undefined>{const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const req=db.transaction('session').objectStore('session').get('current');req.onsuccess=()=>resolve(req.result?.version===2?req.result:undefined);req.onerror=()=>reject(req.error);});}finally{db.close();}}
export function clearSession():Promise<void>{generation++;const task=queue.catch(()=>{}).then(async()=>{const db=await openDatabase();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('session','readwrite');tx.objectStore('session').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}finally{db.close();}});queue=task;return task;}
