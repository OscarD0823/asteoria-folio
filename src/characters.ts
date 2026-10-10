export type CharacterInfo = {
  char: string;
  point: number;
  code: string;
  count: number;
  category: string;
  name: string;
  mark: string;
};
const names: Record<number, [string, string]> = {
  9: ["Tabulación", "→"],
  10: ["Salto de línea", "↵"],
  13: ["Retorno de carro", "↵"],
  32: ["Espacio", "·"],
  160: ["Espacio inseparable", "°"],
  173: ["Guion opcional", "¬"],
  0x200b: ["Espacio de ancho cero", "ZWSP"],
  0x200c: ["Separador de ancho cero", "ZWNJ"],
  0x200d: ["Unión de ancho cero", "ZWJ"],
  0x200e: ["Marca de izquierda a derecha", "LRM"],
  0x200f: ["Marca de derecha a izquierda", "RLM"],
  0x2028: ["Separador de línea", "↵"],
  0x2029: ["Separador de párrafo", "¶"],
  0x202a: ["Inserción de izquierda a derecha", "LRE"],
  0x202b: ["Inserción de derecha a izquierda", "RLE"],
  0x202c: ["Fin del formato direccional", "PDF"],
  0x202d: ["Forzado de izquierda a derecha", "LRO"],
  0x202e: ["Forzado de derecha a izquierda", "RLO"],
  0x202f: ["Espacio estrecho inseparable", "°"],
  0x2060: ["Unión de palabras", "WJ"],
  0x2066: ["Aislamiento de izquierda a derecha", "LRI"],
  0x2067: ["Aislamiento de derecha a izquierda", "RLI"],
  0x2068: ["Aislamiento de primera dirección", "FSI"],
  0x2069: ["Fin de aislamiento direccional", "PDI"],
  0xfeff: ["Marca de orden de bytes / espacio de ancho cero", "BOM"],
};
export function formattingCharacter(char: string) {
  const point = char.codePointAt(0)!;
  if (names[point]) return { name: names[point][0], mark: names[point][1] };
  if (/\p{Z}/u.test(char)) return { name: "Espacio tipográfico", mark: "␣" };
  if (/[\p{Cc}\p{Cf}]|\p{Default_Ignorable_Code_Point}/u.test(char))
    return {
      name: "Carácter de formato",
      mark:
        (point >= 0xfe00 && point <= 0xfe0f) ||
        (point >= 0xe0100 && point <= 0xe01ef)
          ? "VS"
          : "U+" + point.toString(16).toUpperCase().padStart(4, "0"),
    };
  return null;
}
export function inspectCharacters(
  text: string,
  unicodeNames: Map<number, string> = new Map(),
): CharacterInfo[] {
  const result = new Map<number, CharacterInfo>();
  for (const char of text) {
    const point = char.codePointAt(0)!,
      prior = result.get(point);
    if (prior) {
      prior.count++;
      continue;
    }
    const format = formattingCharacter(char);
    const category = /[\p{Cc}\p{Cf}]|\p{Default_Ignorable_Code_Point}/u.test(
      char,
    )
      ? "Formato e invisibles"
      : /\p{Z}/u.test(char)
        ? "Espacios"
        : /\p{M}/u.test(char)
          ? "Marcas combinantes"
          : /\p{L}/u.test(char)
            ? "Letras"
            : /\p{N}/u.test(char)
              ? "Números"
              : /\p{P}/u.test(char)
                ? "Puntuación"
                : "Símbolos y otros";
    result.set(point, {
      char,
      point,
      code: "U+" + point.toString(16).toUpperCase().padStart(4, "0"),
      count: 1,
      category,
      name:
        format?.name ??
        unicodeNames.get(point) ??
        (point >= 0x4e00 && point <= 0x9fff ? "Ideograma CJK" : category),
      mark: format?.mark ?? char,
    });
  }
  return [...result.values()].sort((a, b) => a.point - b.point);
}
export function graphemeCount(text: string) {
  if (typeof Intl.Segmenter === "function")
    return [
      ...new Intl.Segmenter("es", { granularity: "grapheme" }).segment(text),
    ].length;
  return Array.from(text).length;
}
let unicodeNames: Promise<Map<number, string>> | undefined;
export function loadCharacterNames() {
  return (unicodeNames ??= fetch(
    new URL("unicode/UnicodeData.txt", document.baseURI),
  )
    .then(async (response) => {
      if (!response.ok)
        throw new Error("No se pudieron cargar los nombres Unicode.");
      const entries = new Map<number, string>();
      for (const line of (await response.text()).split("\n")) {
        const [code, name, , , , , , , , , alias] = line.split(";");
        if (code && name && (!name.startsWith("<") || name === "<control>"))
          entries.set(parseInt(code, 16), name === "<control>" ? alias : name);
      }
      return entries;
    })
    .catch((error) => {
      unicodeNames = undefined;
      throw error;
    }));
}
