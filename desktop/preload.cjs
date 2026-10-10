const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("prismaDesktop", {
  print: (payload) => ipcRenderer.invoke("prisma-print", payload),
});
