import { nativeOperation } from './native-core';
self.onmessage=async(event)=>{const {id,request}=event.data;try{const result=await nativeOperation(request);self.postMessage({id,result});}catch(error){self.postMessage({id,error:error instanceof Error?error.message:'No se pudo editar el PDF.'});}};
