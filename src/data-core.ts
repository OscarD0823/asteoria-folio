import type {Database,SqlJsStatic,SqlValue} from 'sql.js';
export type DataColumn={name:string;type:string;pk:number;notnull:number;dflt_value:SqlValue};
export type DataTable={name:string;type:string;sql:string};
export type DataView={tables:DataTable[];table:string;columns:DataColumn[];rows:Record<string,SqlValue>[];keys:Record<string,SqlValue>[];count:number;relations:Record<string,SqlValue>[];query?:{columns:string[];values:SqlValue[][];truncated:boolean}[]};
export const sqlName=(name:string)=>'"'+name.replaceAll('"','""')+'"';
export class DataDatabase{
 db:Database;
 constructor(SQL:SqlJsStatic,bytes?:Uint8Array){if(bytes&&bytes.length>80*1024*1024)throw new Error('Usa una base de datos de hasta 80 MB.');this.db=new SQL.Database(bytes);this.db.run('PRAGMA foreign_keys=ON');}
 snapshot(table=''):DataView{
  const tables=this.db.exec("SELECT name,type,sql FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values.map(row=>({name:String(row[0]),type:String(row[1]),sql:String(row[2])}))??[];
  table=tables.some(t=>t.name===table)?table:tables[0]?.name??'';
  if(!table)return {tables,table:'',columns:[],rows:[],keys:[],count:0,relations:[]};
  const objects=(sql:string)=>{const statement=this.db.prepare(sql),result:Record<string,SqlValue>[]=[];try{while(statement.step())result.push(statement.getAsObject());return result;}finally{statement.free();}};
  const columns=objects('PRAGMA table_info('+sqlName(table)+')') as unknown as DataColumn[],relations=objects('PRAGMA foreign_key_list('+sqlName(table)+')');
  const rowid=['rowid','_rowid_','oid'].find(key=>!columns.some(c=>c.name.toLowerCase()===key));
  let hasRowId=!!rowid;const alias='__prisma_key_'+crypto.randomUUID().replaceAll('-','');let rows:Record<string,SqlValue>[];
  try{if(!rowid)throw new Error('Sin rowid interno');rows=objects('SELECT '+rowid+' AS '+sqlName(alias)+',* FROM '+sqlName(table)+' LIMIT 500');}catch{hasRowId=false;rows=objects('SELECT * FROM '+sqlName(table)+' LIMIT 500');}
  const keys=rows.map(row=>columns.some(c=>c.pk)?Object.fromEntries(columns.filter(c=>c.pk).map(c=>[c.name,row[c.name]])):hasRowId?{[rowid!]:row[alias]}:{});
  if(hasRowId)for(const row of rows)delete row[alias];
  const count=Number(this.db.exec('SELECT COUNT(*) FROM '+sqlName(table))[0]?.values[0]?.[0]??0);
  return {tables,table,columns,relations,rows,keys,count};
 }
 sql(sql:string){if(sql.length>100_000)throw new Error('La consulta supera 100.000 caracteres.');const results:NonNullable<DataView['query']>=[];let count=0;this.db.run('BEGIN');try{for(const statement of this.db.iterateStatements(sql)){try{if(++count>100)throw new Error('Ejecuta hasta 100 sentencias por operación.');const values:SqlValue[][]=[];let truncated=false;while(statement.step()){if(values.length===500){truncated=true;break;}values.push(statement.get());}results.push({columns:statement.getColumnNames(),values,truncated});}finally{statement.free();}}this.db.run('COMMIT');return results;}catch(error){this.db.run('ROLLBACK');throw error;}}
 insert(table:string,row:Record<string,SqlValue>){const fields=Object.keys(row);if(!fields.length)this.db.run('INSERT INTO '+sqlName(table)+' DEFAULT VALUES');else this.db.run('INSERT INTO '+sqlName(table)+'('+fields.map(sqlName).join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')',fields.map(field=>row[field]));}
 update(table:string,key:Record<string,SqlValue>,row:Record<string,SqlValue>){const fields=Object.keys(row),keys=Object.keys(key);if(!keys.length)throw new Error('Esta vista no tiene una clave para editar registros.');this.db.run('UPDATE '+sqlName(table)+' SET '+fields.map(f=>sqlName(f)+'=?').join(',')+' WHERE '+keys.map(k=>sqlName(k)+' IS ?').join(' AND '),[...fields.map(f=>row[f]),...keys.map(k=>key[k])]);}
 remove(table:string,key:Record<string,SqlValue>){const keys=Object.keys(key);if(!keys.length)throw new Error('Esta vista no tiene una clave para eliminar registros.');this.db.run('DELETE FROM '+sqlName(table)+' WHERE '+keys.map(k=>sqlName(k)+' IS ?').join(' AND '),keys.map(k=>key[k]));}
 export(){const bytes=this.db.export();this.db.run('PRAGMA foreign_keys=ON');return bytes;}
 close(){this.db.close();}
}
