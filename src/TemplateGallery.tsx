import {useState,type CSSProperties} from 'react';
import {Search,ArrowUpRight,Plus} from 'lucide-react';
import {creationTemplates,type CreationTemplate} from './template-catalog';
import type {EditorKind} from './product-core';
import './experience.css';
export function TemplatePreview({kind,template}:{kind:EditorKind;template:CreationTemplate}){
 return <div className={'template-preview template-'+kind} style={{'--template-color':template.color} as CSSProperties} aria-hidden="true"><div className="template-sheet"><strong>{template.id==='blank'?<Plus size={24}/>:template.title}</strong>{kind==='sheets'||kind==='data'?<div className="template-grid">{Array.from({length:20},(_,i)=><i key={i}/>)}</div>:<><div className="template-rule"/><div className="template-lines"><i/><i/><i/></div>{kind==='slides'||kind==='publisher'?<div className="template-shapes"><i/><i/></div>:<div className="template-lines short"><i/><i/><i/></div>}</>}</div></div>;
}
export function TemplateGallery({kind,onSelect,disabled=false,compact=false}:{kind:EditorKind;onSelect:(id:string)=>void;disabled?:boolean;compact?:boolean}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('Todas');
 const templates=creationTemplates[kind],categories=['Todas',...new Set(templates.map(t=>t.category))];
 const visible=templates.filter(t=>(category==='Todas'||category===t.category)&&`${t.title} ${t.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <section className={'template-gallery'+(compact?' template-compact':'')} aria-label="Plantillas editables"><div className="template-gallery-title"><div><small>CREA A TU MANERA</small><h2>Empieza con una plantilla</h2></div><label><Search size={15}/><input aria-label="Buscar plantillas" placeholder="Buscar plantillas" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><nav aria-label="Categorías de plantillas">{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</nav><div className="template-cards">{visible.map(t=><button key={t.id} disabled={disabled} onClick={()=>onSelect(t.id)} aria-label={'Usar plantilla '+t.title}><TemplatePreview kind={kind} template={t}/><div className="template-card-text"><b>{t.title}<ArrowUpRight size={15}/></b><span>{t.description}</span></div></button>)}</div>{!visible.length&&<p>No hay plantillas con esa búsqueda.</p>}</section>;
}
