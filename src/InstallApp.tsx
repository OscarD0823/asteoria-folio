import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { distributionProduct as product } from "./product";
import { Download, Smartphone, X, Check, WifiOff } from "lucide-react";
import { canPromptInstall, isInstalled, offlineStatus, promptInstall, subscribeInstall, type OfflineStatus } from "./install-support";

export function InstallApp() {
  const [open, setOpen] = useState(false),
    [available, setAvailable] = useState(canPromptInstall),
    [installed, setInstalled] = useState(isInstalled),
    [status, setStatus] = useState<OfflineStatus | null>(null),
    [error, setError] = useState("");
  const button = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null),
    worker = useRef<ServiceWorker | null>(null), channel = useRef<(() => void) | null>(null);
  useEffect(() => {
    const update = () => { setAvailable(canPromptInstall()); setInstalled(isInstalled()); };
    const unsubscribe = subscribeInstall(update), media = matchMedia("(display-mode: standalone)");
    media.addEventListener("change", update);
    return () => { unsubscribe(); media.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    if (!open || !("serviceWorker" in navigator)) return;
    let live = true;
    const refresh = () => {
      void navigator.serviceWorker.getRegistration(new URL("./", document.baseURI).href).then(registration => {
        if (!live || !registration?.active) return;
        worker.current = registration.active;
        channel.current?.();
        channel.current = offlineStatus(registration.active, false, state => { if (live) setStatus(state); });
      }).catch(() => { if (live) setError("No se pudo consultar la preparación sin conexión."); });
    };
    refresh();
    const interval = window.setInterval(refresh, 4000);
    navigator.serviceWorker.addEventListener("controllerchange", refresh);
    window.addEventListener("prisma-offline-ready", refresh);
    return () => {
      live = false; channel.current?.(); channel.current = null;
      window.clearInterval(interval);
      navigator.serviceWorker.removeEventListener("controllerchange", refresh);
      window.removeEventListener("prisma-offline-ready", refresh);
    };
  }, [open]);
  useEffect(() => { if (open) close.current?.focus(); }, [open]);
  if (Capacitor.isNativePlatform() || location.protocol === "prisma:") return null;
  const dismiss = () => { setOpen(false); button.current?.focus(); };
  async function install() {
    setError("");
    try { await promptInstall(); }
    catch { setError("El navegador no completó la instalación. Puedes usar las instrucciones de abajo."); }
  }
  function prepare() {
    if (!worker.current) return;
    channel.current?.();
    setError("");
    setStatus(state => state ? { ...state, downloading: true, error: "" } : state);
    channel.current = offlineStatus(worker.current, true, setStatus);
  }
  const full = status?.cached === status?.total && !!status?.ready;
  return <>
    <button className="install-button" ref={button} type="button" onClick={() => setOpen(true)} aria-label={installed ? "App y sin conexión" : "Instalar app"} title="Instalación y uso sin conexión">
      <Download size={16} /><span>{installed ? "App y sin conexión" : "Instalar app"}</span>
    </button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) dismiss(); }}>
      <section className="modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"
        onKeyDown={event => {
          if (event.key === "Escape") { event.stopPropagation(); dismiss(); }
          if (event.key !== "Tab") return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]"));
          if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
          else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
        }}>
        <div className="modal-heading"><span className="eyebrow">EN TU CELULAR Y COMPUTADOR</span>
          <button ref={close} aria-label="Cerrar instalación" onClick={dismiss}><X size={20} /></button></div>
        <Smartphone className="install-icon" size={38} />
        <h2 id="install-title">Instala {product.name}</h2>
        <p>{product.kind==='prisma'?'Prisma reúne los seis editores en una aplicación. También puedes instalar cada editor por separado.':'Ábrelo desde su propio icono. Cada aplicación de Prisma se instala por separado.'}</p>
        {available && !installed && <button className="primary" onClick={() => void install()}><Download size={16} /> Instalar {product.name}</button>}
        {installed && <p className="offline-state"><Check size={16} /> Estás usando la aplicación instalada.</p>}
        <ol>
          <li><b>Android · Chrome o Edge</b><span>Menú del navegador → «Instalar aplicación» o «Añadir a pantalla de inicio».</span></li>
          <li><b>Windows y Linux · Chrome o Edge</b><span>Icono de instalación en la barra de direcciones, o menú → «Instalar {product.name}».</span></li>
          <li><b>iPhone y iPad · Safari</b><span>Compartir → «Añadir a pantalla de inicio». Activa «Abrir como app» si aparece.</span></li>
          <li><b>Mac · Safari</b><span>En Safari compatible: Archivo → «Añadir al Dock». En Chrome, usa el icono de instalación.</span></li>
        </ol>
        <div className="install-offline-card">
          <h3><WifiOff size={17} /> Uso sin conexión</h3>
          <p role="status">{status?.ready ? full ? "Editor y biblioteca completa preparados." : "Editor y fuentes esenciales preparados. Las demás fuentes se guardan al utilizarlas." : "Preparando los recursos del editor. Mantén esta página abierta y con conexión."}</p>
          {status && <>
            <progress aria-label="Recursos disponibles sin conexión" value={status.cached} max={status.total} />
            <small>{status.cached} / {status.total} recursos · {status.fontsCached} / {status.fontsTotal} archivos de fuentes</small>
            <button disabled={!status.ready || full || status.downloading} onClick={prepare}>
              {status.downloading ? "Descargando biblioteca…" : full ? "Biblioteca completa disponible" : "Descargar todo para usar sin conexión"}
            </button>
          </>}
          {(error || status?.error) && <p role="alert">{error || status?.error}</p>}
          <small>Se descargan recursos de la aplicación. Tus documentos y diccionarios personales permanecen en este dispositivo. Si el navegador borra sus datos, será necesario prepararla de nuevo.</small>
        </div>
        <p className="help-limits">APK y EXE incluyen todos los recursos desde el primer inicio. Guarda también una copia descargada de tus proyectos para conservarla fuera del navegador.</p>
        <div className="help-links">
          <a href={product.repository + "/releases/tag/" + product.tagPrefix + product.version} target="_blank" rel="noreferrer">Descargar APK y EXE</a>
          <a href={product.repository} target="_blank" rel="noreferrer">Repositorio público</a>
        </div>
      </section>
    </div>, document.body)}
  </>;
}
