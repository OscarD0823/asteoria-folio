export type SheetNameExpression={name:string;expression:string;scope?:number};
const quoted=/("(?:[^"]|"")*"|'(?:[^']|'')*')/g;
export function excelFunctionNames(formula:string){return formula.split(quoted).map((part,i)=>i%2?part:part.replace(/\b_xlfn\.(?:_xlws\.)?/gi,'').replace(/\b_xlpm\./gi,'')).join('');}
function splitArguments(text:string){const parts:string[]=[];let start=0,depth=0,quote='';for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i+1]===quote)i++;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='('||c==='{')depth++;else if(c===')'||c==='}')depth--;else if(c===','&&depth===0){parts.push(text.slice(start,i));start=i+1;}}parts.push(text.slice(start));return parts;}
function substitute(text:string,scope:Map<string,string>){return text.split(quoted).map((part,i)=>i%2?part:part.replace(/[\p{L}_][\p{L}\p{N}_.]*/gu,(token,offset:string|number)=>{const end=Number(offset)+token.length;return /^\s*[!(]/.test(part.slice(end))?token:scope.get(token.toUpperCase())??token;})).join('');}
/** LET is expanded before evaluation; no JavaScript or workbook side effects. */
export function expandExcelLet(formula:string):string {
 function expand(text:string,scope:Map<string,string>,depth:number):string {
  if(depth>24||text.length>100000)throw Error('La fórmula LET supera los límites de cálculo.');
  let result='',position=0,quote='';
  while(position<text.length){const c=text[position];if(quote){result+=c;if(c===quote&&text[position+1]===quote)result+=text[++position];else if(c===quote)quote='';position++;continue;}
   if(c==='"'||c==="'"){quote=c;result+=c;position++;continue;}
   const call=/^([\p{L}_][\p{L}\p{N}_.]*)\s*\(/u.exec(text.slice(position));
   if(call){const open=position+call[0].length-1;let end=open+1,nesting=1,inQuote='';for(;end<text.length;end++){const item=text[end];if(inQuote){if(item===inQuote&&text[end+1]===inQuote)end++;else if(item===inQuote)inQuote='';}else if(item==='"'||item==="'")inQuote=item;else if(item==='(')nesting++;else if(item===')'&&!--nesting)break;}if(nesting) return substitute(text,scope);
    const args=splitArguments(text.slice(open+1,end));
    if(call[1].toUpperCase()==='LET'){
     if(args.length<3||args.length%2===0)throw Error('LET necesita nombres, valores y un cálculo final.');
     const local=new Map(scope);for(let i=0;i<args.length-1;i+=2){const name=args[i].trim();if(!/^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name)||/^[A-Z]+\d+$|^R$|^C$/i.test(name))throw Error('Nombre de variable LET no válido.');local.set(name.toUpperCase(),'('+expand(args[i+1],local,depth+1)+')');}
     result+='('+expand(args.at(-1)!,local,depth+1)+')';
    }else {
     const expanded=args.map(arg=>expand(arg,scope,depth+1)),name=call[1].toUpperCase();
     if(name==='INT'||name==='ROUNDUP')result+=(name==='INT'?'PRISMA_INT':'PRISMA_ROUNDUP')+'('+expanded.join(',')+')';
     else if(name==='AVERAGEIFS'&&expanded.length>=3&&expanded.length%2===1)result+='(SUMIFS('+expanded.join(',')+')/COUNTIFS('+expanded.slice(1).join(',')+'))';
     else if(name==='RANK.EQ'&&expanded.length>=2&&expanded.length<=3){const [value,range,order='0']=expanded;result+='(COUNTIF('+range+',IF('+order+',"<",">")&('+value+'))+1)';}
     else if(name==='INDIRECT'&&/^"(?:[^"]|"")*"$/.test(args[0].trim())&&(expanded.length===1||/^(?:TRUE|TRUE\(\)|1)$/i.test(expanded[1].trim()))){
      const address=args[0].trim().slice(1,-1).replaceAll('""','"');
      result+=/^(?:(?:[\p{L}_][\p{L}\p{N}_. ]*|'(?:[^']|'')+')!)?\$?[A-Z]{1,3}\$?[1-9]\d*(?::\$?[A-Z]{1,3}\$?[1-9]\d*)?$/iu.test(address)?address:call[1]+'('+expanded.join(',')+')';
     }else result+=call[1]+'('+expanded.join(',')+')';
    }
    position=end+1;
   }else{const token=/^[\p{L}_][\p{L}\p{N}_.]*/u.exec(text.slice(position));if(token){result+=/^\s*!/.test(text.slice(position+token[0].length))?token[0]:scope.get(token[0].toUpperCase())??(/^(TRUE|FALSE)$/i.test(token[0])?token[0].toUpperCase()+'()':token[0]);position+=token[0].length;}else{result+=c;position++;}}
   if(result.length>100000)throw Error('La fórmula LET expandida supera los límites de cálculo.');
  }return result;
 }
 return expand(excelFunctionNames(formula),new Map(),0);
}
const decode=(text:string)=>text.replace(/&(?:amp|lt|gt|quot|apos);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[entity]!));
export function workbookNames(xml:string):SheetNameExpression[]{
 const result:SheetNameExpression[]=[];
 for(const match of xml.matchAll(/<(?:\w+:)?definedName\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?definedName>/g)){
  const name=decode(match[1].match(/\bname=["']([^"']+)["']/)?.[1]??'');if(!name||/^_xlnm\./i.test(name))continue;
  const scope=match[1].match(/\blocalSheetId=["'](\d+)["']/)?.[1];
  result.push({name,expression:'='+expandExcelLet(decode(match[2]).replace(/^=/,'')),...(scope!==undefined?{scope:Number(scope)}:{})});
 }return result;
}
