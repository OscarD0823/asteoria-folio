import {parseDictionaryFiles} from './dictionary-formats';
self.onmessage=async event=>{try{self.postMessage({entries:await parseDictionaryFiles(event.data.files)});}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
