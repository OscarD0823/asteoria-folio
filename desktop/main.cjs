const {
  app,
  BrowserWindow,
  protocol,
  net,
  shell,
  session,
  ipcMain,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "prisma",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
    },
  },
]);
let window;
const smoke = process.argv.includes("--smoke-test");
app.whenReady().then(() => {
  const root = path.resolve(__dirname, "../dist");
  protocol.handle("prisma", (request) => {
    const url = new URL(request.url);
    if (url.host !== "app") return new Response("Not found", { status: 404 });
    const relative =
      decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(root + path.sep))
      return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(target).href);
  });
  window = new BrowserWindow({
    show: !smoke,
    width: 1380,
    height: 900,
    minWidth: 760,
    minHeight: 600,
    backgroundColor: "#f7f8fc",
    title: "Prisma PDF",
    icon: path.join(root, "icons/prisma-512.png"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  ipcMain.handle("prisma-print", async (event, payload) => {
    if (
      event.sender !== window.webContents ||
      !event.sender.getURL().startsWith("prisma://app/")
    )
      throw new Error("Origen de impresión no válido.");
    if (
      !payload ||
      !Array.isArray(payload.pages) ||
      !payload.pages.length ||
      payload.pages.length > 2000
    )
      throw new Error("Documento de impresión no válido.");
    let total = 0;
    for (const p of payload.pages) {
      if (
        typeof p.data !== "string" ||
        !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.data) ||
        !Number.isFinite(p.width) ||
        !Number.isFinite(p.height) ||
        p.width <= 0 ||
        p.height <= 0 ||
        p.width > 10000 ||
        p.height > 10000
      )
        throw new Error("Página de impresión no válida.");
      total += p.data.length;
    }
    if (total > 256 * 1024 * 1024)
      throw new Error("Imprime este documento en varios rangos.");
    const title = String(payload.name ?? "Prisma PDF")
        .replace(/[<>&"']/g, "")
        .slice(0, 150),
      first = payload.pages[0];
    const html = `<!doctype html><html><head><title>${title}</title><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>@page{size:${first.width}pt ${first.height}pt;margin:0}html,body{padding:0;margin:0}img{display:block;width:100%;break-after:page}img:last-child{break-after:auto}</style></head><body>${payload.pages.map((p) => `<img src="${p.data}">`).join("")}</body></html>`;
    const printer = new BrowserWindow({
      show: false,
      parent: window,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });
    try {
      await printer.loadURL(
        "data:text/html;charset=utf-8," + encodeURIComponent(html),
      );
      await printer.webContents.executeJavaScript(
        "Promise.all(Array.from(document.images).map(image=>image.decode()))",
      );
      await new Promise((resolve, reject) =>
        printer.webContents.print(
          { silent: false, printBackground: true },
          (success, reason) =>
            success || /cancel/i.test(reason)
              ? resolve()
              : reject(new Error(reason)),
        ),
      );
    } finally {
      printer.destroy();
    }
  });
  if (smoke) {
    window.webContents.on("did-fail-load", (_event, code, description) => {
      console.error("Desktop load failed:", code, description);
      app.exit(1);
    });
    window.webContents.on("console-message", (_event, details) => {
      if (details.level === "error")
        console.error("Renderer:", details.message);
    });
    window.webContents.on("did-finish-load", () => {
      console.log("Desktop application loaded from bundled assets.");
      setTimeout(() => app.exit(0), 3000);
    });
  }
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (
      /^https:\/\/(github\.com|mupdf\.readthedocs\.io|www\.gnu\.org)\//.test(
        url,
      )
    )
      void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("prisma://app/")) event.preventDefault();
  });
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.on("will-download", (_event, item) =>
    item.setSaveDialogOptions({
      title: "Guardar tu documento",
      defaultPath: path.join(app.getPath("documents"), item.getFilename()),
    }),
  );
  window.loadURL("prisma://app/index.html");
});
app.on("window-all-closed", () => app.quit());
