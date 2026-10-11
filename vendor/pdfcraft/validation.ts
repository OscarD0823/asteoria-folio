import {PDFDocument} from 'pdf-lib';
import {PDFErrorCode,ErrorCategory} from './src/types/pdf';
const error=(message:string)=>({code:PDFErrorCode.INVALID_OPTIONS,category:ErrorCategory.VALIDATION_ERROR,message,recoverable:true});
export function validateFile(file:File,options:{maxSize:number;acceptedTypes:string[]}){
 const valid=file.size>0&&file.size<=options.maxSize&&(options.acceptedTypes.includes(file.type)||/\.pdf$/i.test(file.name));
 return {valid,errors:valid?[]:[error('Elige un PDF válido de hasta 100 MB.')]};
}
export async function validatePdfStructure(file:File){
 try{await PDFDocument.load(await file.arrayBuffer());return {valid:true,errors:[]};}
 catch{return {valid:false,errors:[error('No se pudo abrir el PDF. Desbloquea los documentos cifrados antes de usar estas herramientas.')]};}
}
