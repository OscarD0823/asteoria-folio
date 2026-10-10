import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { product } from "./product";
import { Download, Smartphone, X, Check } from "lucide-react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [open, setOpen] = useState(false),
    [offline, setOffline] = useState(false),
    [installed, setInstalled] = useState(
      () => matchMedia("(display-mode: standalone)").matches,
    );
  useEffect(() => {
    const install = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const prepared = () => setOffline(true);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", done);
    window.addEventListener("prisma-offline-ready", prepared);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.ready.then(prepared);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("prisma-offline-ready", prepared);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  if (Capacitor.isNativePlatform() || location.protocol === "prisma:")
    return null;
  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
    } else setOpen(true);
  }
  return (
    <>
      <button
        className="install-button"
        type="button"
        onClick={() => void install()}
        title={installed ? "Aplicación instalada" : "Instalar en celular o PC"}
      >
        <Download size={16} />
        <span>{installed ? "Aplicación instalada" : "Instalar app"}</span>
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal install-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
          >
            <div className="modal-heading">
              <span className="eyebrow">LLEVA TU ESPACIO CONTIGO</span>
              <button
                aria-label="Cerrar instalación"
                onClick={() => setOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <Smartphone className="install-icon" size={38} />
            <h2 id="install-title">Prisma, a tu lado.</h2>
            <p>Instala la misma aplicación en tu celular y en tu computador.</p>
            <ol>
              <li>
                <b>Android</b>
                <span>
                  Abre esta página en Chrome. En el menú, elige «Instalar
                  aplicación» o «Añadir a pantalla de inicio».
                </span>
              </li>
              <li>
                <b>Windows y PC</b>
                <span>
                  Abre la página en Chrome o Edge y pulsa el icono de
                  instalación de la barra de direcciones.
                </span>
              </li>
              <li>
                <b>iPhone y iPad</b>
                <span>
                  Abre la página en Safari. Pulsa Compartir y «Añadir a pantalla
                  de inicio».
                </span>
              </li>
            </ol>
            <div className="offline-state">
              <Check size={16} />
              {offline
                ? "Aplicación preparada para trabajar sin conexión."
                : "La primera apertura descarga los recursos de la aplicación."}
            </div>
            <p className="help-limits">
              Los documentos quedan en este dispositivo. Las versiones APK y EXE
              incluyen el editor para trabajar sin conexión desde el primer
              inicio.
            </p>
            <div className="help-links">
              <a
                href={
                  product.writer
                    ? "https://github.com/OscarD0823/prisma-pdf/releases/tag/writer-v1.0.0"
                    : "https://github.com/OscarD0823/prisma-pdf/releases/latest"
                }
                target="_blank"
                rel="noreferrer"
              >
                Descargar APK y EXE
              </a>
              <a
                href="https://github.com/OscarD0823/prisma-pdf"
                target="_blank"
                rel="noreferrer"
              >
                Repositorio público
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
