import {processPdfWorkflow} from './pdf-workflows';
self.onmessage=async(event)=>{const {id,files,options}=event.data;try{
 const bytes=await processPdfWorkflow(id,files,options,value=>self.postMessage({progress:value}));
 (self as unknown as {postMessage:(value:unknown,transfer:Transferable[])=>void}).postMessage({bytes},[bytes.buffer as ArrayBuffer]);
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'No se pudo procesar el PDF.'});}};
