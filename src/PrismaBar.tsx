import {useState} from 'react';
import {ArrowLeft, ChevronDown} from 'lucide-react';
import {product} from './product';
import {editorKinds, productInfo} from './product-core';
import {navigatePrisma} from './prisma-navigation';
import './prisma.css';
export function PrismaBar() {
  const [open,setOpen]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function go(kind?: typeof editorKinds[number]) {
    setBusy(true); setError('');
    try { await navigatePrisma(kind); } catch(e) { setError(e instanceof Error?e.message:String(e)); setBusy(false); }
  }
  return <><div className="prisma-editor-bar"><button disabled={busy} onClick={()=>void go()}><ArrowLeft size={16}/><img src="./prisma-logo.svg" alt=""/>Inicio de Prisma</button><span>{product.name}</span><button disabled={busy} aria-expanded={open} onClick={()=>setOpen(!open)}>Cambiar aplicación <ChevronDown size={15}/></button>{open&&<nav aria-label="Cambiar aplicación">{editorKinds.map(kind=><button disabled={busy||kind===product.kind} key={kind} onClick={()=>void go(kind)}><img src={productInfo(kind).logo} alt=""/>{productInfo(kind).name}</button>)}</nav>}</div>{busy&&<div className="prisma-launching" role="status">Guardando tu trabajo local…</div>}{error&&<div role="alert" className="prisma-alert">{error}<button onClick={()=>setError('')}>×</button></div>}</>;
}
