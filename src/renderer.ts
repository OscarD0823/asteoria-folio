import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import worker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { Source } from "./pdf";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
const cache = new Map<string, pdfjs.PDFDocumentLoadingTask>();
export function getPdf(source: Source) {
  if (!cache.has(source.id))
    cache.set(
      source.id,
      pdfjs.getDocument({
        data: source.bytes.slice(),
        cMapUrl: new URL("./pdfjs/cmaps/", document.baseURI).href,
        cMapPacked: true,
        standardFontDataUrl: new URL(
          "./pdfjs/standard_fonts/",
          document.baseURI,
        ).href,
        wasmUrl: new URL("./pdfjs/wasm/", document.baseURI).href,
      }),
    );
  return cache.get(source.id)!.promise;
}
export async function clearPdfCache() {
  for (const task of cache.values())
    try {
      await task.destroy();
    } catch {}
  cache.clear();
}
export async function releasePdf(id: string) {
  const task = cache.get(id);
  cache.delete(id);
  if (task)
    try {
      await task.destroy();
    } catch {}
}
export async function releaseUnusedSources(ids: string[]) {
  const used = new Set(ids);
  for (const id of Array.from(cache.keys()))
    if (!used.has(id) && !id.startsWith("print-")) await releasePdf(id);
}
export { pdfjs };
