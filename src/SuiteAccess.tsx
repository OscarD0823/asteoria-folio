import {useState} from 'react';
import {product} from './product';
import products from '../products.json';
import {LocalEngines} from './LocalEngines';
export function SuiteAccess(){const [open,setOpen]=useState(false);return <div className="suite-access"><LocalEngines/><button aria-expanded={open} onClick={()=>setOpen(!open)}>Aplicaciones Prisma</button>{open&&<nav aria-label="Aplicaciones Prisma">{Object.entries(products).map(([kind,info])=><a key={kind} aria-current={product.kind===kind?'page':undefined} href={'https://oscard0823.github.io/prisma-pdf/'+(kind==='pdf'?'':kind+'/')}>{info.name}</a>)}</nav>}</div>;}
