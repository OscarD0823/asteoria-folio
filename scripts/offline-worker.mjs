/** Only application resources enter these caches, never user files or projects. */
export function offlineWorker(resources, version) {
  return `// Only application resources are cached. User documents never enter this cache.
const RESOURCES=${JSON.stringify(resources)};
const FILES=Object.keys(RESOURCES);
const PREFIX='prisma-code-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'${version}';
const MANIFEST=new URL('__prisma_resource_hashes__',self.registration.scope).href;
const ALLOWED=new Set(FILES.map(name=>new URL(name,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE),prior=[];
  for(const key of (await caches.keys()).reverse())if(key.startsWith(PREFIX)&&key!==CACHE){
    const previous=await caches.open(key),manifest=await previous.match(MANIFEST);
    if(manifest)try{prior.push({cache:previous,hashes:await manifest.json()});}catch{}
  }
  for(let i=0;i<FILES.length;i+=12)await Promise.all(FILES.slice(i,i+12).map(async name=>{
    const url=new URL(name,self.registration.scope).href;
    if(await cache.match(url))return;
    for(const previous of prior)if(previous.hashes[name]===RESOURCES[name]){
      const response=await previous.cache.match(url);if(response){await cache.put(url,response);return;}
    }
    const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
    if(!response.ok)throw new Error('Application resource unavailable');
    await cache.put(url,response);
  }));
  await cache.put(MANIFEST,new Response(JSON.stringify(RESOURCES),{headers:{'Content-Type':'application/json'}}));
  await self.skipWaiting();
})()));
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
    if(!navigation&&legacyAsset)for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE){
      const previous=await (await caches.open(name)).match(key);if(previous)return previous;
    }
    return fetch(request);
  })());
});
`;
}
