import type {FlowDocument,RichNode} from './flow';
import {plainText} from './flow';
import {encodeOfficeBytes,decodeOfficeBytes} from './office-bytes';
import {parsePrismaWord,savePrismaWord} from './prisma-ooxml';
export {encodeOfficeBytes,decodeOfficeBytes} from './office-bytes';
export type OfficeNote={id:string;text:string;originalXml?:string;author?:string;date?:string;[key:string]:unknown};
export type OfficeOriginal={bytes:string;baseline:string;nodes:RichNode[];anchors:(number|null)[];footnotes:OfficeNote[];endnotes:OfficeNote[];comments:OfficeNote[];edits?:{footnotes?:OfficeNote[];endnotes?:OfficeNote[];comments?:OfficeNote[]}};
function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object'&&['paragraph','heading'].includes(String((value as RichNode).type))){const node=value as RichNode;if(node.attrs&&!node.attrs.indexEntry){const {indexLevel:_,indexLeader:__,...attrs}=node.attrs;value={...node,attrs};}}
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key,item])=>!['officeAnchor','page','pageMap','pageLayouts','pageSections','importReport','officeOriginal'].includes(key)&&item!==null&&item!==undefined&&item!==false&&item!==0&&item!=='').sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]).filter(([,item])=>!(item&&typeof item==='object'&&!Object.keys(item as object).length)));
 return value;
}
export const officeFingerprint=(flow:FlowDocument)=>JSON.stringify(canonical({content:flow.content,layout:flow.layout,academicStyle:flow.academicStyle,references:flow.references,language:flow.language}));
const noText=(node:RichNode):RichNode=>({...node,...(node.text!==undefined?{text:''}:{}),...(node.content?{content:node.content.map(noText)}:{})});
export async function attachOfficeOriginal(flow:FlowDocument,bytes:Uint8Array):Promise<void>{
 const parsed=await parsePrismaWord(bytes);
 const nodes=structuredClone(flow.content.content??[]),anchors:(number|null)[]=[];let cursor=0;
 for(const node of nodes){let found:number|null=null;
  if(['paragraph','heading'].includes(node.type??''))for(let i=cursor;i<parsed.blocks.length;i++){const block=parsed.blocks[i];if(block.kind!=='p')continue;if(block.text===plainText(node)){found=block.docxIndex;cursor=i+1;break;}}
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
 if(JSON.stringify(canonical(flow.layout))!==JSON.stringify(canonical(JSON.parse(original.baseline).layout))||flow.academicStyle!==JSON.parse(original.baseline).academicStyle||flow.language!==JSON.parse(original.baseline).language)return;
 const changes=new Map<number,string>();
 for(let i=0;i<current.length;i++){
  if(JSON.stringify(canonical(current[i]))===JSON.stringify(canonical(original.nodes[i])))continue;
  if(original.anchors[i]===null||!['paragraph','heading'].includes(current[i].type??'')||JSON.stringify(canonical(noText(current[i])))!==JSON.stringify(canonical(noText(original.nodes[i]))))return;
  changes.set(original.anchors[i]!,plainText(current[i]));
 }
 if(JSON.stringify(canonical(flow.references??[]))!==JSON.stringify(canonical(JSON.parse(original.baseline).references??[])))return;
 const parsed=await parsePrismaWord(decodeOfficeBytes(original.bytes));
 return savePrismaWord(parsed,changes,original.edits as Parameters<typeof savePrismaWord>[2]);
}
