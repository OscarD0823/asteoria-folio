export type PageUnit = {
  pos: number;
  top: number;
  bottom: number;
  kind?: "table";
  force?: number;
};
export type PageGap = { pos: number; height: number; kind?: "table" };
export function planPages(
  units: PageUnit[],
  height: number,
  top: number,
  bottom: number,
  gap = 28,
) {
  const breaks: PageGap[] = [];
  let added = 0,
    page = 0;
  const stride = height + gap;
  for (const unit of units) {
    const y = unit.top + added,
      end = page * stride + height - top - bottom;
    if (
      unit.force ||
      (unit.bottom + added > end + 0.5 && y > page * stride + 0.5)
    ) {
      const next = page + Math.max(1, unit.force || 1);
      const space = next * stride - y;
      if (space > 0) {
        breaks.push({ pos: unit.pos, height: space, kind: unit.kind });
        added += space;
        page = next;
      }
    }
    // Oversized objects remain intact; the print preview is the authoritative layout.
    page = Math.max(page, Math.floor((unit.bottom + added + top) / stride));
  }
  return { breaks, count: Math.max(1, page + 1) };
}
