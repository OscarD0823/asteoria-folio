import {loadModule} from 'hunspell-asm';
import {proofingLanguage} from './proofing-languages';
type Factory=Awaited<ReturnType<typeof loadModule>>;
type Checker=ReturnType<Factory['create']>;
let factory:Promise<Factory>|undefined;
type CachedChecker={promise:Promise<Checker>;users:number;retired:boolean;disposed:boolean};
const cache=new Map<string,CachedChecker>();
const latest=new Map<string,number>();
function release(entry:CachedChecker){if(entry.retired&&entry.users===0&&!entry.disposed){entry.disposed=true;void entry.promise.then(checker=>checker.dispose()).catch(()=>{});}}
function load(base:string,language:string){
 const selected=proofingLanguage(language),key=new URL('spelling/'+selected.id+'/',base).href;
 if(!cache.has(key)){
  while(cache.size>=2){const previous=cache.keys().next().value!,entry=cache.get(previous)!;entry.retired=true;release(entry);cache.delete(previous);}
  factory??=loadModule({timeout:30000});
  const promise=Promise.all(['index.aff','index.dic'].map(async file=>{const response=await fetch(new URL(file,key));if(!response.ok)throw Error('No se pudo cargar el diccionario local de '+selected.label+'. Abre la aplicación con conexión para prepararlo.');return new Uint8Array(await response.arrayBuffer());})).then(async([aff,dic])=>{const module=await factory!,a=module.mountBuffer(aff),d=module.mountBuffer(dic);try{return module.create(a,d);}finally{module.unmount(a);module.unmount(d);}});
  const entry={promise,users:0,retired:false,disposed:false};cache.set(key,entry);void promise.catch(()=>{if(cache.get(key)===entry)cache.delete(key);});
 }
 const entry=cache.get(key)!;entry.users++;return entry;
}
self.onmessage=async({data})=>{
 const language=proofingLanguage(data.language).id;
 if(data.action==='check')latest.set(language,data.id);
 let entry:CachedChecker|undefined;
 try{
  if(!Array.isArray(data.words)||data.words.length>100000||data.words.some((w:unknown)=>typeof w!=='string'||w.length>64))throw Error('La revisión supera el límite de palabras.');
  entry=load(data.baseUrl,language);const dict=await entry.promise;
  if(data.action==='suggest'){self.postMessage({id:data.id,result:dict.suggest(String(data.words[0]).normalize('NFC')).slice(0,6)});return;}
  const result:string[]=[];
  for(let i=0;i<data.words.length;i++){
   if(latest.get(language)!==data.id){self.postMessage({id:data.id,result:[]});return;}
   const word=String(data.words[i]).normalize('NFC');if(!dict.spell(word))result.push(word);
   if(i%300===299)await new Promise(resolve=>setTimeout(resolve,0));
  }
  self.postMessage({id:data.id,result});
 }catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:'No se pudo revisar el texto.'});}finally{if(entry){entry.users--;release(entry);}}
};
