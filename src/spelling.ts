import type { Node } from "@tiptap/pm/model";
export type WordLocation = { word: string; from: number; to: number };
export function spellingWords(doc: Node): WordLocation[] {
  const words: WordLocation[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "generatedIndex" || node.type.name === "codeBlock")
      return false;
    if (!node.isTextblock) return;
    let text = "";
    node.forEach((child) => {
      text += child.isText ? child.text : "\uFFFC".repeat(child.nodeSize);
    });
    // Exclude URLs, email addresses and identifiers; retain original UTF-16 positions.
    const masked = text.replace(
      /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[\p{L}]+/gu,
      (m) => " ".repeat(m.length),
    );
    for (const match of masked.matchAll(
      /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu,
    )) {
      if (match[0].length > 64 || match[0].length < 2) continue;
      words.push({
        word: match[0],
        from: pos + 1 + match.index,
        to: pos + 1 + match.index + match[0].length,
      });
    }
    return false;
  });
  return words;
}
export function canonicalWord(word: string) {
  return word.normalize("NFC").toLocaleLowerCase("es");
}
let worker: Worker | undefined,
  sequence = 0;
const pending = new Map<
  number,
  { resolve: (result: string[]) => void; reject: (error: Error) => void }
>();
export function spellRequest(
  action: "check" | "suggest",
  words: string[],
): Promise<string[]> {
  if (!worker) {
    worker = new Worker(new URL("./spelling.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      data.error ? job.reject(new Error(data.error)) : job.resolve(data.result);
    };
    worker.onerror = () => {
      for (const job of pending.values())
        job.reject(new Error("No se pudo iniciar el diccionario local."));
      pending.clear();
      worker?.terminate();
      worker = undefined;
    };
  }
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ id, action, words, baseUrl: document.baseURI });
  });
}
