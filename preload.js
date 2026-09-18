const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("balanzaAPI", {
  listPorts: () => ipcRenderer.invoke("ports:list"),

  connect: (configuration) =>
    ipcRenderer.invoke("scale:connect", configuration),

  disconnect: () =>
    ipcRenderer.invoke("scale:disconnect"),

  requestWeight: () =>
    ipcRenderer.invoke("scale:requestWeight"),

  getState: () =>
    ipcRenderer.invoke("scale:state"),

  getSettings: () =>
    ipcRenderer.invoke("settings:get"),

  saveSettings: (settings) =>
    ipcRenderer.invoke("settings:save", settings),

  saveSale: (sale) =>
    ipcRenderer.invoke("sale:save", sale),

  listSales: () =>
    ipcRenderer.invoke("sales:list"),

  onOpenHistory: (callback) => {
    ipcRenderer.on("menu:history", () => {
      callback();
    });
  },

  onWeight: (callback) => {
    ipcRenderer.on("scale:weight", (_, weight) => {
      callback(weight);
    });
  }
});