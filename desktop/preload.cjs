const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("prismaDesktop", {
  print: (payload) => ipcRenderer.invoke("prisma-print", payload),
  engines:{capabilities:()=>ipcRenderer.invoke('prisma-engine-capabilities'),run:payload=>ipcRenderer.invoke('prisma-engine-run',payload)},
});
