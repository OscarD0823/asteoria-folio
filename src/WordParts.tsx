import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {FlowDocument} from './flow';
import type {OfficeNote} from './office-engines';
export function WordParts({flow,onChange,onClose}:{flow:FlowDocument;onChange:(flow:FlowDocument)=>void;onClose:()=>void}){
 const [tab,setTab]=useState<'footnotes'|'endnotes'|'comments'>('footnotes');
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[onClose]);
 const original=flow.officeOriginal;if(!original)return null;
 const entries=original.edits?.[tab]??original[tab];
 function change(id:string,text:string){const office=flow.officeOriginal;if(!office)return;const next=entries.map(note=>note.id===id?{...note,text}:note);onChange({...flow,officeOriginal:{...office,edits:{...office.edits,[tab]:next}}});}
 return createPortal(<div className="modal-backdrop"><section className="word-dialog word-parts" role="dialog" aria-modal="true" aria-labelledby="word-parts-title"><header><h2 id="word-parts-title">Contenido conservado de Word</h2><button autoFocus aria-label="Cerrar contenido de Word" onClick={onClose}>✕</button></header><p>GenOffice conserva las partes originales al guardar sin cambios o al editar solo texto. Las notas y comentarios se pueden revisar y editar aquí. Cambios en diseño, formato o estructura usan la exportación de Prisma y requieren revisar las características originales.</p><nav aria-label="Contenido de Word">{([['footnotes','Notas al pie'],['endnotes','Notas finales'],['comments','Comentarios']] as const).map(([key,title])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{title} ({(original.edits?.[key]??original[key]).length})</button>)}</nav><div className="word-parts-list">{entries.map((note:OfficeNote)=><label key={note.id}>{tab==='comments'?(note.author||'Comentario'):'Nota '+note.id}<textarea aria-label={(tab==='comments'?'Comentario ':'Nota ')+note.id} value={note.text} onChange={event=>change(note.id,event.target.value)} /></label>)}{!entries.length&&<p>Este documento no contiene elementos de este tipo.</p>}</div><footer><button onClick={onClose}>Terminar revisión</button></footer></section></div>,document.body);
}
