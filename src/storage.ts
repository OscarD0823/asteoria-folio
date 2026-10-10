import type { Workspace } from "./pdf";
const DB = "prisma-pdf-local-v2";
let queue: Promise<void> = Promise.resolve();
let generation = 0;
export type LocalSession = {
  version: 2;
  workspace: Workspace;
  updatedAt: number;
};
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 3);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("session"))
        req.result.createObjectStore("session");
      if (!req.result.objectStoreNames.contains("projects"))
        req.result.createObjectStore("projects", { keyPath: "id" });
      if (!req.result.objectStoreNames.contains("projectIndex")) {
        const index = req.result.createObjectStore("projectIndex", {
          keyPath: "id",
        });
        // Preserve older libraries while separating small cards from PDF bytes.
        const cursor = req.transaction!.objectStore("projects").openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          const { workspace: _workspace, ...metadata } = entry.value as Project;
          index.put(metadata);
          entry.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export function pruneSources(workspace: Workspace): Workspace {
  const used = new Set(workspace.pages.map((p) => p.sourceId));
  return {
    ...workspace,
    sources: workspace.sources.filter((s) => used.has(s.id)),
  };
}
export function saveSession(workspace: Workspace): Promise<void> {
  const expected = generation;
  const task = queue
    .catch(() => {})
    .then(async () => {
      if (expected !== generation) return;
      const db = await openDatabase();
      try {
        if (expected !== generation) return;
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("session", "readwrite");
          tx.objectStore("session").put(
            {
              version: 2,
              workspace: pruneSources(workspace),
              updatedAt: Date.now(),
            },
            "current",
          );
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    });
  queue = task;
  return task;
}
export async function loadSession(): Promise<LocalSession | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const req = db
        .transaction("session")
        .objectStore("session")
        .get("current");
      req.onsuccess = () =>
        resolve(req.result?.version === 2 ? req.result : undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export function clearSession(): Promise<void> {
  generation++;
  const task = queue
    .catch(() => {})
    .then(async () => {
      const db = await openDatabase();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("session", "readwrite");
          tx.objectStore("session").clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    });
  queue = task;
  return task;
}
export type Project = {
  id: string;
  name: string;
  updatedAt: number;
  pageCount: number;
  workspace: Workspace;
};
export type ProjectSummary = Omit<Project, "workspace">;
export async function saveProject(workspace: Workspace): Promise<string> {
  const id = workspace.projectId ?? crypto.randomUUID();
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects", "projectIndex"], "readwrite");
      const metadata: ProjectSummary = {
        id,
        name: workspace.name,
        updatedAt: Date.now(),
        pageCount: workspace.pages.length,
      };
      tx.objectStore("projectIndex").put(metadata);
      tx.objectStore("projects").put({
        ...metadata,
        workspace: pruneSources({ ...workspace, projectId: id }),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return id;
  } finally {
    db.close();
  }
}
export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const req = db
        .transaction("projectIndex")
        .objectStore("projectIndex")
        .getAll();
      req.onsuccess = () =>
        resolve(
          (req.result as ProjectSummary[]).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          ),
        );
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export async function loadProject(id: string): Promise<Workspace> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction("projects").objectStore("projects").get(id);
      req.onsuccess = () =>
        req.result?.workspace
          ? resolve(req.result.workspace)
          : reject(new Error("Este proyecto ya no está disponible."));
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export async function deleteProject(id: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects", "projectIndex"], "readwrite");
      tx.objectStore("projects").delete(id);
      tx.objectStore("projectIndex").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
