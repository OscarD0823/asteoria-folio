import type * as MuPDF from "mupdf";
export type NativeObject = {
  id: string;
  kind: "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  size: number;
  color: string;
  font: string;
  bold: boolean;
  italic: boolean;
  data?: string;
  baseline?: number;
  angle?: number;
  editable: boolean;
};
export type Inspection = {
  width: number;
  height: number;
  objects: NativeObject[];
};
export type NativeRequest = {
  action:
    | "watermarks"
    | "inspect"
    | "remove"
    | "redact"
    | "compress"
    | "editAll"
    | "redactText";
  rects?: [number, number, number, number][];
  bytes: Uint8Array;
  index: number;
  objectId?: string;
  rect?: [number, number, number, number];
  engineUrl?: string;
};
let enginePromise: Promise<typeof MuPDF> | undefined;
export function loadNativeEngine(url?: string): Promise<typeof MuPDF> {
  if (!enginePromise) {
    const moduleUrl = url ?? "mupdf";
    enginePromise = import(/* @vite-ignore */ moduleUrl);
  }
  return enginePromise!;
}
const pngUrl = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return "data:image/png;base64," + btoa(binary);
};
const colorHex = (color: number[]) =>
  "#" +
  [0, 1, 2]
    .map((i) =>
      Math.round(Math.max(0, Math.min(1, color[i] ?? color[0] ?? 0)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export type TextPreparation = { bytes: Uint8Array; pages: Inspection[] };
function inspect(
  page: MuPDF.PDFPage,
  m: typeof MuPDF,
  images = true,
): Inspection {
  const bounds = page.getBounds();
  const objects: NativeObject[] = [];
  const structured = page.toStructuredText("preserve-images,preserve-spans");
  let current: NativeObject | undefined;
  let lineCount = 0,
    imageCount = 0;
  try {
    structured.walk({
      beginLine: (box, wmode, dir) => {
        current = {
          id: `text-${lineCount++}`,
          kind: "text",
          x: box[0],
          y: box[1],
          width: box[2] - box[0],
          height: box[3] - box[1],
          text: "",
          angle: (Math.atan2(-dir[1], dir[0]) * 180) / Math.PI,
          size: 12,
          color: "#101820",
          font: "Helvetica",
          bold: false,
          italic: false,
          editable: wmode === 0 && Math.abs(dir[1]) < 0.01,
        };
      },
      onChar: (c, origin, font, size, _quad, color) => {
        if (!current) return;
        if (!current.text) {
          current.size = size;
          current.font = font.isMono()
            ? "Courier"
            : font.isSerif()
              ? "Times-Roman"
              : "Helvetica";
          current.bold = font.isBold();
          current.italic = font.isItalic();
          current.color = colorHex(color);
          current.baseline = origin[1];
        }
        current.text += c;
      },
      endLine: () => {
        if (current?.text?.trim()) objects.push(current);
        current = undefined;
      },
      onImageBlock: (box, transform, image) => {
        if (!images) return;
        const width = box[2] - box[0],
          height = box[3] - box[1];
        if (width < 2 || height < 2) return;
        const scale = Math.min(2, 2200 / Math.max(width, height));
        const matrix = m.Matrix.concat(transform, m.Matrix.scale(scale, scale));
        const rect = m.Rect.transform(box, m.Matrix.scale(scale, scale));
        const pixmap = new m.Pixmap(
          m.ColorSpace.DeviceRGB,
          [
            Math.floor(rect[0]),
            Math.floor(rect[1]),
            Math.ceil(rect[2]),
            Math.ceil(rect[3]),
          ],
          true,
        );
        pixmap.clear(0);
        const device = new m.DrawDevice(m.Matrix.identity, pixmap);
        const mask = image.getMask();
        let alphaPixmap: MuPDF.Pixmap | undefined,
          alphaDevice: MuPDF.DrawDevice | undefined;
        try {
          // PDF soft masks are separate grayscale images. DrawDevice.fillImage
          // does not composite them automatically, so preserve their alpha here.
          device.fillImage(image, matrix, 1);
          device.close();
          if (mask) {
            alphaPixmap = new m.Pixmap(
              m.ColorSpace.DeviceGray,
              pixmap.getBounds() as MuPDF.Rect,
              false,
            );
            alphaPixmap.clear(0);
            alphaDevice = new m.DrawDevice(m.Matrix.identity, alphaPixmap);
            if (!mask.getColorSpace() || mask.getImageMask())
              alphaDevice.fillImageMask(
                mask,
                matrix,
                m.ColorSpace.DeviceGray,
                [1],
                1,
              );
            else alphaDevice.fillImage(mask, matrix, 1);
            alphaDevice.close();
            const out = pixmap.getPixels(),
              ap = alphaPixmap.getPixels();
            for (let y = 0; y < pixmap.getHeight(); y++)
              for (let x = 0; x < pixmap.getWidth(); x++) {
                const i = y * pixmap.getStride() + x * 4,
                  a = ap[y * alphaPixmap.getStride() + x] / 255;
                for (let c = 0; c < 4; c++) out[i + c] *= a;
              }
          }
          objects.push({
            id: `image-${imageCount++}`,
            kind: "image",
            x: box[0],
            y: box[1],
            width,
            height,
            size: 0,
            color: "#101820",
            font: "Helvetica",
            bold: false,
            italic: false,
            editable: true,
            data: pngUrl(new Uint8Array(pixmap.asPNG())),
          });
        } finally {
          alphaDevice?.destroy();
          alphaPixmap?.destroy();
          mask?.destroy();
          device.destroy();
          pixmap.destroy();
        }
      },
    });
  } finally {
    structured.destroy();
  }
  return {
    width: bounds[2] - bounds[0],
    height: bounds[3] - bounds[1],
    objects,
  };
}
export async function nativeOperation(
  request: NativeRequest,
): Promise<Inspection | Uint8Array | TextPreparation> {
  const m = await loadNativeEngine(request.engineUrl);
  const input = m.Document.openDocument(
    request.bytes,
    "application/pdf",
  ) as MuPDF.PDFDocument;
  input.disableJS();
  try {
    if (input.needsPassword())
      throw new Error("Abre una copia del PDF sin contraseña.");
    if (request.action === "compress") {
      const buffer = input.saveToBuffer(
        "garbage=4,compress=yes,compress-images=yes,compress-fonts=yes",
      );
      try {
        return new Uint8Array(buffer.asUint8Array());
      } finally {
        buffer.destroy();
      }
    }
    if (request.action === "editAll") {
      const pages: Inspection[] = [];
      for (let index = 0; index < input.countPages(); index++) {
        const page = input.loadPage(index);
        try {
          const data = inspect(page, m, false);
          const objects = data.objects.filter(
            (o) =>
              o.editable &&
              !(
                o.size >= 26 &&
                /^(CONFIDENCIAL|BORRADOR|COPIA|DRAFT|SAMPLE|MUESTRA|PRIVADO)$/i.test(
                  o.text?.trim() ?? "",
                )
              ),
          );
          pages.push({ ...data, objects });
        } finally {
          page.destroy();
        }
      }
      return { bytes: request.bytes.slice(), pages };
    }
    if (request.action === "inspect" || request.action === "watermarks") {
      const page = input.loadPage(request.index);
      try {
        return inspect(page, m, request.action !== "watermarks");
      } finally {
        page.destroy();
      }
    }
    const output = new m.PDFDocument();
    try {
      output.graftPage(-1, input, request.index);
      const page = output.loadPage(0);
      try {
        if (request.action === "redactText") {
          for (const rect of request.rects ?? []) {
            if (
              rect.some((n) => !Number.isFinite(n)) ||
              rect[2] <= rect[0] ||
              rect[3] <= rect[1]
            )
              throw new Error("Área de texto no válida.");
            const a = page.createAnnotation("Redact");
            try {
              a.setRect(rect);
              a.setColor([]);
              a.update();
            } finally {
              a.destroy();
            }
          }
          page.applyRedactions(
            false,
            m.PDFPage.REDACT_IMAGE_NONE,
            m.PDFPage.REDACT_LINE_ART_NONE,
            m.PDFPage.REDACT_TEXT_REMOVE,
          );
          page.update();
          const buffer = output.saveToBuffer("garbage=4,compress=yes");
          try {
            return new Uint8Array(buffer.asUint8Array());
          } finally {
            buffer.destroy();
          }
        }
        let box = request.rect;
        let imageMethod = m.PDFPage.REDACT_IMAGE_PIXELS,
          textMethod = m.PDFPage.REDACT_TEXT_REMOVE,
          lineMethod = m.PDFPage.REDACT_LINE_ART_REMOVE_IF_TOUCHED;
        if (request.action === "remove") {
          const object = inspect(page, m).objects.find(
            (o) => o.id === request.objectId,
          );
          if (!object)
            throw new Error("El elemento cambió. Vuelve a seleccionarlo.");
          if (!object.editable)
            throw new Error(
              "Este texto está girado o es vertical. Puedes borrarlo por área y añadir texto.",
            );
          // A narrow band through the glyph bodies avoids touching adjacent lines
          // whose font ascent/descent bounding boxes can overlap.
          box =
            object.kind === "text"
              ? [
                  object.x + 0.1,
                  (object.baseline ?? object.y + object.size) -
                    object.size * 0.65,
                  object.x + object.width - 0.1,
                  (object.baseline ?? object.y + object.size) -
                    object.size * 0.15,
                ]
              : [
                  object.x + 0.1,
                  object.y + 0.1,
                  object.x + object.width - 0.1,
                  object.y + object.height - 0.1,
                ];
          imageMethod =
            object.kind === "image"
              ? m.PDFPage.REDACT_IMAGE_REMOVE
              : m.PDFPage.REDACT_IMAGE_NONE;
          textMethod =
            object.kind === "image"
              ? m.PDFPage.REDACT_TEXT_NONE
              : m.PDFPage.REDACT_TEXT_REMOVE;
          lineMethod = m.PDFPage.REDACT_LINE_ART_NONE;
        }
        if (
          !box ||
          box.some((n) => !Number.isFinite(n)) ||
          box[2] <= box[0] ||
          box[3] <= box[1]
        )
          throw new Error("Selecciona un área válida.");
        const annotation = page.createAnnotation("Redact");
        annotation.setRect(box);
        annotation.setColor([]);
        annotation.update();
        page.applyRedactions(false, imageMethod, lineMethod, textMethod);
        page.update();
        const buffer = output.saveToBuffer("garbage=4,compress=yes");
        try {
          return new Uint8Array(buffer.asUint8Array());
        } finally {
          buffer.destroy();
        }
      } finally {
        page.destroy();
      }
    } finally {
      output.destroy();
    }
  } finally {
    input.destroy();
    m.emptyStore();
  }
}
