import test from 'node:test';import assert from 'node:assert/strict';import initSqlJs from 'sql.js';import {DataDatabase} from '../src/data-core';
test('Prisma Data preserves SQL relations, rejects invalid keys and rolls back failed batches',async()=>{
 const SQL=await initSqlJs(),database=new DataDatabase(SQL);
 database.sql('CREATE TABLE equipo(id INTEGER PRIMARY KEY,nombre TEXT); CREATE TABLE tarea(id INTEGER PRIMARY KEY,equipo_id INTEGER REFERENCES equipo(id),valor REAL); INSERT INTO equipo VALUES(1,\'Prisma\');');
 database.insert('tarea',{id:1,equipo_id:1,valor:12.5});assert.throws(()=>database.insert('tarea',{id:2,equipo_id:99}),/FOREIGN KEY/);
 database.update('tarea',{id:1},{valor:20});assert.equal(database.snapshot('tarea').rows[0].valor,20);
 assert.throws(()=>database.sql("INSERT INTO equipo VALUES(2,'Temporal');INSERT INTO tarea VALUES(3,99,5);"),/FOREIGN KEY/);assert.equal(database.snapshot('equipo').count,1);
 const original=database.export(),restored=new DataDatabase(SQL,original);assert.equal(restored.snapshot('tarea').relations[0].table,'equipo');assert.equal(restored.snapshot('tarea').rows[0].valor,20);
 restored.remove('tarea',{id:1});assert.equal(restored.snapshot('tarea').count,0);database.close();restored.close();
});
test('Data handles shadowed rowid, compound primary keys and limits query previews',async()=>{
 const SQL=await initSqlJs(),database=new DataDatabase(SQL);database.sql('CREATE TABLE ejemplo(rowid TEXT,nombre TEXT); INSERT INTO ejemplo VALUES(\'igual\',\'uno\'),(\'igual\',\'dos\'); CREATE TABLE clave(a INTEGER,b INTEGER,PRIMARY KEY(a,b)) WITHOUT ROWID; INSERT INTO clave VALUES(1,2);');
 const snapshot=database.snapshot('ejemplo');database.update('ejemplo',snapshot.keys[0],{nombre:'Editado'});assert.deepEqual(database.snapshot('ejemplo').rows.map(r=>r.nombre),['Editado','dos']);assert.deepEqual(database.snapshot('clave').keys[0],{a:1,b:2});
 const result=database.sql('WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000) SELECT x FROM n;')[0];assert.equal(result.values.length,500);assert.equal(result.truncated,true);database.close();
});
