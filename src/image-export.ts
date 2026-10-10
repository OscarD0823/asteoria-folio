import { zipSync } from "fflate";
import { getPdf, releaseUnusedSources } from "./renderer";
import { uid } from "./pdf";
export async function exportPageImages(
  bytes: Uint8Array,
  keepSources: string[],
) {
  const source = { id: uid(), name: "Exportación", bytes },
    doc = await getPdf(source),
    files: Record<string, Uint8Array> = {};
  let total = 0;
  try {
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number),
        base = page.getViewport({ scale: 1 }),
        viewport = page.getViewport({
          scale: Math.min(1.5, Math.sqrt(3000000 / (base.width * base.height))),
        }),
        canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({
        canvas,
        canvasContext: canvas.getContext("2d")!,
        viewport,
      }).promise;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("No se pudo crear la imagen.")),
          "image/png",
        ),
      );
      const image = new Uint8Array(await blob.arrayBuffer());
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      total += image.length;
      if (total > 100 * 1024 * 1024)
        throw new Error(
          "Las imágenes superan 100 MB. Exporta un rango de páginas más pequeño.",
        );
      files["pagina-" + String(number).padStart(3, "0") + ".png"] = image;
    }
    return doc.numPages === 1
      ? { bytes: files["pagina-001.png"], extension: "png", mime: "image/png" }
      : {
          bytes: zipSync(files, { level: 0 }),
          extension: "zip",
          mime: "application/zip",
        };
  } finally {
    await releaseUnusedSources(keepSources);
  }
}
