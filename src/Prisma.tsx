import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {ArrowUpRight, Search, FolderOpen, ShieldCheck, PanelsTopLeft, Check, RefreshCw} from 'lucide-react';
import {editorKinds, productInfo, type EditorKind} from './product-core';
import {editorForFile} from './prisma-launch';
import {navigatePrisma} from './prisma-navigation';
import {listPrismaLibrary, type LibraryCard} from './prisma-library';
import {InstallApp} from './InstallApp';
import {Updates} from './Updates';
import {LocalEngines} from './LocalEngines';
import {distributionProduct} from './product';
import './prisma.css';
const details: Record<EditorKind, {color: string; formats: string; text: string}> = {
  writer: {color: '#506ada', formats: 'DOCX · ODT · PDF', text: 'Escribe, organiza tus ideas y da forma a tus documentos.'},
  sheets: {color: '#168273', formats: 'XLSX · CSV · ODS', text: 'Ordena tus datos, calcula y trabaja con varias hojas.'},
  slides: {color: '#cf6850', formats: 'PPTX · PDF · SVG', text: 'Convierte una idea en una presentación para compartir.'},
  pdf: {color: '#a14cc8', formats: 'PDF · DOCX · PRISMA', text: 'Edita, reúne y prepara tus PDF en tu propio dispositivo.'},
  data: {color: '#477eb2', formats: 'SQLITE · CSV · XLSX', text: 'Conecta tablas, administra registros y consulta tus datos.'},
  publisher: {color: '#bc5384', formats: 'PPTX · PDF · SVG', text: 'Diseña publicaciones, carteles y páginas listas para imprimir.'},
};
export default function Prisma() {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<EditorKind | ''>(''),
    [cards, setCards] = useState<LibraryCard[]>([]), [error, setError] = useState(''),
    [loading, setLoading] = useState(true), [launching, setLaunching] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function refresh() {
    setLoading(true);
    try { const result = await listPrismaLibrary(); setCards(result.cards); if (result.errors) setError('No se pudo leer una biblioteca local. Puedes abrir los editores o reintentar.'); }
    catch (e) { setError(String(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const fail = (e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLaunching(false); };
  async function open(editor: EditorKind, id?: string) {
    setLaunching(true); setError('');
    try { await navigatePrisma(editor, id ? {editor, action: 'recent', id} : undefined); } catch(e) { fail(e); }
  }
  async function file(file: File) {
    const editor = editorForFile(file.name);
    if (!editor) { setError('Abre PDF, DOCX, DOCM, TXT, XLSX, XLSM, CSV, TSV, PPTX, PPTM, SQLite o un proyecto .prisma.'); return; }
    if (file.size > 100 * 1024 * 1024) { setError('Selecciona un archivo de hasta 100 MB. Cada editor puede tener un límite menor.'); return; }
    setLaunching(true); setError('');
    try { await navigatePrisma(editor, {editor, action: 'file', file}); } catch(e) { fail(e); }
  }
  const visible = cards.filter(card => (!filter || card.editor === filter) && card.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="prisma-home">
    <aside className="prisma-sidebar"><a className="prisma-wordmark" href="./"><img src="./prisma-logo.svg" alt=""/>Prisma</a>
      <span className="prisma-side-label">TU ESPACIO DE TRABAJO</span><button className="prisma-side-active"><PanelsTopLeft size={18}/> Inicio</button>
      <nav aria-label="Aplicaciones">{editorKinds.map(kind => <button key={kind} disabled={launching} onClick={() => void open(kind)}><img src={productInfo(kind).logo} alt=""/>{productInfo(kind).name}</button>)}</nav>
      <div className="prisma-side-bottom"><ShieldCheck size={22}/><b>Tu trabajo se queda contigo.</b><p>Documentos locales, sin cuentas ni almacenamiento en servidores.</p><small>Prisma {distributionProduct.version}</small></div>
    </aside>
    <div className="prisma-main"><header className="prisma-top"><span>Todas tus herramientas. Un mismo lugar.</span><div><LocalEngines/><InstallApp/><Updates beforeReload={async()=>{}} onError={fail}/></div></header>
      <main><section className="prisma-hero"><div><span className="prisma-eyebrow">UN ESPACIO PARA CREAR</span><h1>Tu próxima idea<br/><em>empieza aquí.</em></h1><p>Documentos, hojas de cálculo, presentaciones y más.<br/>Elige una aplicación y sigue con tu trabajo.</p><button className="prisma-open" disabled={launching} onClick={() => input.current?.click()}><FolderOpen size={18}/> Abrir un archivo <ArrowUpRight size={18}/></button></div><div className="prisma-orbit" aria-hidden="true"><div className="prisma-orbit-ring"/><img src="./prisma-logo.svg" alt=""/>{['W','S','P'].map((letter,index)=><span key={index} className={'prisma-orbit-letter letter-'+index}>{letter}</span>)}</div></section>
      <section aria-labelledby="prisma-apps-title"><div className="prisma-section-heading"><h2 id="prisma-apps-title">Tus aplicaciones</h2><span>Independientes. Conectadas en Prisma.</span></div><div className="prisma-app-grid">{editorKinds.map(kind => <button className="prisma-app-card" key={kind} disabled={launching} onClick={() => void open(kind)} style={{'--app-color': details[kind].color} as CSSProperties}><div className="prisma-card-heading"><img src={productInfo(kind).logo} alt=""/><ArrowUpRight size={20}/></div><h3>{productInfo(kind).name}</h3><p>{details[kind].text}</p><small>{details[kind].formats}</small></button>)}</div></section>
      <section className="prisma-library" aria-labelledby="prisma-recent-title"><div className="prisma-section-heading"><h2 id="prisma-recent-title">Continúa donde quedaste</h2><button disabled={loading} onClick={() => void refresh()} aria-label="Actualizar biblioteca"><RefreshCw size={16}/></button></div><div className="prisma-library-tools"><label><Search size={17}/><input aria-label="Buscar documentos locales" placeholder="Buscar en tu biblioteca" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filtrar por aplicación" value={filter} onChange={e=>setFilter(e.target.value as EditorKind|'')}><option value="">Todas las aplicaciones</option>{editorKinds.map(kind=><option key={kind} value={kind}>{productInfo(kind).name}</option>)}</select></div>
      {loading ? <p role="status">Leyendo tu biblioteca local…</p> : visible.length ? <div className="prisma-recent-list">{visible.slice(0,50).map(card=><button key={card.editor+card.id} disabled={launching} onClick={()=>void open(card.editor,card.id)}><img src={productInfo(card.editor).logo} alt=""/><span><b>{card.name}</b><small>{productInfo(card.editor).name}{card.session?' · Último libro':''}</small></span><time>{card.updated ? new Date(card.updated).toLocaleDateString() : 'Guardado local'}</time><ArrowUpRight size={16}/></button>)}</div> : <div className="prisma-empty"><Check size={22}/><b>{query||filter?'No hay documentos con ese filtro.':'Aquí aparecerá tu trabajo.'}</b><p>Guarda un documento desde cualquiera de las aplicaciones. Esta biblioteca pertenece a este navegador o instalación; puedes traer archivos de otros dispositivos con «Abrir un archivo».</p></div>}</section>
      <footer className="prisma-home-footer"><span><ShieldCheck size={16}/> Procesamiento en tu dispositivo</span><a href={distributionProduct.repository} target="_blank" rel="noreferrer">Código abierto <ArrowUpRight size={14}/></a></footer></main>
    </div><input ref={input} type="file" hidden accept=".pdf,.prisma,.docx,.docm,.txt,.xlsx,.xlsm,.csv,.tsv,.pptx,.pptm,.sqlite,.sqlite3,.db" onChange={e=>{const selected=e.target.files?.[0];if(selected)void file(selected);e.target.value='';}}/>
    {error&&<div className="prisma-alert" role="alert">{error}<button onClick={()=>setError('')} aria-label="Cerrar aviso">×</button></div>}{launching&&<div className="prisma-launching" role="status">Abriendo tu aplicación…</div>}
  </div>;
}
