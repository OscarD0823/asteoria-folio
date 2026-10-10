export type StoredBook = {
  bytes: Uint8Array;
  name: string;
  warnings: string[];
  original: Uint8Array | null;
};
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("prisma-sheets-local-v1", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("books");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveBook(book: StoredBook) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("books", "readwrite");
      t.objectStore("books").put(book, "current");
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
