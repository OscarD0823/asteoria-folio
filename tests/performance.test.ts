import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { canvasRatio } from "../src/performance";
import { emptyWorkspace } from "../src/pdf";
import {
  listProjects,
  loadProject,
  loadSession,
  saveProject,
  deleteProject,
} from "../src/storage";
Object.assign(globalThis, { indexedDB });
test("older project libraries migrate without loading PDF bytes in cards", async () => {
  const workspace = {
    ...emptyWorkspace(),
    name: "Proyecto anterior",
    projectId: "old",
    sources: [
      { id: "s", name: "local.pdf", bytes: new Uint8Array([37, 80, 68, 70]) },
    ],
    pages: [{ id: "p", sourceId: "s", index: 0, rotation: 0, marks: [] }],
  };
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("prisma-pdf-local-v2", 2);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("session");
      request.result.createObjectStore("projects", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["session", "projects"], "readwrite");
    tx.objectStore("session").put(
      { version: 2, workspace, updatedAt: 10 },
      "current",
    );
    tx.objectStore("projects").put({
      id: "old",
      name: workspace.name,
      updatedAt: 10,
      pageCount: 1,
      workspace,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  const cards = await listProjects();
  assert.deepEqual(cards, [
    { id: "old", name: "Proyecto anterior", updatedAt: 10, pageCount: 1 },
  ]);
  assert.deepEqual(
    (await loadProject("old")).sources[0].bytes,
    workspace.sources[0].bytes,
  );
  assert.equal((await loadSession())?.workspace.name, "Proyecto anterior");
  await saveProject({ ...workspace, name: "Proyecto actualizado" });
  assert.equal((await listProjects())[0].name, "Proyecto actualizado");
  assert.equal((await loadProject("old")).name, "Proyecto actualizado");
  await deleteProject("old");
  assert.deepEqual(await listProjects(), []);
  await assert.rejects(loadProject("old"), /no está disponible/);
});
test("screen bitmaps respect memory limits at high DPI and large zoom", () => {
  for (const [width, height, dpr, budget] of [
    [390, 552, 3, 2_000_000],
    [2400, 3394, 3, 2_000_000],
    [800, 1132, 2, 6_000_000],
  ]) {
    const ratio = canvasRatio(width, height, dpr, budget);
    assert.ok(width * height * ratio * ratio <= budget + 1);
    assert.ok(ratio <= 2);
  }
  assert.equal(canvasRatio(390, 552, 1, 2_000_000), 1);
});
