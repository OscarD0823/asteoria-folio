import { lazy, Suspense, useEffect } from "react";
import { product, inPrisma } from "./product";
import {SuiteAccess} from './SuiteAccess';
import {PrismaBar} from './PrismaBar';
import {navigatePrisma} from './prisma-navigation';
import {editorKinds, productInfo} from './product-core';
const Current=lazy(()=>product.kind==='prisma'?import('./Prisma'):product.data?import('./Data'):product.slides||product.publisher?import('./Slides'):product.sheets?import('./Sheets'):import('./Studio'));
export default function App() {
  useEffect(()=>{
    if(!inPrisma||product.kind==='prisma')return;
    const click=(event:MouseEvent)=>{
      const anchor=(event.target as Element).closest?.('a');if(!anchor||anchor.target==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0)return;
      if(anchor.getAttribute('href')==='./'){event.preventDefault();void navigatePrisma().catch(error=>window.alert(String(error)));return;}
      const url=new URL(anchor.href),kind=editorKinds.find(kind=>url.href===productInfo(kind).website);
      const localKind=editorKinds.find(kind=>url.pathname===new URL('../'+(kind==='pdf'?'':kind+'/'),location.href).pathname&&url.origin===location.origin);
      if(!kind&&!localKind)return;event.preventDefault();
      void navigatePrisma(kind??localKind).catch(error=>window.alert(error instanceof Error?error.message:String(error)));
    };
    document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);
  },[]);
  return (
    <>{inPrisma&&product.kind!=='prisma'&&<PrismaBar/>}<Suspense
      fallback={<div className="sheets-busy">Abriendo {product.name}…</div>}
    >
      <Current/>
      {!inPrisma&&<SuiteAccess/>}
    </Suspense></>
  );
}
