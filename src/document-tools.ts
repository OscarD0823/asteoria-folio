import type { RichNode } from "./flow";
import { academicPlainText } from "./academic";
export function textStatistics(text: string) {
  const numbers = Array.from(
    text.matchAll(/(?<![\p{L}\d])[-+]?\d+(?:[.,]\d+)*(?![\p{L}\d])/gu),
    (m) => {
      let n = m[0];
      if (n.includes(",") && n.includes("."))
        n =
          n.lastIndexOf(",") > n.lastIndexOf(".")
            ? n.replace(/\./g, "").replace(",", ".")
            : n.replace(/,/g, "");
      else if (n.includes(",")) n = n.replace(",", ".");
      return Number(n);
    },
  ).filter(Number.isFinite);
  return {
    words: (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length,
    characters: Array.from(text).length,
    withoutSpaces: Array.from(text.replace(/\s/g, "")).length,
    numbers: numbers.length,
    sum: numbers.reduce((a, b) => a + b, 0),
  };
}
export const documentStatistics = (node: RichNode) =>
  textStatistics(academicPlainText(node));
export const corrections: Record<string, string> = {
  qeu: "que",
  poruqe: "porque",
  tambine: "también",
  tambien: "también",
  tecnologIa: "tecnología",
  tecnologia: "tecnología",
  informacion: "información",
  investigacion: "investigación",
  bibliografia: "bibliografía",
  paguina: "página",
  pagina: "página",
  docuemento: "documento",
  documento: "documento",
  selecion: "selección",
  seleccion: "selección",
  ecuacion: "ecuación",
  conclucion: "conclusión",
  conclusion: "conclusión",
  introduccion: "introducción",
  aplicacion: "aplicación",
  margenes: "márgenes",
  numeros: "números",
  simbolos: "símbolos",
  graficos: "gráficos",
  apendice: "apéndice",
  apendices: "apéndices",
};
export function correctWord(word: string) {
  const replacement = corrections[word.toLocaleLowerCase("es")];
  if (!replacement) return word;
  return word === word.toLocaleUpperCase("es")
    ? replacement.toLocaleUpperCase("es")
    : /^\p{Lu}/u.test(word)
      ? replacement[0].toLocaleUpperCase("es") + replacement.slice(1)
      : replacement;
}
export function findNodes(
  node: RichNode,
  predicate: (node: RichNode) => boolean,
): RichNode[] {
  return [
    ...(predicate(node) ? [node] : []),
    ...(node.content ?? []).flatMap((n) => findNodes(n, predicate)),
  ];
}
