import {PDFDocument,PDFTextField,PDFCheckBox,PDFDropdown,PDFRadioGroup,pushGraphicsState,popGraphicsState,degrees,type PDFPage,type PDFEmbeddedPage} from 'pdf-lib';
export const pdfWorkflows=[
 {id:'reverse',name:'Invertir páginas',description:'Cambiar el orden desde la última página a la primera. Los valores de formulario se fijan en las páginas.'},
 {id:'nup',name:'Varias páginas por hoja',description:'Preparar 2, 4, 9 o 16 páginas por hoja para impresión.'},
 {id:'booklet',name:'Crear cuadernillo',description:'Ordenar las páginas para imprimir y doblar un cuadernillo.'},
 {id:'divide',name:'Dividir cada hoja',description:'Separar una hoja en mitades o en una cuadrícula.'},
 {id:'alternate',name:'Unir alternando',description:'Intercalar páginas de dos PDF, por ejemplo anversos y reversos. Los valores de formulario se fijan en las páginas.'},
 {id:'metadata',name:'Propiedades del PDF',description:'Editar título, autor, asunto y palabras clave.'},
 {id:'forms',name:'Rellenar formulario',description:'Editar los campos de texto, listas y casillas de un PDF interactivo.'},
 {id:'flatten',name:'Fijar campos del formulario',description:'Convertir los valores del formulario en contenido no editable.'},
] as const;
export type PdfWorkflow=typeof pdfWorkflows[number]['id'];
export type PdfField={name:string;type:'text'|'checkbox'|'choice'|'unsupported';value:string|boolean;options?:string[]};
export async function inspectPdfFields(bytes:Uint8Array):Promise<PdfField[]>{
 const pdf=await PDFDocument.load(bytes);
 return pdf.getForm().getFields().map(field=>field instanceof PDFTextField?{name:field.getName(),type:'text',value:field.getText()??''}:field instanceof PDFCheckBox?{name:field.getName(),type:'checkbox',value:field.isChecked()}:field instanceof PDFDropdown&&!field.isMultiselect()?{name:field.getName(),type:'choice',value:field.getSelected()[0]??'',options:field.getOptions()}:field instanceof PDFRadioGroup?{name:field.getName(),type:'choice',value:field.getSelected()??'',options:field.getOptions()}:{name:field.getName(),type:'unsupported',value:'Este campo se conserva sin modificar.'});
}
export async function processPdfWorkflow(id:PdfWorkflow,files:File[],options:Record<string,unknown>,progress:(value:number)=>void=()=>{}):Promise<Uint8Array>{
 if(!files.length||files.length>2||files.reduce((size,file)=>size+file.size,0)>100*1024*1024)throw new Error('Elige hasta dos PDF, de hasta 100 MB en total.');
 const prepared:File[]=[];
 for(const file of files){
  const pdf=await PDFDocument.load(await file.arrayBuffer()); // Reject encrypted input before upstream ignoreEncryption loaders.
  if(['nup','booklet','divide','reverse','alternate'].includes(id)){
   if(pdf.getForm().getFields().length)pdf.getForm().flatten();
   for(const page of pdf.getPages())page.pushOperators(pushGraphicsState(),popGraphicsState());
   prepared.push(new File([new Uint8Array(await pdf.save())],file.name,{type:'application/pdf'}));
  }else if(id==='forms'&&Array.isArray(options.fields)){
   const fields=options.fields as {fieldName:string;value:unknown}[],cleared=new Set<string>();
   for(const change of fields){const field=pdf.getForm().getFieldMaybe(change.fieldName);if(change.value===''&&(field instanceof PDFDropdown||field instanceof PDFRadioGroup)){field.clear();cleared.add(change.fieldName);}}
   if(cleared.size){prepared.push(new File([new Uint8Array(await pdf.save())],file.name,{type:'application/pdf'}));options={...options,fields:fields.filter(field=>!cleared.has(field.fieldName))};}else prepared.push(file);
  }else prepared.push(file);
 }
 if(id==='flatten'){
  const pdf=await PDFDocument.load(await files[0].arrayBuffer());
  if(!pdf.getForm().getFields().length)throw new Error('Este PDF no contiene campos de formulario.');
  pdf.getForm().flatten();progress(100);return pdf.save();
 }
 const documents=await Promise.all(prepared.map(async file=>PDFDocument.load(await file.arrayBuffer()))),source=documents[0];
 if(id==='metadata'){
  const metadata=(options.metadata??{}) as Record<string,unknown>;
  for(const [key,set] of [['title',source.setTitle],['author',source.setAuthor],['subject',source.setSubject]] as const)if(metadata[key]!==undefined)set.call(source,String(metadata[key]).slice(0,10000));
  if(Array.isArray(metadata.keywords))source.setKeywords(metadata.keywords.map(String).slice(0,100));progress(100);return source.save();
 }
 if(id==='forms'){
  const form=source.getForm();for(const change of (Array.isArray(options.fields)?options.fields:[]) as {fieldName:string;value:unknown}[]){const field=form.getFieldMaybe(change.fieldName);if(!field)throw Error('No se encontró el campo '+change.fieldName);if(field instanceof PDFTextField)field.setText(String(change.value??''));else if(field instanceof PDFCheckBox){if(change.value===true)field.check();else field.uncheck();}else if(field instanceof PDFDropdown||field instanceof PDFRadioGroup){if(change.value==='')field.clear();else field.select(String(change.value));}else throw Error('El tipo del campo '+change.fieldName+' todavía no se puede editar.');}
  if(options.flatten===true)form.flatten();progress(100);return source.save();
 }
 const result=await PDFDocument.create();result.setProducer("Asteoria Folio · motor propio");result.setTitle(source.getTitle()??"Documento ASTEORIA");
 if(id==='reverse'||id==='alternate'){
  if(id==='alternate'&&documents.length!==2)throw Error('Elige dos PDF para intercalarlos.');
  if(id==='reverse'){for(const page of await result.copyPages(source,source.getPageIndices().reverse()))result.addPage(page);}
  else{const pages=await Promise.all(documents.map(doc=>result.copyPages(doc,doc.getPageIndices())));for(let i=0;i<Math.max(...pages.map(p=>p.length));i++)for(const file of pages)if(file[i])result.addPage(file[i]);}
 }else if(id==='divide'){
  const spec=String(options.divisionType??'vertical'),columns=spec==='vertical'?2:spec==='horizontal'?1:spec==='grid-3x3'?3:2,rows=spec==='horizontal'?2:spec==='vertical'?1:columns;
  if(!['vertical','horizontal','grid-2x2','grid-3x3'].includes(spec))throw Error('División no válida.');
  for(let i=0;i<source.getPageCount();i++){const box=source.getPage(i).getCropBox();for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const [page]=await result.copyPages(source,[i]),x=box.x+c*box.width/columns,y=box.y+(rows-r-1)*box.height/rows;page.setMediaBox(x,y,box.width/columns,box.height/rows);page.setCropBox(x,y,box.width/columns,box.height/rows);result.addPage(page);}progress(100*(i+1)/source.getPageCount());}
 }else{
  const papers:Record<string,[number,number]>={A4:[595.28,841.89],A3:[841.89,1190.55],Letter:[612,792],Legal:[612,1008]};
  const size=papers[String(options.pageSize??'A4')];if(!size)throw Error('Papel no válido.');
  const count=id==='booklet'?2:Number(options.pagesPerSheet??2);if(![2,4,9,16].includes(count))throw Error('Elige 2, 4, 9 o 16 páginas por hoja.');
  const columns=count===2?2:Math.sqrt(count),rows=count===2?1:columns,width=count===2?size[1]:size[0],height=count===2?size[0]:size[1];
  const sequence:(number|null)[]=[];
  if(id==='booklet'){const padded=Math.ceil(source.getPageCount()/4)*4;for(let k=0;k<padded/4;k++)for(const index of [padded-1-k*2,k*2,k*2+1,padded-2-k*2])sequence.push(index<source.getPageCount()?index:null);}
  else sequence.push(...source.getPageIndices());
  for(let offset=0;offset<sequence.length;offset+=count){const page=result.addPage([width,height]);for(let cell=0;cell<count;cell++){const index=sequence[offset+cell];if(index===undefined||index===null)continue;const original=source.getPage(index),box=original.getCropBox(),embedded=await result.embedPage(original,{left:box.x,bottom:box.y,right:box.x+box.width,top:box.y+box.height});placePdfPage(page,embedded,original.getRotation().angle,{x:(cell%columns)*width/columns,y:(rows-1-Math.floor(cell/columns))*height/rows,width:width/columns,height:height/rows});}progress(100*Math.min(sequence.length,offset+count)/sequence.length);}
 }
 progress(100);return result.save();
}
function placePdfPage(page:PDFPage,embedded:PDFEmbeddedPage,rotation:number,box:{x:number;y:number;width:number;height:number}){
 const angle=((rotation%360)+360)%360,turned=angle===90||angle===270,width=turned?embedded.height:embedded.width,height=turned?embedded.width:embedded.height,scale=Math.min(box.width/width,box.height/height),x=box.x+(box.width-width*scale)/2,y=box.y+(box.height-height*scale)/2;
 page.drawPage(embedded,{x:x+(angle===180?embedded.width*scale:angle===270?embedded.height*scale:0),y:y+(angle===90?embedded.width*scale:angle===180?embedded.height*scale:0),xScale:scale,yScale:scale,rotate:degrees(-angle)});
}
