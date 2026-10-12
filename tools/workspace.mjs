import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),kind=JSON.parse(fs.readFileSync(path.join(app,'package.json'))).name.split('/').at(-1);
const candidates=[process.env.PRISMA_WORKSPACE_ROOT,path.resolve(app,'../prisma'),path.resolve(app,'../Prisma-Paginas/prisma')].filter(Boolean);
let root=candidates.find(dir=>fs.existsSync(path.join(dir,'workspace.lock.json')));
const run=(exe,args,cwd,env={})=>{const r=spawnSync(exe,args,{cwd,env:{...process.env,...env},stdio:'inherit'});if(r.status!==0)throw Error('Falló '+args.join(' '));};
if(!root){root=path.resolve(app,'../prisma-workspace');if(fs.existsSync(root))throw Error('Selecciona PRISMA_WORKSPACE_ROOT; la carpeta prisma-workspace ya existe.');run('git',['clone','https://github.com/OscarD0823/prisma.git',root],path.dirname(app));}
run(process.execPath,['scripts/workspace.mjs','sync','--use',kind+'='+app],root);
const task=process.argv[2]??'dev',pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
if(!fs.existsSync(path.join(root,'node_modules')))run(pnpm,['install','--frozen-lockfile'],root);
if(task==='dev')run(process.execPath,['scripts/workspace.mjs','dev',kind],root);
else if(task==='build')run(process.execPath,['scripts/build-product.mjs',kind],root,{PRISMA_OUTDIR:path.join(app,'dist')});
else if(task==='test')run(pnpm,['test'],root);
else if(task==='publish')run(process.execPath,['scripts/workspace.mjs','publish',kind],root);
else throw Error('Comando desconocido.');
