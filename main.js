const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

const {
  listPorts,
  connect,
  disconnect,
  requestWeight,
  getConnectionState
} = require("./balanza");

const {
  loadSettings,
  saveSettings
} = require("./storage");

const { appendSale, readSales } = require("./sales");

let mainWindow = null;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "Acerca de Balanza POS" },
              { type: "separator" },
              { role: "hide", label: "Ocultar" },
              { role: "hideOthers", label: "Ocultar otros" },
              { role: "unhide", label: "Mostrar todo" },
              { type: "separator" },
              { role: "quit", label: "Salir" }
            ]
          }
        ]
      : []),
    {
      label: "Archivo",
      submenu: [
        {
          label: "Historial de ventas",
          accelerator: "CmdOrCtrl+H",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("menu:history");
            }
          }
        },
        { type: "separator" },
        isMac
          ? { role: "close", label: "Cerrar ventana" }
          : { role: "quit", label: "Salir" }
      ]
    },
    {
      label: "Edición",
      submenu: [
        { role: "undo", label: "Deshacer" },
        { role: "redo", label: "Rehacer" },
        { type: "separator" },
        { role: "cut", label: "Cortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Pegar" },
        ...(isMac
          ? [
              {
                role: "pasteAndMatchStyle",
                label: "Pegar con el mismo estilo"
              },
              { role: "delete", label: "Eliminar" },
              { role: "selectAll", label: "Seleccionar todo" }
            ]
          : [
              { role: "delete", label: "Eliminar" },
              { type: "separator" },
              { role: "selectAll", label: "Seleccionar todo" }
            ])
      ]
    },
    {
      label: "Ver",
      submenu: [
        { role: "reload", label: "Recargar" },
        { role: "forceReload", label: "Forzar recarga" },
        {
          role: "toggleDevTools",
          label: "Herramientas de desarrollo"
        },
        { type: "separator" },
        { role: "resetZoom", label: "Tamaño real" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
        { type: "separator" },
        {
          role: "togglefullscreen",
          label: "Pantalla completa"
        }
      ]
    },
    {
      label: "Ventana",
      submenu: [
        { role: "minimize", label: "Minimizar" },
        { role: "zoom", label: "Zoom" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front", label: "Traer todo al frente" }
            ]
          : [{ role: "close", label: "Cerrar" }])
      ]
    },
    {
      label: "Ayuda",
      role: "help",
      submenu: [
        {
          label: "Acerca de Balanza POS",
          click: async () => {
            const { dialog } = require("electron");
            await dialog.showMessageBox({
              type: "info",
              title: "Acerca de",
              message: "Balanza POS",
              detail: `Versión ${app.getVersion()}\nLa Osita Gestiones`
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 760,
    minWidth: 850,
    minHeight: 650,
    backgroundColor: "#f4f6f8",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) {
    return;
  }

  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

app.on("window-all-closed", async () => {
  await disconnect();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

function sendWeight(weight) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("scale:weight", weight);
  }
}

ipcMain.handle("ports:list", async () => {
  try {
    return await listPorts();
  } catch (error) {
    return [];
  }
});

ipcMain.handle("scale:connect", async (_, configuration) => {
  try {
    return await connect(configuration, sendWeight);
  } catch (error) {
    return {
      connected: false,
      path: "",
      error: error?.message || "No se pudo conectar con la balanza."
    };
  }
});

ipcMain.handle("scale:disconnect", async () => {
  try {
    return await disconnect();
  } catch {
    return true;
  }
});

ipcMain.handle("scale:requestWeight", async () => {
  try {
    return await requestWeight();
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "No se pudo solicitar el peso."
    };
  }
});

ipcMain.handle("scale:state", async () => {
  return getConnectionState();
});

ipcMain.handle("settings:get", async () => {
  return loadSettings();
});

ipcMain.handle("settings:save", async (_, settings) => {
  try {
    saveSettings(settings);
    return true;
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "No se pudo guardar la configuración."
    };
  }
});

ipcMain.handle("sale:save", async (_, sale) => {
  try {
    const file = appendSale(sale);
    return { ok: true, file };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "No se pudo registrar la venta."
    };
  }
});

ipcMain.handle("sales:list", async () => {
  try {
    return { ok: true, ...readSales() };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      count: 0,
      totalSum: 0,
      error: error?.message || "No se pudo leer el historial."
    };
  }
});