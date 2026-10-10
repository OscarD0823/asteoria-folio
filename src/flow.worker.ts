import { buildFlowDocument } from "./flow";
import { setFontBaseUrl } from "./fonts";
self.onmessage = async ({ data }) => {
  try {
    setFontBaseUrl(data.baseUrl);
    const result = await buildFlowDocument(data.flow, data.title);
    self.postMessage(
      { id: data.id, result },
      { transfer: [result.bytes.buffer as ArrayBuffer] },
    );
  } catch (error) {
    self.postMessage({
      id: data.id,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo representar el documento.",
    });
  }
};
