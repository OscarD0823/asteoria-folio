import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createServer} from 'node:http';
const require=createRequire(import.meta.url),local=require('../engines/local.cjs'),{startLocalEngine}=require('../engines/server.cjs');
test('PC bridge restricts endpoints and origins, authenticates and preserves local PPTX',async()=>{
 for(const url of ['https://example.com','file:///x','http://127.0.0.1.evil.test','http://user:pass@localhost'])assert.throws(()=>local.localUrl(url));
 const {server,port,token}=await startLocalEngine();try{
 const base='http://127.0.0.1:'+port,headers={Origin:'http://127.0.0.1:4305',Authorization:'Bearer '+token,'Content-Type':'application/json'};
 assert.equal((await fetch(base+'/capabilities',{headers:{...headers,Origin:'https://example.com'}})).status,403);assert.equal((await fetch(base+'/capabilities',{headers:{Origin:headers.Origin}})).status,401);
 const engine=require('../engines/dist/pptx.cjs'),bytes=await engine.createBlankPptx(),response=await fetch(base+'/run',{method:'POST',headers,body:JSON.stringify({engine:'prisma',extension:'pptx',bytes:Buffer.from(bytes).toString('base64')})}),result=await response.json();assert.equal(response.status,200);assert.equal(result.slides,1);assert.deepEqual(Buffer.from(result.bytes,'base64'),Buffer.from(bytes));
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
test('PC bridge keeps an operation locked when capabilities are read concurrently',async()=>{
 let release:()=>void=()=>{},entered:()=>void=()=>{};const ready=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>release=r);
 const service=createServer(async(_q,res)=>{entered();await hold;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({_embedded:{elements:[{id:1,name:'Proyecto local'}]}}));});await new Promise<void>(r=>service.listen(0,'127.0.0.1',r));
 const {server,port,token}=await startLocalEngine(),headers={Origin:'http://127.0.0.1:4305',Authorization:'Bearer '+token,'Content-Type':'application/json'},body=JSON.stringify({engine:'openproject',url:'http://127.0.0.1:'+(service.address() as any).port});try{
 const pending=fetch('http://127.0.0.1:'+port+'/run',{method:'POST',headers,body});await ready;assert.equal((await fetch('http://127.0.0.1:'+port+'/capabilities',{headers})).status,200);assert.equal((await fetch('http://127.0.0.1:'+port+'/run',{method:'POST',headers,body})).status,409);release();assert.equal((await (await pending).json()).projects[0].name,'Proyecto local');
 }finally{release();await Promise.all([new Promise<void>(r=>server.close(()=>r())),new Promise<void>(r=>service.close(()=>r()))]);}
});
