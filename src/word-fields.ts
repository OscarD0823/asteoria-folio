import type {RichNode} from './flow';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const value=(el:Element,name:string)=>el.getAttributeNS(W,name)||el.getAttribute('w:'+name)||'';
const elements=(el:Element)=>Array.from(el.childNodes).filter((n):n is Element=>n.nodeType===1);

export function wordIndexAttributes(instruction:string):RichNode['attrs']|undefined {
  if(!/^\s*TOC(?:\s|$)/i.test(instruction))return;
  const caption=instruction.match(/\\c\s+"([^"]+)"/i)?.[1]??'';
  const kind=/^(?:tabla|table)/i.test(caption)?'tables':/^(?:figura|figure|ilustraci[oó]n)/i.test(caption)?'figures':/^(?:ap[eé]ndice|appendix)/i.test(caption)?'appendices':'contents';
  const levels=instruction.match(/\\o\s+"(\d)-(\d)"/i);
  return {id:crypto.randomUUID(),kind,levels:Math.min(6,Number(levels?.[2])||3),minLevel:Math.max(1,Number(levels?.[1])||1),leader:'dots',pageNumbers:!/\\n(?:\s|$)/i.test(instruction)};
}

/** Complex Word fields can span paragraphs and nest PAGEREF fields. */
export function wordIndexRanges(body:Element) {
  const roots=elements(body), fields:{code:string;start:number;result:boolean}[]=[], ranges:{start:number;end:number;attrs:NonNullable<RichNode['attrs']>}[]=[];
  function visit(el:Element,root:number) {
    if(el.localName==='fldSimple') {
      const attrs=wordIndexAttributes(value(el,'instr'));
      if(attrs)ranges.push({start:root,end:root,attrs});
    }
    if(el.localName==='fldChar') {
      const kind=value(el,'fldCharType');
      if(kind==='begin')fields.push({code:'',start:root,result:false});
      else if(kind==='separate'&&fields.length)fields.at(-1)!.result=true;
      else if(kind==='end') {const field=fields.pop();if(field){const attrs=wordIndexAttributes(field.code);if(attrs)ranges.push({start:field.start,end:root,attrs});}}
    } else if(el.localName==='instrText'&&fields.length&&!fields.at(-1)!.result)fields.at(-1)!.code+=el.textContent??'';
    for(const child of elements(el))visit(child,root);
  }
  roots.forEach(visit);
  const starts=new WeakMap<Element,NonNullable<RichNode['attrs']>>(),skip=new WeakSet<Element>();
  for(const range of ranges){starts.set(roots[range.start],range.attrs);for(let i=range.start+1;i<=range.end;i++)skip.add(roots[i]);}
  return {starts,skip};
}

export function wordBookmarks(body:Element) {
  const ids=new WeakMap<Element,string>(),targets=new Map<string,string>();
  for(const paragraph of Array.from(body.getElementsByTagNameNS('*','p'))) {
    const id=crypto.randomUUID();ids.set(paragraph,id);
    for(const mark of Array.from(paragraph.getElementsByTagNameNS('*','bookmarkStart'))) {
      const name=value(mark,'name');if(name&&name!=='_GoBack')targets.set(name,id);
    }
  }
  return {ids,targets};
}

export function wordFieldLink(instruction:string,bookmarks:Map<string,string>) {
  const anchor=instruction.match(/^\s*(?:HYPERLINK\s+.*?\\l|(?:PAGE)?REF)\s+"?([^"\s]+)"?/i)?.[1];
  if(anchor&&bookmarks.has(anchor))return '#'+bookmarks.get(anchor);
  const external=instruction.match(/^\s*HYPERLINK\s+"(https?:\/\/[^"\r\n]+|mailto:[^"\r\n]+)"/i)?.[1];
  return external??'';
}
