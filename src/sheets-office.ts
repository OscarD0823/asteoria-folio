import ExcelJS from 'exceljs';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {strFromU8,strToU8,zipSync} from 'fflate';
import {readOfficePackage} from './prisma-ooxml';
const scalar=(value:any):unknown=>value&&typeof value==='object'&&'formula' in value?{formula:value.formula}:value instanceof Date?{date:value.toISOString()}:value;
function formatSignature(book:ExcelJS.Workbook){return JSON.stringify(book.worksheets.map(sheet=>({name:sheet.name,merges:sheet.model.merges,columns:sheet.columns.map(c=>({width:c.width,hidden:c.hidden,style:c.style})),views:sheet.views,pageSetup:sheet.pageSetup,rows:(sheet.model as any).rows.map((row:any)=>({number:row.number,height:row.height,hidden:row.hidden,style:row.style,cells:row.cells.filter((c:any)=>c.style&&Object.keys(c.style).length).map((c:any)=>({address:c.address,style:c.style}))}))})));}
export async function preserveSpreadsheetCells(original:Uint8Array,workbook:ExcelJS.Workbook,result:(name:string,row:number,col:number)=>unknown){
 const parts=readOfficePackage(original,{maxParts:5000,maxPartBytes:64*1024*1024,maxTotalBytes:180*1024*1024});
 const baseline=new ExcelJS.Workbook();const {normalizedSpreadsheetParts}=await import('./sheets-core');await baseline.xlsx.load((normalizedSpreadsheetParts({...parts})??original) as unknown as ExcelJS.Buffer);
 if(formatSignature(baseline)!==formatSignature(workbook))throw Error('Para conservar las partes originales, cambia solo el contenido de las celdas. Exporta XLSX para cambios de formato, hojas o estructura.');
 const parser=new DOMParser(),serializer=new XMLSerializer(),parse=(bytes:Uint8Array)=>parser.parseFromString(strFromU8(bytes),'application/xml');
 const manifest=parse(parts['xl/workbook.xml']),rels=parse(parts['xl/_rels/workbook.xml.rels']),targets=new Map<string,string>();
 for(const rel of Array.from(rels.getElementsByTagNameNS('*','Relationship'))){if(rel.getAttribute('TargetMode')==='External')continue;const target=rel.getAttribute('Target')??'';targets.set(rel.getAttribute('Id')??'',target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,''));}
 const declarations=Array.from(manifest.getElementsByTagNameNS('*','sheet'));
 for(const sheet of workbook.worksheets){const declaration=declarations.find(d=>d.getAttribute('name')===sheet.name),id=declaration?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'),file=id&&targets.get(id);if(!file||!parts[file])throw Error('No se pudo localizar la hoja original '+sheet.name);
  const doc=parse(parts[file]),root=doc.documentElement!,ns=root.namespaceURI??'http://schemas.openxmlformats.org/spreadsheetml/2006/main',sheetData=doc.getElementsByTagNameNS('*','sheetData')[0];if(!sheetData)throw Error('La hoja no contiene celdas editables.');
  const prior=baseline.getWorksheet(sheet.name)!,addresses=new Set<string>();prior.eachRow(row=>row.eachCell(cell=>addresses.add(cell.address)));sheet.eachRow(row=>row.eachCell(cell=>addresses.add(cell.address)));
  const nodes=new Map(Array.from(doc.getElementsByTagNameNS('*','c')).map(c=>[c.getAttribute('r')!,c]));let changed=false;
  for(const address of addresses){const before=prior.getCell(address),cell=sheet.getCell(address);if(JSON.stringify(scalar(before.value))===JSON.stringify(scalar(cell.value)))continue;changed=true;let node=nodes.get(address);
   if(!node){let row=Array.from(sheetData.childNodes).find((n:any)=>n.nodeType===1&&n.getAttribute('r')===String(cell.row)) as any;if(!row){row=doc.createElementNS(ns,'row');row.setAttribute('r',String(cell.row));const next=Array.from(sheetData.childNodes).find((n:any)=>n.nodeType===1&&Number(n.getAttribute('r'))>Number(cell.row));sheetData.insertBefore(row,next??null);}node=doc.createElementNS(ns,'c');node.setAttribute('r',address);const next=Array.from(row.childNodes).find((n:any)=>n.nodeType===1&&Number(sheet.getCell(n.getAttribute('r')).col)>Number(cell.col));row.insertBefore(node,next??null);}
   for(const child of Array.from(node.childNodes))if(child.nodeType===1&&['f','v','is'].includes((child as any).localName))node.removeChild(child);node.removeAttribute('t');
   const append=(tag:string,text:string)=>{const child=doc.createElementNS(ns,tag);child.appendChild(doc.createTextNode(text));node!.appendChild(child);};let value:any=cell.value;
   if(cell.type===ExcelJS.ValueType.Formula){append('f',cell.formula);value=result(sheet.name,Number(cell.row)-1,Number(cell.col)-1);if(typeof value==='string'&&value.startsWith('#'))node.setAttribute('t','e');else if(typeof value==='string')node.setAttribute('t','str');}
   if(value===null||value===undefined)continue;if(value instanceof Date)value=(value.getTime()-Date.UTC(1899,11,30))/86400000;
   if(typeof value==='object')value='richText' in value?value.richText.map((r:any)=>r.text).join(''):cell.text;
   if(typeof value==='boolean'){node.setAttribute('t','b');append('v',value?'1':'0');}else if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Una celda contiene un número no válido.');append('v',String(value));}else if(cell.type===ExcelJS.ValueType.Formula)append('v',String(value));else{node.setAttribute('t','inlineStr');const inline=doc.createElementNS(ns,'is'),text=doc.createElementNS(ns,'t');text.setAttribute('xml:space','preserve');text.appendChild(doc.createTextNode(String(value)));inline.appendChild(text);node.appendChild(inline);}
  }
  if(changed)parts[file]=strToU8(serializer.serializeToString(doc));
 }
 let calc=manifest.getElementsByTagNameNS('*','calcPr')[0];if(!calc){calc=manifest.createElementNS(manifest.documentElement!.namespaceURI,'calcPr');manifest.documentElement!.appendChild(calc);}calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');parts['xl/workbook.xml']=strToU8(serializer.serializeToString(manifest));
 return zipSync(parts,{level:6});
}



