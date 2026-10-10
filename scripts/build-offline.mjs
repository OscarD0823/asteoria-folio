import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (
      ![
        "sw.js",
        "prisma-pdf-source.tar.gz",
        "LICENSE.txt",
        "licencias.txt",
      ].includes(entry.name) &&
      !full.includes("third-party")
    )
      files.push(full.replaceAll("\\", "/").replace(/^dist\//, ""));
  }
}
walk("dist");
files.sort();
const hash = crypto.createHash("sha256");
for (const name of files)
  hash.update(name).update(fs.readFileSync(path.join("dist", name)));
const version = hash.digest("hex").slice(0, 16);
fs.writeFileSync(
  "dist/sw.js",
  `// Only application resources are cached. User documents never enter this cache.
const FILES=${JSON.stringify(files)};
const PREFIX='prisma-code-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'${version}';
const ALLOWED=new Set(FILES.map(name=>new URL(name,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(let i=0;i<FILES.length;i+=12)await cache.addAll(FILES.slice(i,i+12).map(name=>new URL(name,self.registration.scope).href));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==new URL(self.registration.scope).origin)return;const clean=url.origin+url.pathname;
const navigation=request.mode==='navigate'&&(clean===self.registration.scope||clean===new URL('index.html',self.registration.scope).href);
if(!navigation&&!ALLOWED.has(clean))return;
event.respondWith((async()=>{const cache=await caches.open(CACHE),key=navigation?new URL('index.html',self.registration.scope).href:clean;const cached=await cache.match(key);if(cached)return cached;return fetch(request);})());});
`,
);
console.log(
  `Offline cache: ${files.length} application resources, version ${version}`,
);
