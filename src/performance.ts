// Bound decoded bitmap memory, including unusual page sizes and high zoom.
export function canvasRatio(
  width: number,
  height: number,
  dpr: number,
  maxPixels: number,
) {
  if (
    ![width, height, dpr, maxPixels].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    maxPixels <= 0
  )
    return 1;
  return Math.min(Math.max(1, dpr), 2, Math.sqrt(maxPixels / (width * height)));
}
