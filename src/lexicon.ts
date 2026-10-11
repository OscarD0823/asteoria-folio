export type LexiconEntry = { term: string; definition: string; spelling: boolean };
export const lexiconLimit = 5000;
export const termKey = (term: string) => term.normalize("NFC").trim().toLocaleLowerCase("es");
export const lookupKey = (term: string) => termKey(term).normalize("NFD").replace(/\p{Diacritic}/gu, "");
export const spellingTerm = (term: string) => /^\p{L}[\p{L}\p{M}]*(?:[-’']\p{L}[\p{L}\p{M}]*)*$/u.test(term);
export function lexiconEntry(value: unknown): LexiconEntry {
  const item = typeof value === "string" ? { term: value } : value;
  if (!item || typeof item !== "object" || !("term" in item) || typeof item.term !== "string")
    throw new Error("Cada entrada debe incluir un término de texto.");
  const term = item.term.normalize("NFC").trim();
  const definition = "definition" in item ? item.definition : "";
  const spelling = "spelling" in item ? item.spelling : spellingTerm(term);
  if (!term || term.length > 120 || /[\p{Cc}\p{Cf}]/u.test(term))
    throw new Error("Los términos deben tener entre 1 y 120 caracteres, sin caracteres de control.");
  if (typeof definition !== "string" || definition.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(definition))
    throw new Error("Cada definición debe ser texto de hasta 1.000 caracteres.");
  if (typeof spelling !== "boolean" || (spelling && !spellingTerm(term)))
    throw new Error("Solo una palabra puede marcarse como aceptada por el corrector.");
  return { term, definition: definition.normalize("NFC"), spelling };
}
export function mergeLexicon(current: LexiconEntry[], imported: LexiconEntry[]) {
  const entries = new Map<string, LexiconEntry>();
  for (const value of [...current, ...imported]) {
    const entry = lexiconEntry(value), key = termKey(entry.term), previous = entries.get(key);
    entries.set(key, { ...entry, definition: entry.definition || previous?.definition || "" });
  }
  if (entries.size > lexiconLimit) throw new Error("El diccionario admite hasta 5.000 entradas.");
  return [...entries.values()].sort((a, b) => a.term.localeCompare(b.term, "es"));
}
export function parseLexicon(text: string, filename: string) {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw new Error("Importa un archivo de hasta 2 MB.");
  text = text.replace(/^\uFEFF/, "");
  let values: unknown[];
  if (/\.json$/i.test(filename)) {
    const data: unknown = JSON.parse(text);
    if (Array.isArray(data)) values = data;
    else if (data && typeof data === "object" && "format" in data && data.format === "prisma-lexicon" && "version" in data && data.version === 1 && "entries" in data && Array.isArray(data.entries)) values = data.entries;
    else throw new Error("Usa un JSON de Prisma o una lista de entradas con term y definition.");
  } else if (/\.(txt|tsv)$/i.test(filename)) {
    values = text.split(/\r?\n/).filter(line => line.trim()).map(line => {
      const [term, ...definition] = line.split("\t");
      return { term, definition: definition.join("\t") };
    });
  } else throw new Error("Importa un archivo TXT, TSV o JSON.");
  if (values.length > lexiconLimit) throw new Error("El archivo admite hasta 5.000 entradas.");
  return mergeLexicon([], values.map(lexiconEntry));
}
export function exportLexicon(entries: LexiconEntry[]) {
  return JSON.stringify({ format: "prisma-lexicon", version: 1, entries: mergeLexicon([], entries) }, null, 2);
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("prisma-lexicon-local-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("lexicon");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadLexicon(): Promise<LexiconEntry[]> {
  const db = await database();
  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("lexicon").objectStore("lexicon").get("entries");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return Array.isArray(value) ? mergeLexicon([], value.map(lexiconEntry)) : [];
  } finally { db.close(); }
}
export async function saveLexicon(entries: LexiconEntry[]) {
  const validated = mergeLexicon([], entries), db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("lexicon", "readwrite");
      tx.objectStore("lexicon").put(validated, "entries");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
