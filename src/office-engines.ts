import type {FlowDocument,RichNode} from './flow';
import {plainText} from './flow';
import {encodeOfficeBytes,decodeOfficeBytes} from './office-bytes';
export {encodeOfficeBytes,decodeOfficeBytes} from './office-bytes';
export type OfficeNote={id:string;text:string;originalXml?:string;author?:string;date?:string;[key:string]:unknown};
export type OfficeOriginal={bytes:string;baseline:string;nodes:RichNode[];anchors:(number|null)[];footnotes:OfficeNote[];endnotes:OfficeNote[];comments:OfficeNote[];edits?:{footnotes?:OfficeNote[];endnotes?:OfficeNote[];comments?:OfficeNote[]}};
function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object'&&['paragraph','heading'].includes(String((value as RichNode).type))){const node=value as RichNode;if(node.attrs&&!node.attrs.indexEntry){const {indexLevel:_,indexLeader:__,...attrs}=node.attrs;value={...node,attrs};}}
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key,item])=>!['officeAnchor','page','pageMap','pageLayouts','pageSections','importReport','officeOriginal'].includes(key)&&item!==null&&item!==undefined&&item!==false&&item!==0&&item!=='').sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]).filter(([,item])=>!(item&&typeof item==='object'&&!Object.keys(item as object).length)));
 return value;
}
export const officeFingerprint=(flow:FlowDocument)=>JSON.stringify(canonical({content:flow.content,layout:flow.layout,academicStyle:flow.academicStyle,references:flow.references}));
const noText=(node:RichNode):RichNode=>({...node,...(node.text!==undefined?{text:''}:{}),...(node.content?{content:node.content.map(noText)}:{})});
export async function attachOfficeOriginal(flow:FlowDocument,bytes:Uint8Array):Promise<void>{
 const engine=await import('../vendor/genoffice/dist/docx.mjs');
 await engine.assertZipInflatesWithinLimits(bytes,{maxParts:5000,maxPartBytes:32*1024*1024,maxTotalBytes:128*1024*1024});
 const parsed=await engine.parseDocx(bytes);
 const nodes=structuredClone(flow.content.content??[]),anchors:(number|null)[]=[];let cursor=0;
 for(const node of nodes){let found:number|null=null;
  if(['paragraph','heading'].includes(node.type??''))for(let i=cursor;i<parsed.blocks.length;i++){const block=parsed.blocks[i];if(block.hidden||!block.runs)continue;const text=block.runs.filter((run:{noteRef?:unknown})=>!run.noteRef).map((run:{text?:string})=>run.text??'').join('');if(text===plainText(node)){found=block.docxIndex;cursor=i+1;break;}}
  anchors.push(found);
 }
 flow.officeOriginal={bytes:encodeOfficeBytes(bytes),baseline:officeFingerprint(flow),nodes,anchors,footnotes:parsed.footnotes??[],endnotes:parsed.endnotes??[],comments:parsed.comments??[]};
}
/** Keep untouched OOXML parts and XML fragments; fall back for structural/format changes. */
export async function preserveOfficeDocx(flow:FlowDocument):Promise<Uint8Array|undefined>{
 const original=flow.officeOriginal;if(!original)return;
 if(officeFingerprint(flow)===original.baseline&&!original.edits)return decodeOfficeBytes(original.bytes);
 const current=flow.content.content??[];
 if(current.length!==original.nodes.length)return;
 if(JSON.stringify(canonical(flow.layout))!==JSON.stringify(canonical(JSON.parse(original.baseline).layout))||flow.academicStyle!==JSON.parse(original.baseline).academicStyle)return;
 const changes=new Map<number,string>();
 for(let i=0;i<current.length;i++){
  if(JSON.stringify(canonical(current[i]))===JSON.stringify(canonical(original.nodes[i])))continue;
  if(original.anchors[i]===null||!['paragraph','heading'].includes(current[i].type??'')||JSON.stringify(canonical(noText(current[i])))!==JSON.stringify(canonical(noText(original.nodes[i]))))return;
  changes.set(original.anchors[i]!,plainText(current[i]));
 }
 if(JSON.stringify(canonical(flow.references??[]))!==JSON.stringify(canonical(JSON.parse(original.baseline).references??[])))return;
 const engine=await import('../vendor/genoffice/dist/docx.mjs'),parsed=await engine.parseDocx(decodeOfficeBytes(original.bytes));
 const blocks=[];
 for(const block of parsed.blocks.filter((b:{hidden?:boolean})=>!b.hidden)){
  const text=changes.get(block.docxIndex);
  if(text===undefined){blocks.push({kind:'original',docxIndex:block.docxIndex});continue;}
  const xml=engine.patchParagraphTexts(block.originalXml,text);if(xml===null)return;
  blocks.push({kind:'xml',docxIndex:block.docxIndex,xml});
 }
 return engine.saveDocx(parsed,blocks,original.edits??{});
}
