import {unzipSync,zipSync,strFromU8,strToU8} from 'fflate';
export const xmlEscape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export const xmlText=(xml:string)=>xml.replace(/&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi,(_,hex,decimal,named)=>hex||decimal?String.fromCodePoint(Number.parseInt(hex??decimal,hex?16:10)):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[named.toLowerCase() as 'amp']??''));
export function readOfficePackage(bytes:Uint8Array,limits={maxParts:5000,maxPartBytes:32*1024*1024,maxTotalBytes:128*1024*1024}){
 if(bytes.length>80*1024*1024)throw Error('El archivo Office supera 80 MB.');let count=0,size=0;
 const parts=unzipSync(bytes,{filter(entry){if(++count>limits.maxParts||entry.originalSize>limits.maxPartBytes||(size+=entry.originalSize)>limits.maxTotalBytes)throw Error('El documento Office descomprimido supera los límites.');if(/(^\/|\\|(?:^|\/)\.\.(?:\/|$))/.test(entry.name))throw Error('Ruta interna Office no válida.');return true;}});
 for(const [name,part] of Object.entries(parts))if(/\.xml$|\.rels$/i.test(name)&&/<!DOCTYPE|<!ENTITY/i.test(strFromU8(part)))throw Error('El documento contiene una definición XML no admitida.');
 return parts;
}
export const writeOfficePackage=(parts:Record<string,Uint8Array>)=>zipSync(parts,{level:6});
export function patchOfficeParagraph(xml:string,text:string):string|null{
 if(/[\r\n\t]/.test(text))return null;
 const nodes=[...xml.matchAll(/<((?:[\w-]+:)?t)\b([^>]*?)>([\s\S]*?)<\/\1>/g)];
 if(!nodes.length)return text?null:xml;
 const chars=Array.from(text);let cursor=0,index=0;
 return xml.replace(/<((?:[\w-]+:)?t)\b([^>]*?)>([\s\S]*?)<\/\1>/g,(_all,tag,attrs,old)=>{
  const length=index++===nodes.length-1?chars.length-cursor:Math.min(Array.from(xmlText(old)).length,chars.length-cursor),part=chars.slice(cursor,cursor+length).join('');cursor+=length;
  const space=/xml:space=/.test(attrs)?attrs.replace(/xml:space\s*=\s*(['"])[^'"]*\1/,'xml:space="preserve"'):attrs+' xml:space="preserve"';return '<'+tag+space+'>'+xmlEscape(part)+'</'+tag+'>';
 });
}
export function documentBodyBlocks(xml:string){
 const bodyMatch=xml.match(/<((?:[\w-]+:)?body)\b[^>]*>([\s\S]*?)<\/\1>/),body=bodyMatch?.[2];if(body===undefined)throw Error('El archivo no contiene un documento Word válido.');
 const base=bodyMatch!.index!+bodyMatch![0].indexOf('>')+1;
 const result:{originalXml:string;docxIndex:number;kind:string;text:string;from:number;to:number}[]=[];let depth=0,start=0,kind='',index=0;
 for(const match of body.matchAll(/<\/?([\w:-]+)\b[^>]*>/g)){
  const token=match[0],name=match[1].split(':').at(-1)!;if(token.startsWith('</')){depth--;if(depth===0){const end=match.index!+token.length,fragment=body.slice(start,end);result.push({originalXml:fragment,docxIndex:index++,kind,from:base+start,to:base+end,text:[...fragment.matchAll(/<(?:[\w-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?t>/g)].map(m=>xmlText(m[1])).join('')});}}
  else if(!token.endsWith('/>')){if(depth===0){start=match.index!;kind=name;}depth++;}
  else if(depth===0)result.push({originalXml:token,docxIndex:index++,kind:name,text:'',from:base+match.index!,to:base+match.index!+token.length});
 }
 return result;
}
export type PrismaWordNote={id:string;text:string;originalXml:string;author?:string;date?:string;[key:string]:unknown};
function notes(parts:Record<string,Uint8Array>,file:string,kind:string):PrismaWordNote[]{
 if(!parts[file])return [];const xml=strFromU8(parts[file]);
 const pattern=new RegExp('<((?:[\\w-]+:)?'+kind+')\\b([^>]*?)>([\\s\\S]*?)<\\/\\1>','g');
 return [...xml.matchAll(pattern)].filter(m=>!/(?:\w+:)?type=["'](?:separator|continuationSeparator)/.test(m[2])).map(m=>({id:xmlText(m[2].match(/(?:\w+:)?id=["']([^"']+)/)?.[1]??''),text:[...m[3].matchAll(/<(?:[\w-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?t>/g)].map(t=>xmlText(t[1])).join(''),originalXml:m[0],author:xmlText(m[2].match(/(?:\w+:)?author=["']([^"']+)/)?.[1]??''),date:m[2].match(/(?:\w+:)?date=["']([^"']+)/)?.[1]})).filter(n=>n.id&&Number(n.id)>=0);
}
export async function parsePrismaWord(bytes:Uint8Array){
 const parts=readOfficePackage(bytes);if(!parts['word/document.xml'])throw Error('Selecciona un documento Word Open XML.');
 const blocks=documentBodyBlocks(strFromU8(parts['word/document.xml']));
 return {parts,blocks,footnotes:notes(parts,'word/footnotes.xml','footnote'),endnotes:notes(parts,'word/endnotes.xml','endnote'),comments:notes(parts,'word/comments.xml','comment')};
}
export async function savePrismaWord(parsed:Awaited<ReturnType<typeof parsePrismaWord>>,changes:Map<number,string>,edits:{footnotes?:PrismaWordNote[];endnotes?:PrismaWordNote[];comments?:PrismaWordNote[]}={}){
 const parts={...parsed.parts};let document=strFromU8(parts['word/document.xml']);
 // Modify only the requested fragments. Unknown package parts remain byte identical.
 const replacements=parsed.blocks.filter(b=>changes.has(b.docxIndex)).map(b=>({...b,next:patchOfficeParagraph(b.originalXml,changes.get(b.docxIndex)!)})).sort((a,b)=>b.from-a.from);
 if(replacements.some(r=>r.next===null))return;
 for(const replacement of replacements)document=document.slice(0,replacement.from)+replacement.next+document.slice(replacement.to);
 if(replacements.length)parts['word/document.xml']=strToU8(document);
 for(const key of ['footnotes','endnotes','comments'] as const){if(!edits[key])continue;const file='word/'+key+'.xml';if(!parts[file])continue;let xml=strFromU8(parts[file]);for(const edit of edits[key]!){const original=parsed[key].find(n=>n.id===edit.id);if(!original||original.text===edit.text)continue;const replacement=patchOfficeParagraph(original.originalXml,edit.text);if(replacement===null)throw Error('Esta edición de nota necesita reconstruir sus párrafos.');xml=xml.replace(original.originalXml,replacement);}parts[file]=strToU8(xml);}
 return writeOfficePackage(parts);
}
