import {isEditorKind, type EditorKind} from './product-core';
export type LibraryCard = {id: string; editor: EditorKind; name: string; updated: number; session?: boolean};
// Read metadata only; document bytes never need to enter dashboard state.
async function readStore(dbName: string, storeName: string, key?: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName); let absent = false;
    request.onupgradeneeded = () => { absent = true; request.transaction!.abort(); };
    request.onerror = () => absent ? resolve([]) : reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve([]); return; }
      const tx = db.transaction(storeName, 'readonly'), store = tx.objectStore(storeName);
      const req = key === undefined ? store.getAll() : store.get(key); let result: unknown[] = [];
      req.onsuccess = () => { result = key === undefined ? req.result : req.result ? [req.result] : []; };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
export async function listPrismaLibrary(): Promise<{cards: LibraryCard[]; errors: number}> {
  const results = await Promise.allSettled([
    readStore('prisma-pdf-local-v2', 'projectIndex'), readStore('prisma-writer-local-v1', 'projectIndex'),
    readStore('prisma-office-local-v1', 'cards'), readStore('prisma-sheets-local-v1', 'cards', 'current'),
  ]);
  const cards: LibraryCard[] = [];
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    for (const raw of result.value) {
      const row = raw as Record<string, unknown>;
      const editor = index < 2 ? index === 0 ? 'pdf' : 'writer' : index === 3 ? 'sheets' : row.product;
      if (!isEditorKind(editor) || typeof row.name !== 'string' || typeof row.id !== 'string') continue;
      cards.push({id: row.id, editor, name: row.name, updated: Number(row.updatedAt ?? row.updated) || 0, session: index === 3});
    }
  });
  return {cards: cards.sort((a,b) => b.updated - a.updated), errors: results.filter(r => r.status === 'rejected').length};
}
