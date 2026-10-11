import { lazy, Suspense } from "react";
import { product } from "./product";
import {SuiteAccess} from './SuiteAccess';
const Current=lazy(()=>import.meta.env.VITE_PRODUCT==='data'?import('./Data'):import.meta.env.VITE_PRODUCT==='slides'||import.meta.env.VITE_PRODUCT==='publisher'?import('./Slides'):import.meta.env.VITE_PRODUCT==='sheets'?import('./Sheets'):import('./Studio'));
export default function App() {
  return (
    <Suspense
      fallback={<div className="sheets-busy">Abriendo {product.name}…</div>}
    >
      <Current/>
      <SuiteAccess/>
    </Suspense>
  );
}
