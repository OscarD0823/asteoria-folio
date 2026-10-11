import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { exportLexicon, lexiconEntry, loadLexicon, lookupKey, mergeLexicon, parseLexicon, saveLexicon, termKey } from "../src/lexicon";
test("dictionary lookup ignores accents while spelling entries retain distinct accents and Unicode", () => {
  const entries = parseLexicon("si\tCondición\nsí\tAfirmación\nNiño\tMenor\nNiño\tDefinición nueva\n東京\tCiudad\nInteligencia artificial\tÁrea", "vocabulario.tsv");
  assert.equal(entries.length, 5);
  assert.equal(lookupKey("sí"), lookupKey("si"));
  assert.notEqual(termKey("sí"), termKey("si"));
  assert.equal(entries.find(entry => entry.term === "Niño")?.definition, "Definición nueva");
  assert.equal(entries.find(entry => entry.term === "Inteligencia artificial")?.spelling, false);
  assert.deepEqual(parseLexicon(exportLexicon(entries), "copia.json"), entries);
});
test("lexicon validates the complete import before saving and merges duplicates without discarding definitions", async () => {
  const original = [lexiconEntry({ term: "Prisma", definition: "Editor", spelling: true })];
  await saveLexicon(original);
  assert.throws(() => parseLexicon('[{"term":"válida"},{"term":42}]', "mal.json"));
  assert.throws(() => parseLexicon('{"entries":[]}', "mal.json"));
  assert.throws(() => lexiconEntry({ term: "dos palabras", spelling: true }));
  assert.throws(() => parseLexicon("x".repeat(2 * 1024 * 1024 + 1), "demasiado.txt"));
  assert.throws(() => mergeLexicon([], Array.from({ length: 5001 }, (_, i) => lexiconEntry({ term: `Término ${i}`, spelling: false }))));
  assert.deepEqual(await loadLexicon(), original);
  const next = mergeLexicon(original, [lexiconEntry("PRISMA"), lexiconEntry({ term: "etiqueta", definition: "<script>alert(1)</script>" })]);
  assert.equal(next.find(entry => termKey(entry.term) === "prisma")?.definition, "Editor");
  await saveLexicon(next);
  assert.deepEqual(await loadLexicon(), next);
  assert.equal(next.find(entry => entry.term === "etiqueta")?.definition, "<script>alert(1)</script>");
});
