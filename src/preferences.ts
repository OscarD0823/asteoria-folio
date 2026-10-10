import { product } from "./product";
export function readPreference<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${product.id}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(`${product.id}:${key}`, JSON.stringify(value));
  } catch {
    /* Preferences are optional; documents use IndexedDB. */
  }
}
