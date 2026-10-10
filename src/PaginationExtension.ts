import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import { mm, pageSize, type PageLayout } from "./flow";
import { planPages, type PageGap, type PageUnit } from "./pagination";
const key = new PluginKey<DecorationSet>("prismaPagination");
export const Pagination = Extension.create<{
  layout?: PageLayout;
  onPages?: (count: number) => void;
}>({
  name: "pagination",
  addOptions: () => ({}),
  addStorage() {
    return { ...this.options };
  },
  addProseMirrorPlugins() {
    const settings = this.storage;
    return [
      new Plugin({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, previous) {
            const plan = tr.getMeta(key) as PageGap[] | undefined;
            return plan
              ? DecorationSet.create(
                  tr.doc,
                  plan.map((item) =>
                    Decoration.widget(
                      item.pos,
                      () => {
                        const dom = document.createElement(
                          item.kind === "table" ? "tr" : "span",
                        );
                        dom.className = "editor-page-gap";
                        dom.contentEditable = "false";
                        dom.setAttribute("aria-hidden", "true");
                        if (item.kind === "table") {
                          const cell = document.createElement("td");
                          cell.colSpan = 100;
                          cell.style.height = item.height + "px";
                          dom.append(cell);
                        } else dom.style.height = item.height + "px";
                        return dom;
                      },
                      {
                        side: -1,
                        key: `${item.pos}:${item.height.toFixed(2)}`,
                        ignoreSelection: true,
                      },
                    ),
                  ),
                )
              : previous.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return key.getState(state);
          },
        },
        view(view) {
          let timer: ReturnType<typeof setTimeout>,
            running = false,
            destroyed = false,
            previousLayout = settings.layout;
          function measure(view: EditorView) {
            if (
              destroyed ||
              running ||
              !settings.layout ||
              !view.dom.isConnected
            )
              return;
            if (view.composing) {
              schedule();
              return;
            }
            running = true;
            try {
              view.dispatch(
                view.state.tr.setMeta(key, []).setMeta("addToHistory", false),
              );
              const editorRect = view.dom.getBoundingClientRect(),
                scale =
                  editorRect.width / (view.dom.offsetWidth || editorRect.width),
                units: PageUnit[] = [];
              const topOf = (rect: DOMRect) =>
                (rect.top - editorRect.top) / scale;
              view.state.doc.forEach((node, pos) => {
                const dom = view.nodeDOM(pos) as HTMLElement | null;
                if (!dom?.getBoundingClientRect) return;
                const rect = dom.getBoundingClientRect();
                if (pos > 0 && node.attrs.breakBefore)
                  units.push({
                    pos,
                    top: topOf(rect),
                    bottom: topOf(rect),
                    force: 1,
                  });
                if (
                  node.type.name === "pageBreak" ||
                  (node.type.name === "sectionBreak" &&
                    node.attrs.kind !== "continuous")
                ) {
                  units.push({
                    pos: pos + node.nodeSize,
                    top: topOf(rect) + rect.height / scale,
                    bottom: topOf(rect) + rect.height / scale,
                    force: 1,
                  });
                  return;
                }
                if (node.type.name === "table") {
                  const rows = dom.querySelectorAll("tr");
                  node.forEach((row, offset, i) => {
                    const box = rows[i]?.getBoundingClientRect();
                    if (box)
                      units.push({
                        pos: pos + 1 + offset,
                        top: topOf(box),
                        bottom: topOf(box) + box.height / scale,
                        kind: "table",
                      });
                  });
                  return;
                }
                if (
                  node.isTextblock ||
                  node.type.name === "blockquote" ||
                  node.type.name === "bulletList" ||
                  node.type.name === "orderedList"
                ) {
                  const lines = new Map<number, PageUnit>();
                  const walker = document.createTreeWalker(
                    dom,
                    NodeFilter.SHOW_TEXT,
                  );
                  while (walker.nextNode()) {
                    const text = walker.currentNode as Text;
                    if (
                      text.parentElement?.closest(
                        "[contenteditable=false],.formatting-mark,.academic-note",
                      )
                    )
                      continue;
                    for (const word of text.data.matchAll(/\S+\s*/gu)) {
                      // Long tokens can wrap inside a word; measure their characters as well.
                      const offsets =
                        word[0].length > 40
                          ? Array.from(
                              { length: word[0].length },
                              (_, i) => word.index + i,
                            )
                          : [word.index];
                      for (const offset of offsets) {
                        const range = document.createRange();
                        range.setStart(text, offset);
                        range.setEnd(text, Math.min(text.length, offset + 1));
                        const box = range.getBoundingClientRect();
                        if (!box.height) continue;
                        const y = topOf(box),
                          line = Math.round(y * 2) / 2,
                          from = view.posAtDOM(text, offset);
                        const previous = lines.get(line);
                        if (!previous || from < previous.pos)
                          lines.set(line, {
                            pos: from,
                            top: y,
                            bottom: y + box.height / scale,
                          });
                      }
                    }
                  }
                  if (!lines.size)
                    units.push({
                      pos,
                      top: topOf(rect),
                      bottom: topOf(rect) + rect.height / scale,
                    });
                  else
                    units.push(
                      ...[...lines.values()].sort((a, b) => a.top - b.top),
                    );
                } else
                  units.push({
                    pos,
                    top: topOf(rect),
                    bottom: topOf(rect) + rect.height / scale,
                  });
              });
              const layout = settings.layout as PageLayout,
                ph = (pageSize(layout)[1] * 4) / 3;
              const plan = planPages(
                units,
                ph,
                (mm(layout.top) * 4) / 3,
                (mm(layout.bottom) * 4) / 3,
              );
              view.dispatch(
                view.state.tr
                  .setMeta(key, plan.breaks)
                  .setMeta("addToHistory", false),
              );
              settings.onPages?.(plan.count);
            } finally {
              running = false;
            }
          }
          function schedule() {
            clearTimeout(timer);
            timer = setTimeout(() => measure(view), 120);
          }
          const resize = new ResizeObserver(schedule);
          resize.observe(view.dom);
          // Font loads can change line wraps without a document transaction.
          document.fonts?.addEventListener("loadingdone", schedule);
          schedule();
          return {
            update(next, old) {
              const changed = previousLayout !== settings.layout;
              previousLayout = settings.layout;
              if (!running && (next.state.doc !== old.doc || changed))
                schedule();
            },
            destroy() {
              destroyed = true;
              clearTimeout(timer);
              resize.disconnect();
              document.fonts?.removeEventListener("loadingdone", schedule);
            },
          };
        },
      }),
    ];
  },
});
