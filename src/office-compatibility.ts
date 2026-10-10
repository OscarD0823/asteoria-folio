import { academicPresets, type AcademicStyle } from "./academic";

export type OfficeImportReport = {
  academicStyles: {
    style: AcademicStyle;
    label: string;
    paragraphs: number;
    evidence: string[];
  }[];
  fontSubstitutions: { original: string; replacement: string }[];
  tables: number;
  images: number;
  captions: number;
  appendices: number;
  indices: number;
  sections: number;
  warnings: string[];
};

/** Only recognize a declared style name. Shared margins and fonts cannot prove a citation standard. */
export function declaredAcademicStyle(name: string): AcademicStyle | undefined {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const compact = normalized.replace(/ /g, "");
  const aliases: [AcademicStyle, RegExp][] = [
    ["apa", /^apa(?:7|\s|$)/],
    ["ieee", /^ieee(?:\s|$)/],
    ["iso690", /^iso\s*690(?:\s|$)/],
    ["mla", /^mla(?:9|\s|$)/],
    ["chicago", /^(?:chicago|turabian)(?:\s|$)/],
    ["harvard", /^harvard(?:\s|$)/],
    ["vancouver", /^vancouver(?:\s|$)/],
    ["acs", /^acs(?:\s|$)/],
    ["abnt", /^abnt(?:\s|$)/],
    ["acm", /^acm(?:\s|$)/],
    ["ama", /^ama(?:\s|$)/],
    ["cse", /^cse(?:\s|$)/],
    ["nature", /^nature(?:\s|$)/],
    ["science", /^science(?:\s|$)/],
  ];
  return (
    aliases.find(([, pattern]) => pattern.test(normalized))?.[0] ??
    (Object.keys(academicPresets) as AcademicStyle[]).find(
      (id) => id !== "free" && compact === id,
    )
  );
}
