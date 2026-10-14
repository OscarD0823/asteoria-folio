import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';import{spawnSync}from'node:child_process';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),kind=JSON.parse(fs.readFileSync(path.join(app,'application.json'))).product;
const root=process.env.ASTEORIA_WORKSPACE_ROOT??path.resolve(app,'../../asteoria');
if(!fs.existsSync(path.join(root,'workspace.lock.json')))throw Error('Abre el entorno ASTEORIA o define ASTEORIA_WORKSPACE_ROOT.');
const run=(args,env={})=>{const r=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env:{...process.env,...env}});if(r.status!==0)throw Error('Falló '+args.join(' '));};
run(['scripts/workspace.mjs','sync','--use',kind+'='+app]);
const task=process.argv[2]??'dev';if(task==='dev')run(['scripts/workspace.mjs','dev',kind]);else if(task==='build')run(['scripts/build-product.mjs',kind],{PRISMA_OUTDIR:path.join(app,'dist')});else if(task==='test')run(['scripts/test-workspace.mjs']);else throw Error('Usa dev, build o test.');
