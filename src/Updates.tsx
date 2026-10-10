import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { RefreshCw, X, Download } from "lucide-react";
import appPackage from "../package.json";
import {
  checkRelease,
  newerVersion,
  releaseBase,
  type ReleaseInfo,
} from "./update-core";
const nativeLinks = registerPlugin<{
  openRelease: (options: { url: string }) => Promise<void>;
}>("PrismaUpdates");
const readAutomatic = () => {
  try {
    return localStorage.getItem("prisma-auto-update") !== "off";
  } catch {
    return true;
  }
};
export function Updates({
  beforeReload,
  onError,
}: {
  beforeReload: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [open, setOpen] = useState(false),
    [automatic, setAutomatic] = useState(readAutomatic),
    [release, setRelease] = useState<ReleaseInfo | null>(null),
    [status, setStatus] = useState(""),
    [checking, setChecking] = useState(false),
    [ready, setReady] = useState(false),
    [updating, setUpdating] = useState(false);
  const checkingRef = useRef(false),
    restart = useRef(false),
    save = useRef(beforeReload),
    trigger = useRef<HTMLButtonElement>(null),
    dialog = useRef<HTMLElement>(null);
  save.current = beforeReload;
  const check = async (manual = false) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    if (manual) setStatus("Comprobando versión…");
    try {
      const r = await checkRelease();
      setRelease(r);
      if (manual)
        setStatus(
          newerVersion(r.version, appPackage.version)
            ? "Hay una versión nueva."
            : "Tienes la versión más reciente.",
        );
      try {
        localStorage.setItem("prisma-update-checked", String(Date.now()));
      } catch {}
      if (
        "serviceWorker" in navigator &&
        !Capacitor.isNativePlatform() &&
        location.protocol !== "prisma:"
      ) {
        const registration = await navigator.serviceWorker.getRegistration();
        void registration?.update().catch(() => {});
      }
    } catch (error) {
      if (manual)
        setStatus(
          error instanceof Error
            ? error.message
            : "Sin conexión para comprobar versiones.",
        );
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  };
  useEffect(() => {
    if (!automatic) return;
    const maybe = () => {
      let last = 0;
      try {
        last = Number(localStorage.getItem("prisma-update-checked")) || 0;
      } catch {}
      if (Date.now() - last > 24 * 60 * 60 * 1000) void check();
    };
    maybe();
    window.addEventListener("focus", maybe);
    const interval = setInterval(maybe, 6 * 60 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", maybe);
      clearInterval(interval);
    };
  }, [automatic]);
  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      Capacitor.isNativePlatform() ||
      location.protocol === "prisma:"
    )
      return;
    let hadController = !!navigator.serviceWorker.controller;
    const changed = () => {
      if (!hadController && !restart.current) {
        hadController = true;
        return;
      }
      setReady(true);
      if (restart.current)
        void save
          .current()
          .then(() => location.reload())
          .catch((error) => {
            setUpdating(false);
            onError(error);
          });
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
  }, []);
  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open]);
  const native =
      Capacitor.isNativePlatform() || location.protocol === "prisma:",
    newer = release && newerVersion(release.version, appPackage.version);
  const install = async () => {
    try {
      if (native && release) {
        const url = Capacitor.isNativePlatform()
          ? release.androidUrl
          : release.windowsUrl;
        if (Capacitor.isNativePlatform())
          await nativeLinks.openRelease({ url });
        else window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      await save.current();
      if (ready) {
        location.reload();
        return;
      }
      restart.current = true;
      setUpdating(true);
      setStatus(
        "Descargando los archivos de la nueva versión. Tu proyecto está guardado.",
      );
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        location.reload();
        return;
      }
      await registration.update();
      if (!registration.installing && !registration.waiting) {
        await save.current();
        location.reload();
      } else {
        const worker = registration.installing ?? registration.waiting;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "redundant") {
            restart.current = false;
            setUpdating(false);
            setStatus(
              "La descarga no terminó. Comprueba tu conexión y vuelve a intentarlo.",
            );
          }
        });
      }
    } catch (error) {
      restart.current = false;
      setUpdating(false);
      onError(error);
    }
  };
  return (
    <>
      <button
        ref={trigger}
        className={"update-button" + (newer || ready ? " available" : "")}
        title="Actualizaciones"
        onClick={() => {
          setOpen(true);
          void check(true);
        }}
      >
        <RefreshCw size={16} />
        <span>
          {newer || ready ? "Actualización disponible" : "Actualizar"}
        </span>
      </button>
      {open &&
        createPortal(
          <div className="modal-shade update-modal-shade">
            <section
              ref={dialog}
              className="modal update-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="update-title"
              onKeyDown={(e) => {
                if (e.key !== "Tab") return;
                const items = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled),input,a[href]",
                  ),
                );
                const first = items[0],
                  last = items.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }}
            >
              <header>
                <div>
                  <small>PRISMA PDF · {appPackage.version}</small>
                  <h2 id="update-title">Tu aplicación al día</h2>
                </div>
                <button
                  aria-label="Cerrar actualizaciones"
                  onClick={() => setOpen(false)}
                >
                  <X size={20} />
                </button>
              </header>
              <p>
                {status ||
                  "Puedes comprobar las nuevas versiones sin enviar tus documentos."}
              </p>
              {newer && (
                <div className="release-news">
                  <strong>Versión {release.version}</strong>
                  <ul>
                    {release.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={automatic}
                  onChange={(e) => {
                    setAutomatic(e.target.checked);
                    try {
                      localStorage.setItem(
                        "prisma-auto-update",
                        e.target.checked ? "on" : "off",
                      );
                    } catch {}
                  }}
                />
                Comprobar nuevas versiones automáticamente
              </label>
              <p className="update-privacy">
                Solo se consulta el número de versión en GitHub Pages. Tus PDF,
                proyectos y fuentes personales permanecen en este dispositivo.
              </p>
              {native && (
                <p>
                  La actualización se descarga desde GitHub. Instala el nuevo
                  APK o instalador de Windows sobre la aplicación existente. El
                  sistema solicita la autorización de instalación y conserva tus
                  proyectos locales.
                </p>
              )}
              <footer>
                <button
                  disabled={checking || updating}
                  onClick={() => void check(true)}
                >
                  {checking ? "Comprobando…" : "Comprobar ahora"}
                </button>
                {(newer || (!native && ready)) && (
                  <button
                    className="primary"
                    disabled={updating}
                    onClick={() => void install()}
                  >
                    <Download size={16} />
                    {native
                      ? "Descargar actualización"
                      : updating
                        ? "Preparando…"
                        : "Guardar y actualizar"}
                  </button>
                )}
                <a
                  href={release?.releaseUrl ?? releaseBase + "latest"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver versiones
                </a>
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
