import { isEditorKind, type EditorKind } from './product-core';
export type Launch = { editor: EditorKind; action: 'file' | 'recent'; file?: File; id?: string };
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('prisma-hub-local-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('launches', {keyPath: 'token'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function storeLaunch(launch: Launch) {
  if (!isEditorKind(launch.editor)) throw Error('Aplicación desconocida.');
  const token = crypto.randomUUID(), db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('launches', 'readwrite'), store = tx.objectStore('launches');
      const cursor = store.openCursor();
      cursor.onsuccess = () => { const entry = cursor.result; if (!entry) return; if (entry.value.created < Date.now() - 86400000) entry.delete(); entry.continue(); };
      store.put({...launch, token, created: Date.now()});
      tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error);
    });
    return token;
  } finally { db.close(); }
}
export async function takeLaunch(token: string, editor: EditorKind): Promise<Launch | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('launches', 'readwrite'), store = tx.objectStore('launches'), req = store.get(token);
      let launch: Launch | undefined;
      req.onsuccess = () => { const value = req.result; if (value && value.editor === editor && value.created >= Date.now() - 86400000) { launch = value; store.delete(token); } };
      tx.oncomplete = () => resolve(launch); tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export function editorForFile(name: string): EditorKind | undefined {
  const extension = name.toLowerCase().split('.').at(-1) ?? '';
  if (['pdf', 'prisma'].includes(extension)) return 'pdf';
  if (['docx', 'docm', 'txt'].includes(extension)) return 'writer';
  if (['xlsx', 'xlsm', 'csv', 'tsv'].includes(extension)) return 'sheets';
  if (['pptx', 'pptm'].includes(extension)) return 'slides';
  if (['sqlite', 'sqlite3', 'db'].includes(extension)) return 'data';
}
