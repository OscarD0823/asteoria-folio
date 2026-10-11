import {PDFDocument,PDFTextField,PDFCheckBox,PDFDropdown,PDFRadioGroup,pushGraphicsState,popGraphicsState} from 'pdf-lib';
import * as craft from '../vendor/pdfcraft/dist/index.mjs';
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
 const constructors={reverse:craft.ReversePagesPDFProcessor,nup:craft.NUpPDFProcessor,booklet:craft.BookletPDFProcessor,divide:craft.DividePagesPDFProcessor,alternate:craft.AlternateMergePDFProcessor,metadata:craft.EditMetadataPDFProcessor,forms:craft.FormFillerProcessor};
 const processor=new constructors[id]();
 const result=await processor.process({files:prepared,options},(value:number)=>progress(value));
 if(!result.success||!(result.result instanceof Blob))throw new Error([result.error?.message??'No se pudo procesar el PDF.',result.error?.details].filter(Boolean).join(' '));
 return new Uint8Array(await result.result.arrayBuffer());
}
