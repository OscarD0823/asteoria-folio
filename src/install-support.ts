export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
let pending: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
// Loaded by main.tsx before the editor's lazy chunks. The event can arrive early.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    pending = event as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => { pending = null; notify(); });
}
export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const canPromptInstall = () => !!pending;
export function isInstalled() {
  return matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone;
}
export async function promptInstall() {
  const event = pending;
  if (!event) return null;
  // Every event is single use, including a dismissed dialog or a failed prompt.
  pending = null; notify();
  await event.prompt();
  return (await event.userChoice).outcome;
}
export type OfflineStatus = {
  type: "prisma-offline-status";
  ready: boolean; cached: number; total: number;
  fontsCached: number; fontsTotal: number;
  downloading: boolean; error: string; version: string;
};
export function offlineStatus(
  worker: ServiceWorker,
  all: boolean,
  onStatus: (status: OfflineStatus) => void,
) {
  const channel = new MessageChannel();
  channel.port1.onmessage = event => {
    if (event.data?.type === "prisma-offline-status") onStatus(event.data);
  };
  worker.postMessage({ type: all ? "prisma-cache-all" : "prisma-offline-status" }, [channel.port2]);
  return () => channel.port1.close();
}
