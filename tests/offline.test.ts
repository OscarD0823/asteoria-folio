import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
// @ts-expect-error build tooling is JavaScript
import { offlineWorker } from "../scripts/offline-worker.mjs";

test("updates reuse identical app resources, replace changed files and never cache user data or release checks", async () => {
  const scope = "https://example.org/prisma/",
    stores = new Map<string, Map<string, Response>>(),
    downloads: string[] = [];
  const events: Record<string, Function> = {};
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (key: string) => stores.delete(key),
    open: async (key: string) => {
      if (!stores.has(key)) stores.set(key, new Map());
      const store = stores.get(key)!;
      return {
        match: async (url: string) => store.get(url)?.clone(),
        put: async (url: string, response: Response) => {
          store.set(url, response.clone());
        },
      };
    },
  };
  const context = {
    URL,
    Request,
    Response,
    Set,
    JSON,
    Promise,
    caches,
    fetch: async (request: Request) => {
      downloads.push(request.url);
      return new Response("new:" + request.url);
    },
    self: {
      registration: { scope },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (name: string, fn: Function) => {
        events[name] = fn;
      },
    },
  };
  const install = async (version: string, hashes: Record<string, string>) => {
    vm.runInNewContext(offlineWorker(hashes, version), { ...context });
    let done: Promise<unknown> | undefined;
    events.install({
      waitUntil: (promise: Promise<unknown>) => {
        done = promise;
      },
    });
    await done;
  };
  await install("first", { "index.html": "old", "fonts/sample.ttf": "same" });
  assert.equal(downloads.length, 2);
  downloads.length = 0;
  await install("second", {
    "index.html": "changed",
    "fonts/sample.ttf": "same",
    "assets/new.js": "new",
  });
  assert.deepEqual(downloads.sort(), [
    scope + "assets/new.js",
    scope + "index.html",
  ]);
  const current = await caches.open(
    "prisma-code-" + encodeURIComponent(scope) + "-second",
  );
  assert.equal(
    await (await current.match(scope + "fonts/sample.ttf"))?.text(),
    "new:" + scope + "fonts/sample.ttf",
  );
  for (const request of [
    new Request(scope + "version.json"),
    new Request(scope + "index.html", { cache: "no-store" }),
    new Request(scope + "private.pdf"),
    new Request(scope + "upload", { method: "POST", body: "private" }),
  ]) {
    let intercepted = false;
    events.fetch({
      request,
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  assert(
    [...stores.values()].every((store) =>
      [...store.keys()].every(
        (key) => !key.includes("private") && !key.includes("upload"),
      ),
    ),
  );
});
