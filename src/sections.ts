import type { Editor } from "@tiptap/core";
import type { PageLayout, RichNode } from "./flow";
export type SectionKind = "nextPage" | "continuous" | "oddPage" | "evenPage";
export type SectionInfo = {
  id: string;
  title: string;
  kind: SectionKind;
  layout: PageLayout;
  linkToPrevious: boolean;
  restartNumbering: boolean;
  position?: number;
};
export const sectionKinds: Record<SectionKind, string> = {
  nextPage: "Página siguiente",
  continuous: "Continuo",
  oddPage: "Página impar",
  evenPage: "Página par",
};
export function inheritedSectionLayout(
  previous: PageLayout,
  section: SectionInfo,
): PageLayout {
  const next = { ...previous, ...section.layout };
  if (section.linkToPrevious)
    for (const key of [
      "header",
      "footer",
      "headerFirst",
      "footerFirst",
      "headerEven",
      "footerEven",
      "differentFirst",
      "oddEven",
    ] as const)
      Object.assign(next, { [key]: previous[key] });
  return next;
}
export function documentSections(
  content: RichNode,
  initial: PageLayout,
): SectionInfo[] {
  const result: SectionInfo[] = [
    {
      id: "",
      title: "Sección 1",
      kind: "nextPage",
      layout: initial,
      linkToPrevious: false,
      restartNumbering: false,
    },
  ];
  for (const node of content.content ?? [])
    if (node.type === "sectionBreak") {
      const info: SectionInfo = {
        id: String(node.attrs?.id ?? ""),
        title: String(node.attrs?.title || "Sección " + (result.length + 1)),
        kind: (node.attrs?.kind ?? "nextPage") as SectionKind,
        layout: node.attrs?.layout as PageLayout,
        linkToPrevious: node.attrs?.linkToPrevious !== false,
        restartNumbering: node.attrs?.restartNumbering === true,
      };
      info.layout = inheritedSectionLayout(result.at(-1)!.layout, info);
      result.push(info);
    }
  return result;
}
export function selectedSection(
  editor: Editor | null,
  initial: PageLayout,
): SectionInfo {
  let result: SectionInfo = {
    id: "",
    title: "Sección 1",
    kind: "nextPage",
    layout: initial,
    linkToPrevious: false,
    restartNumbering: false,
  };
  editor?.state.doc.forEach((node, pos) => {
    if (
      node.type.name === "sectionBreak" &&
      pos <= editor.state.selection.from
    ) {
      const section: SectionInfo = {
        id: String(node.attrs.id),
        title: String(node.attrs.title || "Sección"),
        kind: node.attrs.kind,
        layout: node.attrs.layout,
        linkToPrevious: node.attrs.linkToPrevious !== false,
        restartNumbering: node.attrs.restartNumbering === true,
        position: pos,
      };
      section.layout = inheritedSectionLayout(result.layout, section);
      result = section;
    }
  });
  return result;
}
export function changeSection(
  content: RichNode,
  id: string,
  attrs: Record<string, unknown>,
): RichNode {
  return {
    ...content,
    content: content.content?.map((node) =>
      node.type === "sectionBreak" && node.attrs?.id === id
        ? { ...node, attrs: { ...node.attrs, ...attrs } }
        : node,
    ),
  };
}
