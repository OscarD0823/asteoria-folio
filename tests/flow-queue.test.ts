import test from "node:test";
import assert from "node:assert/strict";
import { renderFlow } from "../src/flow-renderer";
import { defaultLayout } from "../src/flow";
test("background previews cannot cancel a requested PDF export and foreground requests finish in order", async () => {
  const savedWorker = globalThis.Worker,
    savedDocument = globalThis.document;
  const dispatched: { id: number; title: string }[] = [];
  let instance: FakeWorker;
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    constructor() {
      instance = this;
    }
    postMessage(data: { id: number; title: string }) {
      dispatched.push(data);
    }
    terminate() {}
    finish(id: number) {
      this.onmessage?.({
        data: {
          id,
          result: {
            bytes: new Uint8Array([id]),
            content: { type: "doc" },
            pageMap: {},
          },
        },
      });
    }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  globalThis.document = { baseURI: "https://example.org/prisma/" } as Document;
  try {
    const flow = { content: { type: "doc" }, layout: defaultLayout() };
    const first = renderFlow(flow, "preview 1");
    const oldPreview = renderFlow(flow, "superseded preview").catch(
      (e) => e.name,
    );
    const export1 = renderFlow(flow, "export 1", "export");
    const export2 = renderFlow(flow, "export 2", "export");
    const latest = renderFlow(flow, "latest preview");
    assert.equal(await oldPreview, "AbortError");
    instance!.finish(dispatched[0].id);
    await first;
    assert.equal(dispatched[1].title, "export 1");
    instance!.finish(dispatched[1].id);
    await export1;
    assert.equal(dispatched[2].title, "export 2");
    instance!.finish(dispatched[2].id);
    await export2;
    assert.equal(dispatched[3].title, "latest preview");
    instance!.finish(dispatched[3].id);
    await latest;
  } finally {
    globalThis.Worker = savedWorker;
    globalThis.document = savedDocument;
  }
});
