import { lazy, Suspense } from "react";
import { product } from "./product";
const Studio = lazy(() => import("./Studio"));
const Sheets = lazy(() => import("./Sheets"));
export default function App() {
  return (
    <Suspense
      fallback={<div className="sheets-busy">Abriendo {product.name}…</div>}
    >
      {product.sheets ? <Sheets /> : <Studio />}
    </Suspense>
  );
}
