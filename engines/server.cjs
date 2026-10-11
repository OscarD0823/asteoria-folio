const http=require('node:http'),crypto=require('node:crypto');const local=require('./local.cjs');
async function startLocalEngine(){const token=crypto.randomBytes(32).toString('hex'),allowed=new Set(['https://oscard0823.github.io']);let running=false;
 const server=http.createServer(async(request,response)=>{const origin=request.headers.origin;let accepted=allowed.has(origin);try{const url=new URL(origin);accepted||=url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname);}catch{}
  if(!accepted){response.writeHead(403);response.end();return;}response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Vary','Origin');response.setHeader('Cache-Control','no-store');response.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');response.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');response.setHeader('Access-Control-Allow-Private-Network','true');
  if(request.method==='OPTIONS'){response.writeHead(204);response.end();return;}if(request.headers.authorization!=='Bearer '+token){response.writeHead(401);response.end();return;}
  response.setHeader('Content-Type','application/json');let ownsOperation=false;try{
   if(request.url==='/capabilities'&&request.method==='GET'){response.end(JSON.stringify(await local.capabilities()));return;}
   if(request.url!=='/run'||request.method!=='POST'){response.writeHead(404);response.end();return;}if(running){response.writeHead(409);response.end(JSON.stringify({error:'Hay otra operación local en curso.'}));return;}
   running=true;ownsOperation=true;let total=0;const chunks=[];for await(const chunk of request){total+=chunk.length;if(total>113*1024*1024)throw new Error('La solicitud supera el límite local.');chunks.push(chunk);}const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));const result=await local.run(payload);response.end(JSON.stringify(result));
  }catch(error){response.writeHead(400);response.end(JSON.stringify({error:error.message}));}finally{if(ownsOperation)running=false;}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;return {server,port,token,url:'https://oscard0823.github.io/prisma-pdf/writer/#prisma-engine='+token+'&port='+port};
}
module.exports={startLocalEngine};
if(require.main===module)startLocalEngine().then(result=>{console.log('Motor local iniciado en 127.0.0.1:'+result.port);console.log('Abre este enlace privado para vincular Prisma: '+result.url);});
