"use strict";

const $ = (id) => document.getElementById(id);

const elements = {
  connectionStatus: $("connectionStatus"),
  connectionText: $("connectionText"),
  weightDisplay: $("weightDisplay"),
  pricePerKilo: $("pricePerKilo"),
  totalDisplay: $("totalDisplay"),
  paymentButtons: document.querySelectorAll("[data-payment]"),
  cashPanel: $("cashPanel"),
  cashReceived: $("cashReceived"),
  cashTotal: $("cashTotal"),
  changeDisplay: $("changeDisplay"),
  message: $("message"),
  newSaleButton: $("newSaleButton"),
  payButton: $("payButton"),
  historyButton: $("historyButton"),
  settingsButton: $("settingsButton"),
  historyModal: $("historyModal"),
  closeHistory: $("closeHistory"),
  closeHistoryBottom: $("closeHistoryBottom"),
  historyBody: $("historyBody"),
  historySummary: $("historySummary"),
  historyEmpty: $("historyEmpty"),
  historyDate: $("historyDate"),
  historyClearFilter: $("historyClearFilter"),
  printHistory: $("printHistory"),
  settingsModal: $("settingsModal"),
  closeSettings: $("closeSettings"),
  cancelSettings: $("cancelSettings"),
  saveSettings: $("saveSettings"),
  disconnectButton: $("disconnectButton"),
  settingsError: $("settingsError"),
  port: $("port"),
  refreshPorts: $("refreshPorts"),
  baudRate: $("baudRate"),
  dataBits: $("dataBits"),
  stopBits: $("stopBits"),
  parity: $("parity"),
  flowControl: $("flowControl"),
  mode: $("mode"),
  unit: $("unit"),
  decimalSeparator: $("decimalSeparator"),
  command: $("command"),
  commandHex: $("commandHex"),
  lineEnding: $("lineEnding"),
  customRegex: $("customRegex"),
  stableOnly: $("stableOnly")
};

const state = {
  weightGrams: 0,
  total: 0,
  paymentMethod: null,
  connected: false
};

let messageTimer = null;
let historyData = { rows: [], count: 0, totalSum: 0 };

function money(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Math.round(Number(value) || 0));
}

function formatGrams(value) {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 3
  }).format(Number(value) || 0);
}

function showMessage(text, type = "") {
  if (!elements.message) return;

  elements.message.textContent = text;
  elements.message.className = `message ${type}`.trim();

  clearTimeout(messageTimer);

  messageTimer = setTimeout(() => {
    elements.message.classList.add("hidden");
  }, 5000);
}

function showSettingsError(text) {
  if (!elements.settingsError) return;

  if (!text) {
    elements.settingsError.classList.add("hidden");
    elements.settingsError.textContent = "";
    return;
  }

  elements.settingsError.textContent = text;
  elements.settingsError.classList.remove("hidden");
}

function calculateTotal() {
  const price = Number(elements.pricePerKilo?.value) || 0;

  state.total = Math.round(
    (price / 1000) * state.weightGrams
  );

  if (elements.totalDisplay) {
    elements.totalDisplay.textContent = money(state.total);
  }

  updateCash();
}

function updateWeight(grams) {
  if (grams === null || grams === undefined) {
    updateConnection(false);
    return;
  }

  const numeric = Number(grams);

  if (!Number.isFinite(numeric)) return;

  state.weightGrams = Math.max(0, numeric);

  if (elements.weightDisplay) {
    elements.weightDisplay.textContent = formatGrams(
      state.weightGrams
    );
  }

  calculateTotal();
}

function updateConnection(connected, port = "") {
  state.connected = connected;

  if (!elements.connectionStatus) return;

  elements.connectionStatus.classList.toggle(
    "connected",
    connected
  );
  elements.connectionStatus.classList.toggle(
    "disconnected",
    !connected
  );

  const label = connected
    ? `Conectada${port ? ` · ${port}` : ""}`
    : "Desconectada";

  if (elements.connectionText) {
    elements.connectionText.textContent = label;
  } else {
    elements.connectionStatus.textContent = label;
  }
}

function selectPayment(method) {
  state.paymentMethod = method;

  elements.paymentButtons.forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.payment === method
    );
  });

  if (elements.cashPanel) {
    elements.cashPanel.classList.toggle(
      "hidden",
      method !== "efectivo"
    );
  }

  if (method !== "efectivo" && elements.cashReceived) {
    elements.cashReceived.value = "";
  }

  updateCash();

  if (method === "efectivo") {
    elements.cashReceived?.focus();
  }
}

function updateCash() {
  if (elements.cashTotal) {
    elements.cashTotal.textContent = money(state.total);
  }

  if (state.paymentMethod !== "efectivo") {
    if (elements.changeDisplay) {
      elements.changeDisplay.textContent = money(0);
    }
    return;
  }

  const received =
    Number(elements.cashReceived?.value) || 0;
  const change = received - state.total;

  if (elements.changeDisplay) {
    elements.changeDisplay.textContent = money(
      change > 0 ? change : 0
    );
  }
}

async function pay() {
  if (state.total <= 0) {
    showMessage(
      "No hay un monto para cobrar.",
      "error"
    );
    return;
  }

  if (!state.paymentMethod) {
    showMessage(
      "Seleccione un medio de pago.",
      "error"
    );
    return;
  }

  const cashReceived =
    Number(elements.cashReceived?.value) || 0;

  if (
    state.paymentMethod === "efectivo" &&
    cashReceived < state.total
  ) {
    showMessage(
      `Efectivo insuficiente. Faltan ${money(
        state.total - cashReceived
      )}.`,
      "error"
    );
    return;
  }

  const sale = {
    date: new Date().toISOString(),
    weightGrams: state.weightGrams,
    pricePerKg:
      Number(elements.pricePerKilo?.value) || 0,
    total: state.total,
    paymentMethod: state.paymentMethod,
    cashReceived
  };

  try {
    const result =
      await window.balanzaAPI?.saveSale(sale);

    if (result?.ok === false) {
      throw new Error(
        result.error || "No se pudo registrar la venta."
      );
    }

    resetSale();
    showMessage(
      "Venta registrada correctamente.",
      "success"
    );
  } catch (error) {
    showMessage(
      error?.message || "No se pudo registrar la venta.",
      "error"
    );
  }
}

function resetSale() {
  state.total = 0;
  state.weightGrams = 0;
  state.paymentMethod = null;

  if (elements.weightDisplay) {
    elements.weightDisplay.textContent = formatGrams(0);
  }

  if (elements.pricePerKilo) {
    elements.pricePerKilo.value = "";
  }

  if (elements.cashReceived) {
    elements.cashReceived.value = "";
  }

  if (elements.totalDisplay) {
    elements.totalDisplay.textContent = money(0);
  }

  if (elements.changeDisplay) {
    elements.changeDisplay.textContent = money(0);
  }

  selectPayment(null);
  elements.pricePerKilo?.focus();
}

function getScaleConfiguration() {
  return {
    port: elements.port?.value || "",
    baudRate: Number(elements.baudRate?.value) || 9600,
    dataBits: Number(elements.dataBits?.value) || 8,
    stopBits: Number(elements.stopBits?.value) || 1,
    parity: elements.parity?.value || "none",
    flowControl: elements.flowControl?.value || "none",
    mode: elements.mode?.value || "continuous",
    command: elements.command?.value || "P",
    commandHex: elements.commandHex?.value === "true",
    lineEnding: elements.lineEnding?.value || "auto",
    unit: elements.unit?.value || "g",
    decimalSeparator:
      elements.decimalSeparator?.value || ".",
    stableOnly: Boolean(elements.stableOnly?.checked),
    stableCharacters: ["ST"],
    customRegex: elements.customRegex?.value || ""
  };
}

function applySettings(settings) {
  const scale = settings?.scale || {};

  if (elements.baudRate && scale.baudRate) {
    elements.baudRate.value = scale.baudRate;
  }

  if (elements.dataBits && scale.dataBits) {
    elements.dataBits.value = scale.dataBits;
  }

  if (elements.stopBits && scale.stopBits) {
    elements.stopBits.value = scale.stopBits;
  }

  if (elements.parity && scale.parity) {
    elements.parity.value = scale.parity;
  }

  if (elements.flowControl && scale.flowControl) {
    elements.flowControl.value = scale.flowControl;
  }

  if (elements.mode && scale.mode) {
    elements.mode.value = scale.mode;
  }

  if (elements.unit && scale.unit) {
    elements.unit.value = scale.unit;
  }

  if (
    elements.decimalSeparator &&
    scale.decimalSeparator
  ) {
    elements.decimalSeparator.value =
      scale.decimalSeparator;
  }

  if (elements.command) {
    elements.command.value = scale.command ?? "P";
  }

  if (elements.commandHex) {
    elements.commandHex.value = scale.commandHex
      ? "true"
      : "false";
  }

  if (elements.lineEnding && scale.lineEnding) {
    elements.lineEnding.value = scale.lineEnding;
  }

  if (elements.customRegex) {
    elements.customRegex.value = scale.customRegex || "";
  }

  if (elements.stableOnly) {
    elements.stableOnly.checked = Boolean(
      scale.stableOnly
    );
  }

  return scale.port || "";
}

async function refreshPorts(preferredPort = "") {
  if (!window.balanzaAPI?.listPorts) return;

  try {
    const ports = await window.balanzaAPI.listPorts();

    if (!elements.port) return;

    elements.port.innerHTML = "";

    if (!Array.isArray(ports) || ports.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay puertos disponibles";
      elements.port.appendChild(option);
      return;
    }

    for (const item of ports) {
      const option = document.createElement("option");
      option.value = item.path;
      option.textContent = item.manufacturer
        ? `${item.path} · ${item.manufacturer}`
        : item.path;
      elements.port.appendChild(option);
    }

    if (
      preferredPort &&
      ports.some((item) => item.path === preferredPort)
    ) {
      elements.port.value = preferredPort;
    }
  } catch (error) {
    console.error("Error obteniendo puertos:", error);
  }
}

async function connectScale() {
  if (!window.balanzaAPI?.connect) return;

  const config = getScaleConfiguration();

  if (!config.port) {
    showSettingsError(
      "Seleccione un puerto de la balanza."
    );
    return;
  }

  showSettingsError("");

  try {
    const result = await window.balanzaAPI.connect(
      config
    );

    if (result?.error || result?.connected === false) {
      throw new Error(
        result.error ||
          "No se pudo conectar con la balanza."
      );
    }

    updateConnection(true, result?.path || config.port);
    closeSettingsModal();
    showMessage("Balanza conectada.", "success");
  } catch (error) {
    updateConnection(false);
    showSettingsError(
      error?.message ||
        "No se pudo conectar con la balanza."
    );
  }
}

async function disconnectScale() {
  try {
    await window.balanzaAPI?.disconnect();
  } catch (error) {
    console.error("Error al desconectar:", error);
  }

  updateConnection(false);
  showMessage("Balanza desconectada.", "success");
}

async function saveSettingsAndConnect() {
  const config = getScaleConfiguration();

  if (!config.port) {
    showSettingsError(
      "Seleccione un puerto de la balanza."
    );
    return;
  }

  try {
    await window.balanzaAPI?.saveSettings({
      scale: config
    });
  } catch (error) {
    console.error("Error guardando ajustes:", error);
  }

  await connectScale();
}

function getFilteredHistoryRows() {
  const rows = Array.isArray(historyData?.rows)
    ? historyData.rows
    : [];

  const selected = elements.historyDate?.value;

  if (!selected) {
    return rows;
  }

  const [year, month, day] = selected.split("-");

  return rows.filter((row) => {
    const match = String(row.fecha || "").match(
      /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/
    );

    if (!match) return false;

    return (
      Number(match[1]) === Number(day) &&
      Number(match[2]) === Number(month) &&
      Number(match[3]) === Number(year)
    );
  });
}

function renderHistory() {
  if (!elements.historyBody) return;

  elements.historyBody.innerHTML = "";

  const rows = getFilteredHistoryRows();
  const filteredSum = rows.reduce(
    (sum, row) => sum + (parseInt(row.total, 10) || 0),
    0
  );

  if (elements.historyEmpty) {
    elements.historyEmpty.classList.toggle(
      "hidden",
      rows.length > 0
    );
  }

  if (elements.historySummary) {
    elements.historySummary.innerHTML = "";

    const count = document.createElement("span");
    count.innerHTML = `<strong>${
      rows.length
    }</strong> ventas${
      elements.historyDate?.value ? " en el día" : " registradas"
    }`;

    const sum = document.createElement("span");
    sum.innerHTML = `Total vendido: <strong>${money(
      filteredSum
    )}</strong>`;

    elements.historySummary.appendChild(count);
    elements.historySummary.appendChild(sum);
  }

  const columns = [
    "fecha",
    "hora",
    "peso_g",
    "precio_kg",
    "total",
    "metodo_pago",
    "recibido",
    "vuelto"
  ];

  for (const row of rows) {
    const tr = document.createElement("tr");

    for (const key of columns) {
      const td = document.createElement("td");

      if (key === "peso_g") {
        const grams = Number(
          String(row[key] || "").replace(",", ".")
        );
        td.textContent = Number.isFinite(grams)
          ? String(Math.round(grams))
          : row[key] || "-";
      } else {
        td.textContent = row[key] || "-";
      }

      tr.appendChild(td);
    }

    elements.historyBody.appendChild(tr);
  }
}

async function openHistoryModal() {
  if (elements.historyDate) {
    elements.historyDate.value = "";
  }

  elements.historyModal?.classList.remove("hidden");

  try {
    const data = await window.balanzaAPI?.listSales();

    if (data?.ok === false) {
      throw new Error(
        data.error || "No se pudo leer el historial."
      );
    }

    historyData = data;
    renderHistory();
  } catch (error) {
    historyData = { rows: [], count: 0, totalSum: 0 };
    renderHistory();
    showMessage(
      error?.message || "No se pudo leer el historial.",
      "error"
    );
  }
}

function printHistory() {
  window.print();
}

function closeHistoryModal() {
  elements.historyModal?.classList.add("hidden");
}

function openSettingsModal() {
  showSettingsError("");
  elements.settingsModal?.classList.remove("hidden");
  refreshPorts(elements.port?.value || "");
}

function closeSettingsModal() {
  elements.settingsModal?.classList.add("hidden");
}

function setupEvents() {
  elements.pricePerKilo?.addEventListener(
    "input",
    calculateTotal
  );

  elements.cashReceived?.addEventListener(
    "input",
    updateCash
  );

  elements.paymentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectPayment(
        state.paymentMethod === button.dataset.payment
          ? null
          : button.dataset.payment
      );
    });
  });

  elements.newSaleButton?.addEventListener(
    "click",
    resetSale
  );

  elements.payButton?.addEventListener(
    "click",
    pay
  );

  elements.historyButton?.addEventListener(
    "click",
    openHistoryModal
  );

  elements.closeHistory?.addEventListener(
    "click",
    closeHistoryModal
  );

  elements.closeHistoryBottom?.addEventListener(
    "click",
    closeHistoryModal
  );

  elements.historyModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.historyModal) {
        closeHistoryModal();
      }
    }
  );

  elements.historyDate?.addEventListener(
    "change",
    renderHistory
  );

  elements.historyClearFilter?.addEventListener(
    "click",
    () => {
      if (elements.historyDate) {
        elements.historyDate.value = "";
      }
      renderHistory();
    }
  );

  elements.printHistory?.addEventListener(
    "click",
    printHistory
  );

  elements.settingsButton?.addEventListener(
    "click",
    openSettingsModal
  );

  elements.closeSettings?.addEventListener(
    "click",
    closeSettingsModal
  );

  elements.cancelSettings?.addEventListener(
    "click",
    closeSettingsModal
  );

  elements.settingsModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.settingsModal) {
        closeSettingsModal();
      }
    }
  );

  elements.refreshPorts?.addEventListener(
    "click",
    () => refreshPorts(elements.port?.value || "")
  );

  elements.saveSettings?.addEventListener(
    "click",
    saveSettingsAndConnect
  );

  elements.disconnectButton?.addEventListener(
    "click",
    disconnectScale
  );
}

function setupScaleEvents() {
  if (
    typeof window.balanzaAPI?.onWeight !== "function"
  ) {
    return;
  }

  window.balanzaAPI.onWeight((weight) => {
    updateWeight(weight);
  });

  if (
    typeof window.balanzaAPI?.onOpenHistory === "function"
  ) {
    window.balanzaAPI.onOpenHistory(() => {
      openHistoryModal();
    });
  }
}

async function initialize() {
  setupEvents();
  setupScaleEvents();

  let savedPort = "";

  try {
    const settings =
      await window.balanzaAPI?.getSettings();
    savedPort = applySettings(settings);
  } catch (error) {
    console.error("Error cargando ajustes:", error);
  }

  await refreshPorts(savedPort);

  try {
    const connection =
      await window.balanzaAPI?.getState();

    if (connection?.connected) {
      updateConnection(true, connection.path);
    }
  } catch (error) {
    console.error("Error obteniendo estado:", error);
  }

  selectPayment(null);
  calculateTotal();
  elements.pricePerKilo?.focus();
}

document.addEventListener("DOMContentLoaded", initialize);
