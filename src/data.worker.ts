import initSqlJs from 'sql.js';import {DataDatabase} from './data-core';
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';
let database:DataDatabase|undefined;
const ready=initSqlJs({locateFile:()=>sqlWasm});
self.onmessage=async event=>{const {request,action,bytes,table,sql,row,key}=event.data;try{const SQL=await ready;if(action==='open'){const next=new DataDatabase(SQL,bytes);next.snapshot();database?.close();database=next;}if(!database)throw new Error('Abre una base de datos.');let query;if(action==='sql')query=database.sql(sql);if(action==='insert')database.insert(table,row);if(action==='update')database.update(table,key,row);if(action==='remove')database.remove(table,key);const snapshot=database.snapshot(table),output=database.export();self.postMessage({request,view:{...snapshot,query},bytes:output});}catch(error){self.postMessage({request,error:error instanceof Error?error.message:String(error)});}};
