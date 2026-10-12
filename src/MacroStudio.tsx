import {useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Code2} from 'lucide-react';
import {macroExample,planPrismaMacro,readPrismaMacro,type MacroBridge,type MacroPlan} from './prisma-macros';
import {vbaExample,vbaProcedures} from './vba-source';
import {readPreference,writePreference} from './preferences';
import {download} from './download';
import './macro.css';

export function MacroStudio({kind,bridge}:{kind:string;bridge:MacroBridge|null}) {
 const [open,setOpen]=useState(false),[mode,setMode]=useState<'prisma'|'vba'>('prisma');
 const [prismaSource,setPrismaSource]=useState(()=>readPreference<string>('macro-source-'+kind,macroExample(kind)));
 const [vbaSource,setVbaSource]=useState(()=>readPreference<string>('macro-vba-'+kind,vbaExample));
 const [procedure,setProcedure]=useState(''),[plan,setPlan]=useState<MacroPlan|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const input=useRef<HTMLInputElement>(null),source=mode==='vba'?vbaSource:prismaSource,procedures=vbaProcedures(source);
 const selectedProcedure=procedures.includes(procedure)?procedure:procedures[0];
 const change=(text:string,nextMode=mode)=>{nextMode==='vba'?setVbaSource(text):setPrismaSource(text);setPlan(null);setMessage('');};
 const selectMode=(next:'prisma'|'vba')=>{setMode(next);setPlan(null);setMessage('');};
 function validate(){if(mode==='prisma')readPrismaMacro(source);else if(source.length>100000||!vbaProcedures(source).length)throw Error('Usa un módulo VBA de hasta 100 KB con un Sub sin argumentos.');}
 async function preview(){
  if(!bridge)return;setBusy(true);setPlan(null);
  try{const snapshot=await bridge.snapshot();setPlan(mode==='vba'?(await import('./vba')).planVbaMacro(source,snapshot,selectedProcedure):planPrismaMacro(source,snapshot,bridge.operations));setMessage('Vista previa preparada. Revisa los cambios antes de aplicar.');}
  catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
 }
 async function apply(){if(!bridge||!plan)return;setBusy(true);try{await bridge.apply(plan.operations,plan.revision);setPlan(null);setMessage('Macro aplicada. Puedes deshacer los cambios en el editor.');}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 return <><button className="macro-trigger" title="Programar · Macros" aria-label="Programar · Macros" onClick={()=>setOpen(true)}><Code2 size={16} aria-hidden="true"/><span>Programar · Macros</span></button>{open&&createPortal(
  <div className="macro-shade"><section className="macro-dialog" role="dialog" aria-modal="true" aria-labelledby="macro-title">
   <header><div><small>PRISMA · PROGRAMAR</small><h2 id="macro-title">Macros locales</h2></div><button disabled={busy} aria-label="Cerrar macros" onClick={()=>setOpen(false)}>×</button></header>
   <p>Automatiza cálculos y tareas repetidas en este dispositivo. Comprueba el código, revisa la vista previa y aplica los cambios cuando estés listo.</p>
   {kind==='sheets'&&<div className="macro-modes" role="group" aria-label="Lenguaje de la macro"><button disabled={busy} aria-pressed={mode==='prisma'} onClick={()=>selectMode('prisma')}>Prisma</button><button disabled={busy} aria-pressed={mode==='vba'} onClick={()=>selectMode('vba')}>VBA de celdas</button></div>}
   {mode==='vba'&&<><p className="macro-scope">Compatibilidad VBA inicial: Sub, variables, For, If, Range, Cells, Value y Formula. Los módulos .bas se ejecutan con el motor local de Prisma. Los proyectos VBA incrustados en .xlsm se conservan para Excel; aún no se ejecutan directamente.</p><label>Procedimiento<select aria-label="Procedimiento VBA" value={selectedProcedure??''} onChange={e=>{setProcedure(e.target.value);setPlan(null);}} disabled={busy}>{procedures.map(name=><option key={name}>{name}</option>)}</select></label></>}
   <div className="macro-actions">
    <button disabled={busy} onClick={()=>change(mode==='vba'?vbaExample:macroExample(kind))}>Cargar ejemplo</button><button disabled={busy} onClick={()=>input.current?.click()}>Abrir macro</button>
    <button disabled={busy} onClick={()=>{try{validate();writePreference((mode==='vba'?'macro-vba-':'macro-source-')+kind,source);setMessage('Macro guardada en este dispositivo.');}catch(e){setMessage(String(e));}}}>Guardar local</button>
    <button disabled={busy} onClick={()=>{try{validate();void download(new TextEncoder().encode(source),mode==='vba'?'Mi-macro.bas':'Mi-macro.prismamacro',mode==='vba'?'text/plain':'application/json');}catch(e){setMessage(String(e));}}}>Exportar macro</button>
   </div>
   <input ref={input} hidden type="file" accept={kind==='sheets'?'.bas,.vba,.prismamacro,.json':'.prismamacro,.json'} onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>100000)setMessage('El archivo supera 100 KB.');else try{const text=await file.text(),next=kind==='sheets'&&/\.(bas|vba)$/i.test(file.name)?'vba':'prisma';if(next==='prisma')readPrismaMacro(text);else if(!vbaProcedures(text).length)throw Error('No se encontró un Sub sin argumentos.');setMode(next);change(text,next);}catch(error){setMessage(String(error));}}e.target.value='';}}/>
   <label>Código de la macro<textarea aria-label="Código de la macro" spellCheck={false} value={source} onChange={e=>change(e.target.value)} disabled={busy}/></label>
   <details><summary>Instrucciones y operaciones</summary>{mode==='vba'?<><p>Lee o escribe celdas con Range("A1").Value, Cells(2, 1).Value y Worksheets("Hoja1").Range("A1").Formula. Funciones iniciales: Sum, Average, Min, Max, Count, Abs, Sqr, Round, Len, Trim, UCase y LCase.</p><p>Este motor admite macros de celdas; formularios, eventos, clases, complementos y funciones VBA personalizadas requieren más compatibilidad. Una instrucción no admitida cancela toda la vista previa.</p></>:<><p>Variables: let. Repetición: repeat/as/steps. Condiciones: if/then/else. Expresiones: var, read, add, subtract, multiply, divide, concat, eq, gt, lt, and, or, not. Salida: log.</p><p>Operaciones del documento: {bridge?.operations.join(', ')||'Abre un documento para ver las operaciones.'}. Cada paso usa op y args.</p></>}<p>Solo se ejecuta al pulsar Aplicar. Las macros no acceden a Internet, programas externos ni archivos del equipo.</p></details>
   {plan&&<div className="macro-preview"><h3>{plan.name}</h3><p>{plan.operations.length} cambios preparados</p><ol>{plan.operations.map((operation,i)=><li key={i}>{operation.op}: {JSON.stringify(operation.args)}</li>)}</ol>{plan.logs.map((line,i)=><p key={i}>{line}</p>)}</div>}
   {message&&<p role="status">{message}</p>}<footer><button disabled={busy||!bridge} onClick={()=>void preview()}>Comprobar y previsualizar</button><button disabled={busy||!bridge||!plan} onClick={()=>void apply()}>Aplicar macro</button><button disabled={busy} onClick={()=>setOpen(false)}>Cerrar</button></footer>
  </section></div>,document.body)}</>;
}
