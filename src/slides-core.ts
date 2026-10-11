import {applicationResourceBase} from './resource-base';
import * as engine from './prisma-presentation';
import {renderPrismaSlide} from './prisma-slide-render';
import {fontFile} from './fonts';
import {resolveOfficeFont} from './office-fonts';
import {encodeOfficeBytes} from './office-bytes';
export {engine as presentationEngine};
export const EMU=914400;
export const slideText=(element:any):string=>element.text?.paragraphs?.map((p:any)=>p.runs.map((r:any)=>r.text).join('')).join('\n')??'';
export async function createPresentation(template='blank'){const {buildPresentationTemplate}=await import('./slide-designs');return buildPresentationTemplate(await engine.openPptx(await engine.createBlankPptx()),template);}
export async function createPublication(template='blank'){const {buildPublicationTemplate}=await import('./slide-designs');return buildPublicationTemplate(await createPresentation(),template);}
export async function openPresentation(bytes:Uint8Array){if(bytes.length>80*1024*1024)throw new Error('Elige una presentación de hasta 80 MB.');return engine.openPptx(bytes);}
export function changeSlideText(element:any,text:string){if(!element.text)throw new Error('Selecciona un cuadro de texto.');const template=element.text.paragraphs[0]??{runs:[]},run=template.runs[0]??{fontFamily:'Carlito',fontSize:24,color:'#20243b'};element.text.paragraphs=text.split('\n').map((line,index)=>({...element.text.paragraphs[index]??template,runs:[{...run,text:line,rawXml:undefined,fieldId:undefined,fieldType:undefined}]}));element.dirty=true;}
const fontCache=new Map<string,Promise<string>>();
const metricFonts=new Map<string,any>();
async function slideMetrics(slide:any){
 const {parse}=await import('opentype.js'),names=new Set<string>(['Carlito','Calibri']);
 const scan=(element:any)=>{for(const p of element.text?.paragraphs??[])for(const run of p.runs??[])if(run.fontFamily)names.add(run.fontFamily);for(const row of element.rows??[])for(const cell of row??[])scan(cell);for(const child of element.children??[])scan(child);};slide.elements.forEach(scan);
 await Promise.all([...names].flatMap(name=>[false,true].flatMap(bold=>[false,true].map(async italic=>{const family=resolveOfficeFont(name)??resolveOfficeFont('Calibri')!,file=fontFile(family.value,bold,italic);if(!file||metricFonts.has(file))return;try{const response=await fetch(new URL('./fonts/'+file,applicationResourceBase()));if(response.ok)metricFonts.set(file,parse(await response.arrayBuffer()));}catch{/* Unavailable fonts retain the engine's fallback metrics. */}}))));
 return (text:string,style:any)=>{const family=resolveOfficeFont(style.fontFamily)??resolveOfficeFont('Calibri')!,file=fontFile(family.value,style.bold,style.italic),font=file?metricFonts.get(file):undefined;return font?font.getAdvanceWidth(text,style.fontSize??18,{kerning:true}):Array.from(text).length*(style.fontSize??18)*.52;};
}
async function fontCss(names:Set<string>){let css='';for(const name of names){const family=resolveOfficeFont(name)??resolveOfficeFont('Calibri')!;for(const [bold,italic] of [[false,false],[true,false],[false,true],[true,true]]){const file=fontFile(family.value,bold,italic);if(!file)continue;let result=fontCache.get(file);if(!result){result=fetch(new URL('./fonts/'+file,applicationResourceBase())).then(async response=>{if(!response.ok)throw new Error('Fuente sin conexión: '+name);return encodeOfficeBytes(new Uint8Array(await response.arrayBuffer()));});fontCache.set(file,result);result.catch(()=>fontCache.delete(file));}try{css+=`@font-face{font-family:${JSON.stringify(name)};font-weight:${bold?700:400};font-style:${italic?'italic':'normal'};src:url(data:font/ttf;base64,${await result})} `;}catch{/* Preserve source font names; unavailable fonts use system substitution. */}}}return css;}
export function collectRenderFonts(nodes:any[]){const names=new Set<string>(['Carlito','Calibri']);const scan=(node:any)=>{for(const line of node.text?.lines??[])for(const run of line.runs??[])if(run.fontFamily)names.add(run.fontFamily);for(const child of node.children??[])scan(child);for(const cell of node.cells??[])scan(cell);};nodes.forEach(scan);return names;}
export async function presentationSvg(opened:any,index:number,width=1280){
 const mediaCache=new Map<string,string>(),images=new Map<string,HTMLImageElement>(),names=new Set<string>(['Carlito','Calibri']);
 const media=(path:string)=>{if(mediaCache.has(path))return mediaCache.get(path);const bytes=opened.archive.readBytes(path);if(!bytes)return;const extension=path.split('.').at(-1)?.toLowerCase(),mime=extension==='svg'?'image/svg+xml':extension==='jpg'||extension==='jpeg'?'image/jpeg':extension==='gif'?'image/gif':extension==='webp'?'image/webp':extension==='png'?'image/png':undefined;if(!mime)return;const url=`data:${mime};base64,${encodeOfficeBytes(bytes)}`;mediaCache.set(path,url);return url;};
 const metrics=await slideMetrics(opened.deck.slides[index]);
 const page=renderPrismaSlide(opened.deck.slides[index],{width,size:opened.deck.size,media,measure:metrics});
 for(const name of page.fonts)names.add(name);
 await Promise.all([...mediaCache.values()].map(async url=>{const image=new Image();image.src=url;try{await image.decode();images.set(url,image);}catch{/* Unsupported images retain their original package parts. */}}));
 const css=await fontCss(names);
 page.svg=page.svg.replace(/(<svg\b[^>]*>)/,`$1<style>${css.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</style>`);return page;
}
export async function presentationPdf(opened:any){
 const {PDFDocument}=await import('pdf-lib'),pdf=await PDFDocument.create();
 if(opened.deck.slides.length>200)throw new Error('Exporta una presentación de hasta 200 diapositivas a PDF.');
 for(let i=0;i<opened.deck.slides.length;i++){
  const page=await presentationSvg(opened,i,1600),image=new Image(),url=URL.createObjectURL(new Blob([page.svg],{type:'image/svg+xml'}));
  try{image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=Math.round(page.widthPx??1600);canvas.height=Math.round(page.heightPx??1600*opened.deck.size.cy/opened.deck.size.cx);canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);const png=await pdf.embedPng(canvas.toDataURL('image/png'));const target=pdf.addPage([opened.deck.size.cx/12700,opened.deck.size.cy/12700]);target.drawImage(png,{x:0,y:0,width:target.getWidth(),height:target.getHeight()});}finally{URL.revokeObjectURL(url);}
 }
 return pdf.save();
}
