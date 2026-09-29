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

  listStock: () =>
    ipcRenderer.invoke("stock:list"),

  loadStock: (item) =>
    ipcRenderer.invoke("stock:load", item),

  updateStock: (item) =>
    ipcRenderer.invoke("stock:update", item),

  deleteStock: (product) =>
    ipcRenderer.invoke("stock:delete", product),

  onOpenStock: (callback) => {
    ipcRenderer.on("menu:stock", () => {
      callback();
    });
  },

  onOpenStockStatus: (callback) => {
    ipcRenderer.on("menu:stockStatus", () => {
      callback();
    });
  },

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