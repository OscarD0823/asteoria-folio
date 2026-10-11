export type StoredBook = {
  bytes: Uint8Array;
  name: string;
  warnings: string[];
  original: Uint8Array | null;
  updated?: number;
};
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("prisma-sheets-local-v1", 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('books')) r.result.createObjectStore('books');
      if (!r.result.objectStoreNames.contains('cards')) {
        const cards = r.result.createObjectStore('cards');
        const req = r.transaction!.objectStore('books').get('current');
        req.onsuccess = () => { if(req.result) cards.put({id:'current',name:req.result.name,updated:req.result.updated ?? 0},'current'); };
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveBook(book: StoredBook) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(['books','cards'], "readwrite"), updated = Date.now();
      t.objectStore("books").put({...book, updated}, "current");
      t.objectStore('cards').put({id:'current',name:book.name,updated},'current');
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
export async function loadBook(): Promise<StoredBook | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction("books", "readonly"),
        r = t.objectStore("books").get("current");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
