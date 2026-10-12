import {macroLimits,type MacroValue,type MacroPlan,type MacroSnapshot} from './prisma-macros';
import ExcelJS from 'exceljs';
import {SheetsBook,parseAddress,columnName} from './sheets-core';
import {vbaProcedures} from './vba-source';
export {vbaProcedures,vbaExample} from './vba-source';
type Ref={sheet:string;cells:string[];property:'value'|'formula'};
type Value=MacroValue|Ref;
type Statement={kind:'line';text:string;line:number}|{kind:'for';name:string;start:string;end:string;step:string;body:Statement[];line:number}|{kind:'if';condition:string;yes:Statement[];no:Statement[];line:number};
const ref=(v:Value):v is Ref=>v!==null&&typeof v==='object';
function cleanLine(line:string){let quote=false,result='';for(let i=0;i<line.length;i++){if(line[i]==='"'){result+=line[i];if(quote&&line[i+1]==='"'){result+=line[++i];continue;}quote=!quote;}else if(line[i]==="'"&&!quote)break;else result+=line[i];}return result.trim();}

/** A bounded VBA interpreter for worksheet macros. Imported code never runs automatically. */
export function planVbaMacro(source:string,snapshot:MacroSnapshot,procedure=vbaProcedures(source)[0],defaultSheet=snapshot.activeSheet??'Hoja1'):MacroPlan {
 if(source.length>macroLimits.bytes)throw Error('El módulo VBA supera 100.000 caracteres.');
 if(!procedure)throw Error('El módulo necesita un Sub sin argumentos.');
 if(!vbaProcedures(source).includes(procedure))throw Error('Selecciona un Sub existente sin argumentos.');
 const rows=source.replace(/_\s*\r?\n/g,' ').split(/\r?\n/).map((text,i)=>({text:cleanLine(text),line:i+1}));
 const start=rows.findIndex(row=>new RegExp('^(?:(?:Public|Private)\\s+)?Sub\\s+'+procedure+'\\s*\\(\\s*\\)','i').test(row.text));
 if(start<0)throw Error('No se encontró el procedimiento VBA.');
 const finish=rows.findIndex((row,i)=>i>start&&/^End\s+Sub$/i.test(row.text));if(finish<0)throw Error('El procedimiento necesita End Sub.');
 const lines=rows.slice(start+1,finish).filter(row=>row.text);let at=0;
 function parse(stops:RegExp,depth=0):Statement[]{if(depth>macroLimits.nesting)throw Error('Demasiados bloques VBA anidados.');const result:Statement[]=[];while(at<lines.length&&!stops.test(lines[at].text)){const row=lines[at++],loop=/^For\s+(\w+)\s*=\s*(.+?)\s+To\s+(.+?)(?:\s+Step\s+(.+))?$/i.exec(row.text),condition=/^If\s+(.+?)\s+Then\s*$/i.exec(row.text);
  if(loop){const body=parse(/^Next(?:\s|$)/i,depth+1);if(at>=lines.length)throw Error('Falta Next para la línea '+row.line);at++;result.push({kind:'for',name:loop[1],start:loop[2],end:loop[3],step:loop[4]??'1',body,line:row.line});}
  else if(condition){const yes=parse(/^(?:Else|End\s+If)$/i,depth+1);let no:Statement[]=[];if(/^Else$/i.test(lines[at]?.text??'')){at++;no=parse(/^End\s+If$/i,depth+1);}if(!/^End\s+If$/i.test(lines[at]?.text??''))throw Error('Falta End If para la línea '+row.line);at++;result.push({kind:'if',condition:condition[1],yes,no,line:row.line});}
  else result.push({kind:'line',...row});
 }return result;}
 const program=parse(/^$/),variables=new Map<string,Value>(),values={...snapshot.values},formulas={...snapshot.formulas},operations:MacroPlan['operations']=[],logs:string[]=[];let steps=0;
 const tick=()=>{if(++steps>macroLimits.steps)throw Error('VBA supera el límite de 5.000 pasos.');};
 let preview:SheetsBook|undefined;
 function calculated(sheet:string,cell:string):MacroValue {
  const key=sheet+'!'+cell;if(!preview&&operations.length&&Object.keys(formulas).length){
   const workbook=new ExcelJS.Workbook();for(const name of snapshot.sheetNames??[...new Set([defaultSheet,...Object.keys(values).map(key=>key.slice(0,key.lastIndexOf('!')))])])workbook.addWorksheet(name);
   for(const key of new Set([...Object.keys(values),...Object.keys(formulas)])){const split=key.lastIndexOf('!'),name=key.slice(0,split),address=key.slice(split+1);if(!parseAddress(address))continue;const cell=workbook.getWorksheet(name)?.getCell(address);if(cell)cell.value=formulas[key]?{formula:formulas[key].replace(/^=/,'')}:values[key]??null;}
   preview=new SheetsBook(workbook);if(snapshot.namedExpressions?.length){preview.namedExpressions=snapshot.namedExpressions;preview.rebuild();}
  }
  if(preview){const pos=parseAddress(cell)!;const result=preview.value(sheet,pos.row,pos.col);if(typeof result==='string'&&/^#(?:DIV|VALUE|REF|NAME|NUM|N\/A|CYCLE|ERROR)/.test(result))throw Error('La celda '+key+' devuelve '+result);return result as MacroValue??null;}
  return values[key]??null;
 }
 const scalar=(value:Value):MacroValue=>{if(!ref(value))return value;if(value.cells.length!==1)throw Error('Usa una celda individual o una función de agregación para leer un rango.');const key=value.sheet+'!'+value.cells[0];if(value.property==='formula')return formulas[key]??values[key]??null;return calculated(value.sheet,value.cells[0]);};
 const numeric=(value:Value)=>{const v=scalar(value),number=v===true?-1:v===false||v===null?0:Number(v);if(!Number.isFinite(number))throw Error('VBA necesita un valor numérico.');return number;};
 const string=(value:Value)=>String(scalar(value)??'');
 const banker=(value:number,digits=0)=>{const scale=10**digits,n=value*scale,floor=Math.floor(n),fraction=n-floor;return (Math.abs(fraction-.5)<1e-10?(floor%2?floor+1:floor):Math.round(n))/scale;};
 const makeRange=(address:string,sheet=defaultSheet):Ref=>{if(snapshot.sheetNames&&!snapshot.sheetNames.includes(sheet))throw Error('No existe la hoja '+sheet);const [a,b,...extra]=address.replaceAll('$','').split(':'),first=parseAddress(a),last=parseAddress(b??a);if(!first||!last||extra.length)throw Error('Dirección de celda VBA no válida: '+address);const cells:string[]=[];for(let r=Math.min(first.row,last.row);r<=Math.max(first.row,last.row);r++)for(let c=Math.min(first.col,last.col);c<=Math.max(first.col,last.col);c++){if(cells.length>=1000)throw Error('El rango VBA supera 1.000 celdas.');cells.push(columnName(c)+(r+1));}return {sheet,cells,property:'value'};};
 function expression(text:string):Value {
  tick();const tokens=text.match(/"(?:[^"]|"")*"|\d+(?:\.\d*)?(?:[Ee][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*|<>|<=|>=|[().,+\-*/^&=<>\\]/gu)??[];if(tokens.join('').toLowerCase()!==text.replace(/\s+/g,'').toLowerCase().replace(/"([^"\n]*)"/g,match=>match)){
   // Spaces inside string literals are significant; validate token boundaries separately below.
   const stripped=text.replace(/"(?:[^"]|"")*"/g,'""').replace(/\s+/g,'');const lexed=tokens.map(t=>t.startsWith('"')?'""':t).join('');if(stripped.toLowerCase()!==lexed.toLowerCase())throw Error('Símbolo VBA no admitido: '+text);
  }
  let pos=0;const take=()=>tokens[pos++],peek=()=>tokens[pos]??'';
  function args():Value[]{if(take()!=='(')throw Error('Falta (');const result:Value[]=[];if(peek()!==')'){do{result.push(binary(0));if(peek()!==',')break;take();}while(true);}if(take()!==')')throw Error('Falta )');return result;}
  function invoke(name:string,list:Value[]):Value {
   const worksheet=name.startsWith('worksheet:'),fn=name.toLowerCase().replace(/^worksheet:/,'');
   if(fn==='range')return makeRange(string(list[0]));
   if(fn==='cells'){const row=numeric(list[0]),col=typeof scalar(list[1])==='string'?(parseAddress(string(list[1])+'1')?.col??-1)+1:numeric(list[1]);if(!Number.isInteger(row)||!Number.isInteger(col)||row<1||col<1)throw Error('Cells necesita fila y columna válidas.');return makeRange(columnName(col-1)+row);}
   const flat=list.flatMap(value=>ref(value)?value.cells.map(cell=>calculated(value.sheet,cell)):[scalar(value)]),numbers=flat.filter(value=>typeof value==='number') as number[];
   if(fn==='sum')return numbers.reduce((a,b)=>a+b,0);if(fn==='average')return numbers.reduce((a,b)=>a+b,0)/numbers.length;if(fn==='min')return Math.min(...numbers);if(fn==='max')return Math.max(...numbers);if(fn==='count')return numbers.length;
   if(fn==='abs')return Math.abs(numeric(list[0]));if(fn==='sqr')return Math.sqrt(numeric(list[0]));if(fn==='int')return Math.floor(numeric(list[0]));if(fn==='fix')return Math.trunc(numeric(list[0]));if(fn==='round'){const number=numeric(list[0]),digits=list[1]===undefined?0:numeric(list[1]);return worksheet?Math.sign(number)*Math.round(Number((Math.abs(number)*10**digits).toPrecision(15)))/10**digits:banker(number,digits);}if(fn==='cdbl'||fn==='val')return numeric(list[0]);if(fn==='clng'||fn==='cint')return banker(numeric(list[0]));if(fn==='cstr')return string(list[0]);if(fn==='len')return string(list[0]).length;if(fn==='trim')return string(list[0]).trim();if(fn==='ucase')return string(list[0]).toUpperCase();if(fn==='lcase')return string(list[0]).toLowerCase();
   throw Error('Función VBA no admitida: '+name);
  }
  function atom():Value {tick();const token=take();if(!token)throw Error('Expresión VBA incompleta.');if(token==='('){const v=binary(0);if(take()!==')')throw Error('Falta )');return v;}if(token==='-'||token==='+')return numeric(binary(7))*(token==='-'?-1:1);if(/^Not$/i.test(token)){const value=scalar(binary(3));return typeof value==='number'?~value:!value;}if(token.startsWith('"'))return token.slice(1,-1).replaceAll('""','"');if(/^\d/.test(token))return Number(token);if(/^(True|False)$/i.test(token))return /^True$/i.test(token);
   let v:Value;
   if(/^(Worksheets|Sheets)$/i.test(token)&&peek()==='('){const sheet=string(args()[0]);if(take()!=='.')throw Error('Usa Worksheets(...).Range o Cells.');const method=take(),old=defaultSheet;defaultSheet=sheet;try{v=invoke(method,args());}finally{defaultSheet=old;}}
   else if(/^(Application|WorksheetFunction)$/i.test(token)){if(take()!=='.')throw Error('Usa WorksheetFunction con una función.');let method=take();if(/^WorksheetFunction$/i.test(method)){if(take()!=='.')throw Error('Falta la función de hoja.');method=take();}v=invoke('worksheet:'+method,args());}
   else if(peek()==='(')v=invoke(token,args());else if(variables.has(token.toLowerCase()))v=variables.get(token.toLowerCase())!;else throw Error('Variable VBA inexistente: '+token);
   if(peek()==='.'){take();const property=take().toLowerCase();if(!ref(v)||!['value','value2','formula'].includes(property))throw Error('Propiedad VBA no admitida: '+property);v={...v,property:property==='formula'?'formula':'value'};}return v;
  }
  const precedence:Record<string,number>={or:1,and:2,'=':3,'<>':3,'<':3,'>':3,'<=':3,'>=':3,'&':4,'+':5,'-':5,'*':6,'/':6,'\\':6,mod:6,'^':7};
  function binary(min:number):Value {let left=atom();while((precedence[peek().toLowerCase()]??-1)>=min){const op=take().toLowerCase(),right=binary(precedence[op]+(op==='^'?0:1)),a=scalar(left),b=scalar(right);if(op==='&')left=String(a??'')+String(b??'');else if(op==='+'&&typeof a==='string'&&typeof b==='string')left=a+b;else if(op==='and'||op==='or')left=typeof a==='number'&&typeof b==='number'?(op==='and'?a&b:a|b):(op==='and'?!!a&&!!b:!!a||!!b);else if(['=','<>','<','>','<=','>='].includes(op))left=op==='='?a===b:op==='<>'?a!==b:op==='<'?a!<b!:op==='>'?a!>b!:op==='<='?a!<=b!:a!>=b!;else{const x=numeric(left),y=numeric(right);if((op==='/'||op==='\\'||op==='mod')&&y===0)throw Error('División VBA por cero.');left=op==='+'?x+y:op==='-'?x-y:op==='*'?x*y:op==='/'?x/y:op==='\\'?Math.trunc(banker(x)/banker(y)):op==='mod'?banker(x)%banker(y):x**y;}}
   if(typeof left==='number'&&!Number.isFinite(left))throw Error('El cálculo VBA no produce un número finito.');return left;
  }
  const result=binary(0);if(pos!==tokens.length)throw Error('Expresión VBA no admitida: '+text);return result;
 }
 function write(target:Ref,value:Value){const scalarValue=scalar(value);for(const cell of target.cells){tick();const key=target.sheet+'!'+cell;
   const stored=target.property==='formula'?string(value):typeof scalarValue==='string'?"'"+scalarValue:scalarValue;
   if(target.property==='formula'&&!String(stored).startsWith('='))throw Error('Formula necesita una fórmula que empiece por =');
   operations.push({op:'setCell',args:{sheet:target.sheet,cell,value:stored}});values[key]=scalarValue;if(target.property==='formula'){formulas[key]=string(value);values[key]=string(value);}else delete formulas[key];if(preview){const pos=parseAddress(cell)!;preview.set(target.sheet,pos.row,pos.col,stored===null?'':typeof stored==='boolean'?(stored?'TRUE':'FALSE'):String(stored));}if(operations.length>1000)throw Error('La macro VBA supera 1.000 cambios.');
  }}
 function line(text:string){
  const declaration=/^Dim\s+(.+)$/i.exec(text);if(declaration){for(const item of declaration[1].split(',')){const match=/^\s*(\w+)(?:\s+As\s+(Long|Integer|Double|Single|Currency|Variant|String|Boolean))?\s*$/i.exec(item);if(!match)throw Error('Declaración VBA no admitida.');variables.set(match[1].toLowerCase(),match[2]?.toLowerCase()==='string'?'':0);}return;}
  if(/^Debug\.Print\s+/i.test(text)||/^MsgBox\s+/i.test(text)){if(logs.length>=500)throw Error('Demasiadas salidas VBA.');logs.push(string(expression(text.replace(/^(?:Debug\.Print|MsgBox)\s+/i,''))));return;}
  const assignment=/^(.+?)\s*=\s*(.+)$/.exec(text);if(!assignment)throw Error('Instrucción VBA no admitida: '+text);
  const target=assignment[1].trim(),value=expression(assignment[2]);if(/^[\p{L}_][\p{L}\p{N}_]*$/u.test(target)){if(!variables.has(target.toLowerCase()))throw Error('Declara la variable '+target);variables.set(target.toLowerCase(),scalar(value));}else{const destination=expression(target);if(!ref(destination))throw Error('El destino VBA debe ser una celda.');write(destination,value);}
 }
 function execute(program:Statement[]){for(const statement of program){tick();try{if(statement.kind==='line')line(statement.text);else if(statement.kind==='if')execute(scalar(expression(statement.condition))?statement.yes:statement.no);else{const start=numeric(expression(statement.start)),end=numeric(expression(statement.end)),step=numeric(expression(statement.step));if(step===0)throw Error('Step no puede ser cero.');let count=0,i=start;for(;step>0?i<=end:i>=end;i+=step){if(++count>macroLimits.repeats)throw Error('El bucle VBA supera 1.000 vueltas.');variables.set(statement.name.toLowerCase(),i);execute(statement.body);}variables.set(statement.name.toLowerCase(),i);}}catch(error){throw Error('Línea '+statement.line+': '+(error instanceof Error?error.message:String(error)));}}}
 try{execute(program);return {name:procedure,revision:snapshot.revision,operations,logs};}finally{preview?.engine.destroy();}
}
