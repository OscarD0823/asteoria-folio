export type MacroValue=string|number|boolean|null;
export type MacroOperation={op:string;args:Record<string,MacroValue>};
export type MacroSnapshot={revision:string;values?:Record<string,MacroValue>;text?:string;activeSheet?:string;sheetNames?:string[];formulas?:Record<string,string>;namedExpressions?:{name:string;expression:string;scope?:number}[]};
export type MacroBridge={operations:string[];snapshot:()=>Promise<MacroSnapshot>|MacroSnapshot;apply:(operations:MacroOperation[],revision:string)=>Promise<void|string>};
export type MacroPlan={operations:MacroOperation[];logs:string[];revision:string;name:string};
export const macroLimits={bytes:100000,steps:5000,nesting:12,repeats:1000,text:100000};
const scalar=(v:unknown):v is MacroValue=>v===null||['string','number','boolean'].includes(typeof v);
export function readPrismaMacro(text:string){
 if(text.length>macroLimits.bytes)throw Error('La macro supera 100.000 caracteres.');
 const macro=JSON.parse(text);if(!macro||macro.version!==1||!Array.isArray(macro.steps)||typeof macro.name!=='string')throw Error('Usa una macro Prisma con version: 1, name y steps.');
 const inspect=(value:unknown,depth=0)=>{if(depth>40)throw Error('La macro contiene demasiados niveles.');if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Nombre no permitido: '+key);inspect(child,depth+1);}else if(typeof value==='number'&&!Number.isFinite(value))throw Error('Número no válido.');};inspect(macro);return macro;
}
export function planPrismaMacro(text:string,snapshot:MacroSnapshot,allowed:string[]):MacroPlan{
 const macro=readPrismaMacro(text),vars=new Map<string,MacroValue>(),values={...snapshot.values},operations:MacroOperation[]=[],logs:string[]=[];let steps=0;
 const tick=()=>{if(++steps>macroLimits.steps)throw Error('La macro supera 5.000 pasos.');};
 function evaluate(value:any,depth=0):MacroValue{
  tick();if(depth>macroLimits.nesting)throw Error('La expresión contiene demasiados niveles.');if(scalar(value)){if(typeof value==='string'&&value.length>macroLimits.text)throw Error('Texto demasiado largo.');return value;}
  if(!value||Array.isArray(value)||Object.keys(value).length!==1)throw Error('Expresión no válida.');
  const [op,args]=Object.entries(value)[0];
  if(op==='var'){if(!vars.has(String(args)))throw Error('Variable inexistente: '+args);return vars.get(String(args))!;}
  if(op==='read')return values[String(args)]??null;
  if(op==='text')return snapshot.text??'';
  if(!Array.isArray(args))throw Error('Los argumentos de '+op+' deben ser una lista.');const list=args.map(v=>evaluate(v,depth+1));
  if(op==='concat'){const text=list.map(v=>String(v??'')).join('');if(text.length>macroLimits.text)throw Error('Texto demasiado largo.');return text;}
  if(op==='eq')return list.length===2&&list[0]===list[1];
  if(op==='gt'||op==='lt'){if(list.length!==2||list.some(v=>typeof v!=='number'))throw Error('La comparación requiere dos números.');return op==='gt'?Number(list[0])>Number(list[1]):Number(list[0])<Number(list[1]);}
  if(op==='not'){if(list.length!==1)throw Error('not requiere un argumento.');return !list[0];}
  if(op==='and')return list.every(Boolean);if(op==='or')return list.some(Boolean);
  if(!['add','multiply','subtract','divide'].includes(op)||!list.length||list.some(v=>typeof v!=='number'))throw Error('Operación numérica no válida: '+op);
  const result=list.reduce<number>((total,n,i)=>i===0?Number(n):op==='add'?total+Number(n):op==='multiply'?total*Number(n):op==='subtract'?total-Number(n):total/Number(n),0);if(!Number.isFinite(result))throw Error('El cálculo no produce un número finito.');return result;
 }
 function run(list:any[],depth=0){if(!Array.isArray(list)||depth>macroLimits.nesting)throw Error('Bloque de macro no válido.');for(const step of list){tick();if(!step||typeof step!=='object'||Array.isArray(step))throw Error('Paso de macro no válido.');
  if(step.let){const name=String(step.let.name);if(!/^[\p{L}_][\p{L}\p{N}_]{0,63}$/u.test(name))throw Error('Nombre de variable no válido.');vars.set(name,evaluate(step.let.value));}
  else if(step.repeat!==undefined){const count=evaluate(step.repeat);if(typeof count!=='number'||!Number.isInteger(count)||count<0||count>macroLimits.repeats)throw Error('Repite entre 0 y 1.000 veces.');const name=String(step.as??'i'),previous=vars.get(name),had=vars.has(name);for(let i=1;i<=count;i++){vars.set(name,i);run(step.steps,depth+1);}if(had)vars.set(name,previous!);else vars.delete(name);}
  else if(step.if!==undefined)run(evaluate(step.if)?step.then:step.else??[],depth+1);
  else if(step.log!==undefined){if(logs.length>=500)throw Error('Demasiadas salidas.');logs.push(String(evaluate(step.log)??''));}
  else if(typeof step.op==='string'){if(!allowed.includes(step.op))throw Error('Este documento no admite la operación '+step.op);const args:Record<string,MacroValue>={};if(!step.args||typeof step.args!=='object'||Array.isArray(step.args))throw Error('La operación necesita args.');for(const [key,value] of Object.entries(step.args))args[key]=evaluate(value);operations.push({op:step.op,args});if(step.op==='setCell')values[String(args.sheet)+'!'+String(args.cell)]=args.value;if(operations.length>1000)throw Error('La macro supera 1.000 cambios.');}
  else throw Error('Paso desconocido.');
 }}
 run(macro.steps);return {name:macro.name.slice(0,100),operations,logs,revision:snapshot.revision};
}
export function macroExample(kind:string){
 const steps=kind==='sheets'?[{repeat:5,as:'i',steps:[{op:'setCell',args:{sheet:'Hoja1',cell:{concat:['A',{var:'i'}]},value:{multiply:[{var:'i'},10]}}}]},{log:'Se prepararon cinco valores.'}]:kind==='slides'||kind==='publisher'?[{op:'replaceText',args:{find:'idea',replace:'proyecto'}},{log:'Se preparó el reemplazo de texto.'}]:kind==='data'?[{op:'sql',args:{query:'SELECT name FROM sqlite_master WHERE type = \'table\''}}]:[{op:'replaceText',args:{find:'documento',replace:'trabajo'}},{log:'Se preparó el reemplazo en el documento.'}];
 return JSON.stringify({version:1,name:'Mi primera macro Prisma',steps},null,2);
}
