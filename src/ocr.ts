import {createWorker} from 'tesseract.js';import {PDFDocument,degrees} from 'pdf-lib';import {getPdf,releasePdf} from './renderer';import {createFontProvider,finalizeFontStreams} from './fonts';
export async function recognizePdf(bytes:Uint8Array,language:'spa'|'eng'|'spa+eng',signal:AbortSignal,onProgress:(progress:number)=>void){
 if(bytes.length>80*1024*1024)throw new Error('Usa un PDF de hasta 80 MB para OCR.');
 const id='ocr-'+crypto.randomUUID(),source=await getPdf({id,name:'OCR',bytes}),output=await PDFDocument.load(bytes),getFont=createFontProvider(output);let worker:Awaited<ReturnType<typeof createWorker>>|undefined;let pageIndex=0;const texts:string[]=[],scores:number[]=[];
 const abort=()=>{void worker?.terminate();};signal.addEventListener('abort',abort);const check=()=>{if(signal.aborted)throw new Error('OCR cancelado.');};
 try{
  if(source.numPages>50)throw new Error('Procesa hasta 50 páginas por operación OCR.');
  check();worker=await createWorker(language,1,{workerPath:new URL('./ocr/worker.min.js',document.baseURI).href,corePath:new URL('./ocr/tesseract-core-lstm.wasm.js',document.baseURI).href,langPath:new URL('./ocr/lang/',document.baseURI).href,workerBlobURL:false,gzip:false,cacheMethod:'none',logger:status=>{if(status.status==='recognizing text')onProgress((pageIndex+status.progress)/source.numPages*100);}});check();
  for(pageIndex=0;pageIndex<source.numPages;pageIndex++){
   check();const page=await source.getPage(pageIndex+1),existing=await page.getTextContent(),original=existing.items.filter((item):item is {str:string}&typeof item=>'str' in item).map(item=>item.str).join(' ');
   if(original.trim().length>30){texts.push(original);scores.push(100);onProgress((pageIndex+1)/source.numPages*100);continue;}
   const natural=page.getViewport({scale:1}),scale=Math.min(2,2400/Math.max(natural.width,natural.height),Math.sqrt(8_000_000/(natural.width*natural.height))),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;check();const result=await worker.recognize(canvas,{}, {text:true,blocks:true});canvas.width=canvas.height=1;check();texts.push(result.data.text.trim());scores.push(result.data.confidence);
   const target=output.getPage(pageIndex);for(const block of result.data.blocks??[])for(const paragraph of block.paragraphs)for(const line of paragraph.lines)for(const word of line.words){
    if(!word.text.trim())continue;const {x0,y0,x1,y1}=word.bbox,[x,y]=viewport.convertToPdfPoint(x0,y1),[endX,endY]=viewport.convertToPdfPoint(x1,y1),[topX,topY]=viewport.convertToPdfPoint(x0,y0),size=Math.max(1,Math.hypot(topX-x,topY-y)*.8),font=await getFont('Carlito',false,false,word.text);target.drawText(word.text,{x,y,size,font,opacity:0,rotate:degrees(Math.atan2(endY-y,endX-x)*180/Math.PI)});
   }
   page.cleanup();onProgress((pageIndex+1)/source.numPages*100);
  }
  check();await finalizeFontStreams(output);return {bytes:await output.save(),text:texts.join('\n\n'),confidence:Math.round(scores.reduce((n,s)=>n+s,0)/Math.max(1,scores.length))};
 }finally{signal.removeEventListener('abort',abort);await worker?.terminate().catch(()=>{});await releasePdf(id);}
}
