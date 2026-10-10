import Typo from "typo-js";
let dictionary: Promise<Typo> | undefined;
let latest = 0;
function load(base: string) {
  return (dictionary ??= Promise.all(
    ["index.aff", "index.dic"].map(async (file) => {
      const response = await fetch(new URL("spelling/" + file, base));
      if (!response.ok)
        throw new Error(
          "No se pudo cargar el diccionario de español. Abre la aplicación una vez con conexión para preparar el modo sin conexión.",
        );
      return response.text();
    }),
  )
    .then(([aff, dic]) => new Typo("es", aff, dic, { platform: "any" }))
    .catch((error) => {
      dictionary = undefined;
      throw error;
    }));
}
self.onmessage = async ({ data }) => {
  if (data.action === "check") latest = data.id;
  try {
    const dict = await load(data.baseUrl);
    if (data.action === "suggest") {
      self.postMessage({ id: data.id, result: dict.suggest(data.words[0], 6) });
      return;
    }
    const result: string[] = [];
    for (let i = 0; i < data.words.length; i++) {
      if (latest !== data.id) {
        self.postMessage({ id: data.id, result: [] });
        return;
      }
      const word = String(data.words[i]).normalize("NFC");
      if (!dict.check(word)) result.push(word);
      if (i % 300 === 299)
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    self.postMessage({ id: data.id, result });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error:
        error instanceof Error ? error.message : "No se pudo revisar el texto.",
    });
  }
};
