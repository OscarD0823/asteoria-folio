/** Shared web resources stay on the same origin. Native packages are complete. */
export function resourceBase(base: string, marker?: string | null) {
  return marker === '../' ? new URL('../', base).href : base;
}
export function applicationResourceBase() {
  if (typeof document === 'undefined') return globalThis.location?.href;
  return resourceBase(document.baseURI, document.querySelector?.('meta[name="prisma-resource-base"]')?.getAttribute('content'));
}
