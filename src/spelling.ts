import type { Node } from "@tiptap/pm/model";
import {applicationResourceBase} from './resource-base';
import {proofingLanguage,textWords,type ProofingLanguage} from './proofing-languages';
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
    for (const match of textWords(text)) {
      words.push({
        word: match.word,
        from: pos + 1 + match.from,
        to: pos + 1 + match.to,
      });
    }
    return false;
  });
  return words;
}
export function canonicalWord(word: string,language:ProofingLanguage='es') {
  return word.normalize("NFC").toLocaleLowerCase(proofingLanguage(language).locale);
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
  language:ProofingLanguage='es',
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
    worker!.postMessage({ id, action, words, language:proofingLanguage(language).id,baseUrl: applicationResourceBase() });
  });
}
