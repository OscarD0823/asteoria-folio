import type {CSSProperties} from 'react';
import {ArrowRight, ArrowUpRight, Check, Database, FilePlus2, FolderOpen, History, Layers3, LockKeyhole, ShieldCheck} from 'lucide-react';
import {TemplateGallery} from './TemplateGallery';
import {productInfo} from './product-core';
import type {OfficeCard} from './office-storage';

type WelcomeKind = 'slides' | 'publisher' | 'data';
const presentations = {
  slides: {color:'#7353c8', eyebrow:'UN ESPACIO PARA TUS IDEAS', title:'Una idea.', accent:'Toda la pantalla.', description:'Da forma a tus ideas con presentaciones, imágenes y notas. Abre tus archivos de PowerPoint y continúa en tu dispositivo.', create:'Presentación nueva', open:'Abrir PowerPoint', formats:'PPTX · PDF · SVG', preview:'Ideas que conectan.', detail:'DISEÑA CADA DIAPOSITIVA', first:'Una presentación en blanco', firstDetail:'Texto, imágenes, formas y tu estilo.', importDetail:'Continúa una presentación de PowerPoint.', compatibility:'El PPTX conserva las partes originales no editadas. Algunas fuentes y efectos pueden verse diferentes a PowerPoint. El PDF exportado contiene páginas de imagen.'},
  publisher: {color:'#397e8b', eyebrow:'UN ESPACIO PARA CREAR', title:'Diseña páginas.', accent:'Publica tus ideas.', description:'Crea carteles, boletines y publicaciones con texto, imágenes y tablas. Empieza con una plantilla y dale tu propio estilo.', create:'Publicación nueva', open:'Abrir publicación o PPTX', formats:'PPTX · PDF · SVG', preview:'Historias en papel.', detail:'TU PRÓXIMA PUBLICACIÓN', first:'Una página para diseñar', firstDetail:'Tu composición, lista para imprimir.', importDetail:'Continúa un proyecto editable en PPTX.', compatibility:'Los proyectos se guardan como PPTX editable. Los archivos PUB de Microsoft Publisher todavía no se importan. Algunas fuentes y efectos pueden verse diferentes; el PDF exportado contiene páginas de imagen.'},
  data: {color:'#b55373', eyebrow:'UN ESPACIO PARA TUS DATOS', title:'Organiza.', accent:'Relaciona. Consulta.', description:'Conecta tus datos, crea tablas y encuentra respuestas con consultas SQL. Tu base de datos funciona en tu dispositivo, sin servidor.', create:'Base nueva', open:'Abrir o importar', formats:'SQLITE · CSV · XLSX', preview:'Todo conectado.', detail:'DA FORMA A TUS DATOS', first:'Una base de datos en blanco', firstDetail:'Tablas, campos y relaciones a tu medida.', importDetail:'Importa una base SQLite, CSV o XLSX.', compatibility:'Importación SQLite, CSV y XLSX. Exportación SQLite, CSV, JSON y XLSX. La base SQLite conserva todos los registros; las exportaciones de la vista incluyen hasta 500 filas. ACCDB/MDB y los formularios de Access todavía no se importan.'},
};

function WelcomeArtwork({kind}: {kind:WelcomeKind}) {
  const design=presentations[kind], info=productInfo(kind);
  return <div className={'product-art product-art-'+kind} aria-hidden="true">
    <div className="product-glow"/><div className="product-art-back"/>
    <div className="product-art-paper">
      <div className="product-art-brand"><img src={info.logo} alt=""/><span>{info.name.toUpperCase()}</span><small>01</small></div>
      <small className="product-art-eyebrow">{design.detail}</small><h3>{design.preview}</h3>
      {kind==='data'?<div className="product-art-table"><div><span>Proyecto</span><span>Estado</span></div>{['Ideas','Diseño','Entrega'].map((label,i)=><div key={label}><span><i/>{label}</span><span>{['Listo','En curso','Por hacer'][i]}</span></div>)}</div>:kind==='slides'?<><div className="product-art-lines"><i/><i/></div><div className="product-art-chart">{[45,70,55,95].map((height,i)=><i key={i} style={{height:height+'%'}}/>)}</div><div className="product-art-dots"><i/><i/><i/></div></>:<><div className="product-art-photo"><span/><i/></div><div className="product-art-columns">{[0,1].map(i=><div className="product-art-lines" key={i}><i/><i/><i/><i/></div>)}</div></>}
      <div className="product-art-bottom"><span>CREADO POR TI</span><span>VISTA PREVIA</span></div>
    </div>
    <div className="product-art-tag tag-top">{kind==='data'?<Database size={17}/>:<Layers3 size={17}/>}<b>{kind==='data'?'Conecta tus datos':kind==='slides'?'Diseña cada idea':'Tu estilo, en cada página'}</b></div>
    <div className="product-art-tag tag-bottom"><Check size={17}/><b>Solo en tu dispositivo</b></div>
  </div>;
}

export function ProductWelcome({kind, busy, onCreate, onOpen, onTemplate, recent, onRecent}: {
  kind:WelcomeKind; busy:boolean; onCreate:()=>void; onOpen:()=>void; onTemplate:(id:string)=>void;
  recent:OfficeCard[]; onRecent:(id:string)=>void;
}) {
  const design=presentations[kind], info=productInfo(kind);
  return <main className="product-home" style={{'--product-accent':design.color} as CSSProperties}>
    <section className="product-hero"><div className="product-hero-copy">
      <span className="eyebrow"><span className="live-dot"/>{design.eyebrow}</span>
      <h1>{design.title}<br/><em>{design.accent}</em></h1><p>{design.description}</p>
      <div className="product-hero-actions"><button className="product-primary" disabled={busy} onClick={onCreate}><FilePlus2 size={18}/>{design.create}<ArrowRight size={18}/></button><button disabled={busy} onClick={onOpen}><FolderOpen size={18}/>{design.open}</button></div>
      <span className="product-private"><ShieldCheck size={16}/>Sin cuentas. Sin subir tus archivos.</span>
    </div><WelcomeArtwork kind={kind}/></section>
    <TemplateGallery kind={kind} onSelect={onTemplate} disabled={busy}/>
    <section className="product-start-cards" aria-label="Opciones para empezar">
      <button disabled={busy} onClick={onCreate}><FilePlus2/><span><b>{design.first}</b><small>{design.firstDetail}</small></span><ArrowUpRight size={17}/></button>
      <button disabled={busy} onClick={onOpen}><FolderOpen/><span><b>Trae tu trabajo contigo</b><small>{design.importDetail}</small></span><ArrowUpRight size={17}/></button>
      <a href="#product-library"><History/><span><b>Continúa donde quedaste</b><small>{recent.length?`${recent.length} proyecto${recent.length===1?'':'s'} en este dispositivo.`:'Tu trabajo guardado aparecerá aquí.'}</small></span><ArrowUpRight size={17}/></a>
    </section>
    <section className="product-library" id="product-library" aria-labelledby="product-library-title"><span className="eyebrow">TU BIBLIOTECA LOCAL</span><h2 id="product-library-title">Trabajo que sigue contigo.</h2>
      {recent.length?<div className="product-recent">{recent.map(file=><button key={file.id} disabled={busy} onClick={()=>onRecent(file.id)}><img src={info.logo} alt=""/><span><b>{file.name}</b><small>{new Date(file.updated).toLocaleDateString()}</small></span><ArrowUpRight size={17}/></button>)}</div>:<div className="product-library-empty"><FolderOpen size={25}/><p>Guarda un proyecto desde el editor para verlo aquí.<br/><small>También puedes exportarlo y abrirlo en otro dispositivo.</small></p></div>}
    </section>
    <details className="product-compatibility"><summary>Formatos y compatibilidad <span>{design.formats}</span></summary><p>{design.compatibility}</p></details>
    <footer className="product-home-footer"><span><LockKeyhole size={14}/>{info.name} {info.version} · Hecho para crear.</span><a href="https://github.com/OscarD0823" target="_blank" rel="noreferrer">Creado por OscarD0823 <ArrowUpRight size={13}/></a><a href={info.repository} target="_blank" rel="noreferrer">Código abierto</a></footer>
  </main>;
}
