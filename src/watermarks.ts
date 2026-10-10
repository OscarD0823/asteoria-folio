import {
  PDFDocument,
  PDFArray,
  PDFName,
  PDFRawStream,
  PDFDict,
  decodePDFRawStream,
} from "pdf-lib";
import {
  drawWatermark,
  pageSize,
  type PageLayout,
  type Watermark,
} from "./flow";
import type { NativeObject } from "./native";
// Only an explicitly tagged Watermark artifact is copied automatically.
// This avoids copying body text, headers or entire scanned pages as a watermark.
export function watermarkArtifacts(content: string): string {
  const tokens = Array.from(
    content.matchAll(
      /%[^\r\n]*|\((?:\\[\s\S]|[^\\()])*\)|<(?!<)[\da-f\s]*>|\/[\w#.-]+|\b(?:BDC|BMC|EMC)\b/g,
    ),
  );
  const stack: { start: number; watermark: boolean }[] = [],
    blocks: string[] = [];
  let segmentStart = 0;
  for (const token of tokens) {
    const value = token[0],
      at = token.index!;
    if (value === "BDC" || value === "BMC") {
      const previous = content.slice(segmentStart, at),
        start = previous.lastIndexOf("/Artifact"),
        watermark =
          start >= 0 &&
          (/\/Subtype\s*\/Watermark\b/.test(previous.slice(start)) ||
            /\/Watermark\b/.test(previous.slice(start)));
      stack.push({ start: start >= 0 ? segmentStart + start : at, watermark });
      segmentStart = at + value.length;
    } else if (value === "EMC") {
      const open = stack.pop();
      if (open?.watermark && !stack.some((s) => s.watermark))
        blocks.push(content.slice(open.start, at + 3));
      segmentStart = at + 3;
    }
  }
  return blocks.map((b) => "q\n" + b + "\nQ").join("\n");
}
export function watermarkCandidate(
  objects: NativeObject[],
  width: number,
  height: number,
): Watermark | undefined {
  const object = objects.find(
    (o) =>
      o.kind === "text" &&
      o.size >= 26 &&
      /^(?:CONFIDENCIAL|BORRADOR|COPIA|DRAFT|SAMPLE|MUESTRA|NO VÁLIDO|NO VALIDO|PRIVADO)$/i.test(
        o.text?.trim() ?? "",
      ) &&
      o.y > height * 0.15 &&
      o.y < height * 0.8 &&
      o.x < width * 0.8,
  );
  if (!object) return;
  return {
    text: object.text!.trim(),
    color: object.color,
    opacity: 0.18,
    angle: object.angle ?? 35,
    size: object.size,
  };
}
export async function blankWithWatermarks(
  bytes: Uint8Array,
  index: number,
  layout: PageLayout,
  fallback?: Watermark,
): Promise<Uint8Array> {
  const input = await PDFDocument.load(bytes),
    original = input.getPage(index),
    out = await PDFDocument.create();
  const contents = original.node.Contents();
  let text = "";
  const streams =
    contents instanceof PDFArray
      ? contents.asArray()
      : contents
        ? [contents]
        : [];
  for (const ref of streams) {
    const stream = input.context.lookup(ref);
    if (stream instanceof PDFRawStream)
      try {
        text +=
          new TextDecoder("latin1").decode(
            decodePDFRawStream(stream).decode(),
          ) + "\n";
      } catch {
        /* Unsupported filters are left in the original document. */
      }
  }
  const artifact = watermarkArtifacts(text);
  if (artifact) {
    original.node.set(
      PDFName.of("Contents"),
      input.context.register(input.context.flateStream(artifact)),
    );
    original.node.delete(PDFName.of("Annots"));
    // Copy only resources referenced by the retained artifact.
    const resources = original.node.Resources(),
      clean = input.context.obj({});
    if (resources)
      for (const category of [
        "Font",
        "XObject",
        "ExtGState",
        "ColorSpace",
        "Pattern",
        "Shading",
      ]) {
        const dict = resources.lookupMaybe(PDFName.of(category), PDFDict);
        if (!dict) continue;
        const used = input.context.obj({});
        for (const [name, value] of dict.entries())
          if (artifact.includes(name.toString())) used.set(name, value);
        if (used.keys().length) clean.set(PDFName.of(category), used);
      }
    original.node.set(PDFName.of("Resources"), clean);
    const [page] = await out.copyPages(input, [index]);
    out.addPage(page);
  } else {
    const page = out.addPage(pageSize(layout));
    if (fallback) await drawWatermark(out, page, fallback);
  }
  return out.save();
}
