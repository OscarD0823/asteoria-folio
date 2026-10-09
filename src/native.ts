import type { Inspection, NativeRequest } from './native-core';
let worker:Worker|undefined;let nextId=0;
const pending=new Map<number,{resolve:(result:Inspection|Uint8Array)=>void;reject:(error:Error)=>void}>();
export function runNative(request:Omit<NativeRequest,'engineUrl'>):Promise<Inspection|Uint8Array>{
  if(!worker){worker=new Worker(new URL('./native.worker.ts',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);data.error?job.reject(new Error(data.error)):job.resolve(data.result);};worker.onerror=()=>{for(const job of pending.values())job.reject(new Error('No se pudo iniciar el editor local. Recarga la página.'));pending.clear();worker?.terminate();worker=undefined;};}
  return new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});worker!.postMessage({id,request:{...request,engineUrl:new URL('./engine/mupdf.js',document.baseURI).href}});});
}
export type {NativeObject,Inspection} from './native-core';
