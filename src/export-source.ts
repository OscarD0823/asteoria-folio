import { buildPdf, uid, type Workspace } from "./pdf";
import { runNative, type Inspection } from "./native";
import { defaultLayout, type FlowDocument, type RichNode } from "./flow";
/** Convert the final edited PDF, so replaced text is not duplicated by old sources. */
export async function documentForExport(
  workspace: Workspace,
): Promise<FlowDocument> {
  if (workspace.flow) return { ...workspace.flow, fonts: workspace.fonts };
  const bytes = await buildPdf(workspace),
    content: RichNode[] = [];
  for (const [index] of workspace.pages.entries()) {
    const info = (await runNative({
      action: "inspect",
      bytes,
      index,
    })) as Inspection;
    for (const object of info.objects) {
      if (object.kind === "text" && object.text)
        content.push({
          type: "paragraph",
          attrs: { id: uid() },
          content: [
            {
              type: "text",
              text: object.text,
              marks: [
                ...(object.bold ? [{ type: "bold" }] : []),
                ...(object.italic ? [{ type: "italic" }] : []),
                {
                  type: "textStyle",
                  attrs: {
                    fontFamily:
                      object.font === "Times-Roman"
                        ? "PrismaSerif"
                        : object.font === "Courier"
                          ? "PrismaMono"
                          : "PrismaSans",
                    fontSize: object.size + "pt",
                    color: object.color,
                  },
                },
              ],
            },
          ],
        });
      else if (object.kind === "image" && object.data)
        content.push({
          type: "image",
          attrs: { id: uid(), src: object.data, width: object.width / 0.75 },
        });
    }
    if (index < workspace.pages.length - 1) content.push({ type: "pageBreak" });
  }
  return {
    content: { type: "doc", content },
    layout: workspace.layout ?? defaultLayout(),
    fonts: workspace.fonts,
  };
}
