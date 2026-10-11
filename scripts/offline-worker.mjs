/** Only application resources enter these caches, never user files or projects. */
export function offlineWorker(resources, version, required = Object.keys(resources)) {
  return `// Only application resources are cached. User documents never enter this cache.
const RESOURCES=${JSON.stringify(resources)};
const FILES=Object.keys(RESOURCES), REQUIRED=${JSON.stringify(required)};
const PREFIX='prisma-code-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'${version}';
const MANIFEST=new URL('__prisma_resource_hashes__',self.registration.scope).href;
const ALLOWED=new Set(FILES.map(name=>new URL(name,self.registration.scope).href));
const pending=new Map(), observers=new Set();
let download=null, failure='';
async function resource(name, prior=[]){
  const url=new URL(name,self.registration.scope).href,cache=await caches.open(CACHE);
  const found=await cache.match(url);if(found)return found;
  if(pending.has(name))return (await pending.get(name)).clone();
  const task=(async()=>{
    for(const previous of prior)if(previous.hashes[name]===RESOURCES[name]){
      const response=await previous.cache.match(url);if(response){await cache.put(url,response.clone());return response;}
    }
    const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
    if(!response.ok)throw new Error('No se pudo descargar '+name);
    await cache.put(url,response.clone());return response;
  })();
  pending.set(name,task);
  try{return (await task).clone();}finally{pending.delete(name);}
}
async function previousCaches(){
  const prior=[];
  for(const key of (await caches.keys()).reverse())if(key.startsWith(PREFIX)&&key!==CACHE){
    const cache=await caches.open(key),manifest=await cache.match(MANIFEST);
    if(manifest)try{prior.push({cache,hashes:await manifest.json()});}catch{}
  }return prior;
}
async function status(){
  const cache=await caches.open(CACHE), urls=new Set((await cache.keys()).map(request=>request.url));
  const present=new Set(FILES.filter(name=>urls.has(new URL(name,self.registration.scope).href)));
  const fonts=FILES.filter(name=>name.replace(/^\\.\\.\\//,'').startsWith('fonts/')&&/\\.(ttf|otf|woff2?)$/i.test(name));
  return {type:'prisma-offline-status',version:'${version}',ready:REQUIRED.every(name=>present.has(name)),
    cached:present.size,total:FILES.length,fontsCached:fonts.filter(name=>present.has(name)).length,
    fontsTotal:fonts.length,downloading:!!download,error:failure};
}
async function broadcast(){
  const state=await status();for(const port of observers)try{port.postMessage(state);}catch{observers.delete(port);}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE),prior=await previousCaches();
  for(let i=0;i<REQUIRED.length;i+=8)await Promise.all(REQUIRED.slice(i,i+8).map(name=>resource(name,prior)));
  // Carry forward previously downloaded optional fonts without downloading unused ones.
  const optional=FILES.filter(name=>!REQUIRED.includes(name));
  for(let i=0;i<optional.length;i+=8)await Promise.all(optional.slice(i,i+8).map(async name=>{
    const url=new URL(name,self.registration.scope).href;
    for(const previous of prior)if(previous.hashes[name]===RESOURCES[name]){
      const response=await previous.cache.match(url);if(response){try{await cache.put(url,response);}catch{}return;}
    }
  }));
  // Recording a hash never substitutes for checking whether the file is present.
  await cache.put(MANIFEST,new Response(JSON.stringify(RESOURCES),{headers:{'Content-Type':'application/json'}}));
  await self.skipWaiting();
})()));
self.addEventListener('message',event=>{
  if(!['prisma-offline-status','prisma-cache-all'].includes(event.data?.type))return;
  const port=event.ports?.[0];if(!port)return;
  if(event.data.type==='prisma-offline-status'){event.waitUntil(status().then(state=>port.postMessage(state)));return;}
  observers.add(port);
  if(!download){
    failure='';
    download=(async()=>{
      const prior=await previousCaches();
      for(let i=0;i<FILES.length;i+=4){await Promise.all(FILES.slice(i,i+4).map(name=>resource(name,prior)));await broadcast();}
    })().catch(error=>{failure=error?.name==='QuotaExceededError'?'El dispositivo no tiene espacio suficiente. Puedes liberar espacio y reintentar.':'No se completó la descarga. Revisa tu conexión y reintenta.';})
      .finally(async()=>{download=null;await broadcast();observers.clear();});
  }
  event.waitUntil(Promise.all([broadcast(),download]));
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const prior=(await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==CACHE);
  for(const key of prior.slice(0,-1))await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==new URL(self.registration.scope).origin)return;
  const clean=url.origin+url.pathname;
  if(request.cache==='no-store'||clean===new URL('version.json',self.registration.scope).href)return;
  const navigation=request.mode==='navigate'&&(clean===self.registration.scope||clean===new URL('index.html',self.registration.scope).href);
  const legacyAsset=['assets/','fonts/','engine/','pdfjs/'].some(dir=>clean.startsWith(new URL(dir,self.registration.scope).href));
  if(!navigation&&!ALLOWED.has(clean)&&!legacyAsset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=navigation?new URL('index.html',self.registration.scope).href:clean;
    const cached=await cache.match(key);if(cached)return cached;
    if(!navigation&&legacyAsset)for(const previous of await previousCaches()){
      const relative=decodeURIComponent(new URL(key).pathname.slice(new URL(self.registration.scope).pathname.length));
      if(ALLOWED.has(clean)&&previous.hashes[relative]!==RESOURCES[relative])continue;
      const response=await previous.cache.match(key);if(response)return response;
    }
    const response=await fetch(request);
    // A cache quota error must not hide a successful online font response.
    if(ALLOWED.has(clean)&&response.ok)try{await cache.put(key,response.clone());}catch{}
    return response;
  })());
});
`;
}
