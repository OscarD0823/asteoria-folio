import { Capacitor, registerPlugin } from "@capacitor/core";
import { getPdf, releasePdf } from "./renderer";
import { uid } from "./pdf";
export type PrintPage = { data: string; width: number; height: number };
export async function preparePrint(
  bytes: Uint8Array,
  preview = false,
): Promise<PrintPage[]> {
  const id = "print-" + uid(),
    pdf = await getPdf({ id, name: "Imprimir", bytes }),
    pages: PrintPage[] = [];
  try {
    const count = preview ? Math.min(3, pdf.numPages) : pdf.numPages;
    let pixels = 0;
    for (let i = 1; i <= count; i++) {
      const p = await pdf.getPage(i),
        view = p.getViewport({ scale: 1 }),
        canvas = document.createElement("canvas"),
        scale = Math.min(
          preview ? 0.8 : 1.6,
          (preview ? 700 : 1800) / Math.max(view.width, view.height),
          Math.sqrt(24_000_000 / count / (view.width * view.height)),
        ),
        render = p.getViewport({ scale });
      pixels += render.width * render.height;
      if ((!preview && scale < 0.6) || pixels > 25_000_000)
        throw new Error(
          "Para imprimir este documento sin agotar la memoria, elige un rango de páginas más pequeño.",
        );
      canvas.width = render.width;
      canvas.height = render.height;
      await p.render({
        canvas,
        canvasContext: canvas.getContext("2d")!,
        viewport: render,
      }).promise;
      pages.push({
        data: canvas.toDataURL("image/png"),
        width: view.width,
        height: view.height,
      });
      canvas.width = canvas.height = 0;
    }
    return pages;
  } finally {
    await releasePdf(id);
  }
}
function htmlFor(pages: PrintPage[], name: string) {
  const title = name.replace(/[<>&"']/g, "");
  return `<!doctype html><html><head><title>${title}</title><style>@page{size:${pages[0].width}pt ${pages[0].height}pt;margin:0}html,body{margin:0;padding:0}.sheet{page-break-after:always;break-after:page;width:100%;height:auto;display:block}.sheet:last-child{page-break-after:auto;break-after:auto}</style></head><body>${pages.map((p) => `<img class="sheet" src="${p.data}" width="${p.width}" height="${p.height}">`).join("")}</body></html>`;
}
export async function printDocument(
  bytes: Uint8Array,
  pages: PrintPage[],
  name: string,
  pageCount = pages.length,
) {
  if (Capacitor.isNativePlatform()) {
    let raw = "";
    for (let i = 0; i < bytes.length; i += 32768)
      raw += String.fromCharCode(...bytes.subarray(i, i + 32768));
    await registerPlugin<{
      print: (v: {
        data: string;
        name: string;
        pageCount: number;
      }) => Promise<void>;
    }>("PrismaPrint").print({ data: btoa(raw), name, pageCount });
    return;
  }
  const native = (
    window as unknown as {
      prismaDesktop?: {
        print: (v: { pages: PrintPage[]; name: string }) => Promise<void>;
      };
    }
  ).prismaDesktop;
  // Only prepare full print bitmaps after the user requests printing. Android
  // receives the original PDF and preserves vectors in its system print dialog.
  pages = await preparePrint(bytes);
  if (native) {
    await native.print({ pages, name });
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;width:1px;height:1px;left:-10000px;top:0;border:0";
  iframe.title = "Documento para imprimir";
  document.body.append(iframe);
  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = async () => {
        try {
          await Promise.all(
            Array.from(iframe.contentDocument!.images).map((img) =>
              img.decode(),
            ),
          );
          resolve();
        } catch {
          reject(new Error("No se pudo preparar la impresión."));
        }
      };
      iframe.srcdoc = htmlFor(pages, name);
    });
  } catch (error) {
    iframe.remove();
    throw error;
  }
  const win = iframe.contentWindow!;
  win.addEventListener("afterprint", () => iframe.remove(), { once: true });
  win.focus();
  win.print();
  setTimeout(() => iframe.remove(), 180000);
}
