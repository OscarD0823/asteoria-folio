import * as pdfjs from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Source } from './pdf';
pdfjs.GlobalWorkerOptions.workerSrc=worker;
const cache=new Map<string,Promise<pdfjs.PDFDocumentProxy>>();
export function getPdf(source:Source){
  if(!cache.has(source.id))cache.set(source.id,pdfjs.getDocument({data:source.bytes.slice(),cMapUrl:new URL('./pdfjs/cmaps/',document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL('./pdfjs/standard_fonts/',document.baseURI).href,wasmUrl:new URL('./pdfjs/wasm/',document.baseURI).href}).promise);
  return cache.get(source.id)!;
}
export async function clearPdfCache(){for(const doc of cache.values())try{await(await doc).destroy();}catch{}cache.clear();}
export {pdfjs};
