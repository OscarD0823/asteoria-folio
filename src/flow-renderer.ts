import type { FlowDocument, RichNode, PageLayout } from "./flow";
import {applicationResourceBase} from './resource-base';
type Result = {
  bytes: Uint8Array;
  pageMap: Record<string, number>;
  content: RichNode;
  pageLayouts: PageLayout[];
  pageSections: string[];
};
type Job = {
  id: number;
  flow: FlowDocument;
  title: string;
  resolve: (result: Result) => void;
  reject: (error: Error) => void;
};
let worker: Worker | undefined,
  active: Job | undefined,
  queued: Job | undefined,
  next = 0;
const exports: Job[] = [];
function dispatch(job: Job) {
  active = job;
  worker!.postMessage({
    id: job.id,
    flow: job.flow,
    title: job.title,
    baseUrl: applicationResourceBase(),
  });
}
export function renderFlow(
  flow: FlowDocument,
  title: string,
  mode: "preview" | "export" = "preview",
): Promise<Result> {
  if (!worker) {
    worker = new Worker(new URL("./flow.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      const job = active;
      if (!job || job.id !== data.id) return;
      active = undefined;
      data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
      const pending = exports.shift() ?? queued;
      if (pending) {
        if (pending === queued) queued = undefined;
        dispatch(pending);
      }
    };
    worker.onerror = () => {
      active?.reject(new Error("No se pudo iniciar la composición local."));
      queued?.reject(new Error("No se pudo iniciar la composición local."));
      for (const job of exports.splice(0))
        job.reject(new Error("No se pudo iniciar la composición local."));
      active = queued = undefined;
      worker?.terminate();
      worker = undefined;
    };
  }
  return new Promise((resolve, reject) => {
    const job = { id: next++, flow, title, resolve, reject };
    if (!active) dispatch(job);
    else if (mode === "export") exports.push(job);
    else {
      queued?.reject(new DOMException("Vista reemplazada", "AbortError"));
      queued = job;
    }
  });
}
