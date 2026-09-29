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
  stableOnly: $("stableOnly"),
  saleProduct: $("saleProduct"),
  stockModal: $("stockModal"),
  closeStock: $("closeStock"),
  cancelStock: $("cancelStock"),
  saveStockButton: $("saveStockButton"),
  stockExistente: $("stockExistente"),
  stockProducto: $("stockProducto"),
  stockMarca: $("stockMarca"),
  stockVariedad: $("stockVariedad"),
  stockCantidad: $("stockCantidad"),
  stockValor: $("stockValor"),
  stockMax: $("stockMax"),
  stockError: $("stockError"),
  stockTableBody: $("stockTableBody"),
  stockEmpty: $("stockEmpty"),
  stockStatusModal: $("stockStatusModal"),
  closeStockStatus: $("closeStockStatus"),
  closeStockStatusBottom: $("closeStockStatusBottom"),
  stockStatusBody: $("stockStatusBody"),
  stockStatusEmpty: $("stockStatusEmpty"),
  stockStatusSummary: $("stockStatusSummary"),
  stockEditModal: $("stockEditModal"),
  closeStockEdit: $("closeStockEdit"),
  cancelStockEdit: $("cancelStockEdit"),
  saveStockEditButton: $("saveStockEditButton"),
  editProducto: $("editProducto"),
  editMarca: $("editMarca"),
  editVariedad: $("editVariedad"),
  editCantidad: $("editCantidad"),
  editValor: $("editValor"),
  editMax: $("editMax"),
  stockEditError: $("stockEditError"),
  stockDeleteModal: $("stockDeleteModal"),
  closeStockDelete: $("closeStockDelete"),
  cancelStockDelete: $("cancelStockDelete"),
  confirmStockDeleteButton: $("confirmStockDeleteButton"),
  stockDeleteText: $("stockDeleteText")
};

const state = {
  weightGrams: 0,
  total: 0,
  paymentMethod: null,
  connected: false,
  stockRows: [],
  editingStock: null,
  deletingStock: null
};

const EDIT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';

const DELETE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';

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

function parseStockGrams(value) {
  const number = Number(
    String(value ?? "").replace(",", ".")
  );

  return Number.isFinite(number) ? number : 0;
}

function formatKg(grams) {
  const kg = parseStockGrams(grams) / 1000;

  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 3
  }).format(kg)} kg`;
}

function kgInputString(grams) {
  const kg = parseStockGrams(grams) / 1000;

  if (!Number.isFinite(kg) || kg <= 0) {
    return "";
  }

  return Number.isInteger(kg)
    ? String(kg)
    : String(kg).replace(".", ",");
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

function showStockError(text) {
  if (!elements.stockError) return;

  if (!text) {
    elements.stockError.classList.add("hidden");
    elements.stockError.textContent = "";
    return;
  }

  elements.stockError.textContent = text;
  elements.stockError.classList.remove("hidden");
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

function productLabel(row) {
  return [row?.producto, row?.marca, row?.variedad]
    .filter(Boolean)
    .join(" · ");
}

function sortedStockRows() {
  const compare = (x, y) =>
    String(x || "").localeCompare(
      String(y || ""),
      "es",
      { sensitivity: "base" }
    );

  return [...state.stockRows].sort(
    (a, b) =>
      compare(a.producto, b.producto) ||
      compare(a.marca, b.marca) ||
      compare(a.variedad, b.variedad)
  );
}

async function loadStockOptions() {
  try {
    const data = await window.balanzaAPI?.listStock();

    if (data?.ok === false) {
      throw new Error(
        data.error || "No se pudo leer el stock."
      );
    }

    state.stockRows = Array.isArray(data?.rows)
      ? data.rows
      : [];
  } catch (error) {
    state.stockRows = [];
    showMessage(
      error?.message || "No se pudo leer el stock.",
      "error"
    );
  }

  renderStockSelector();
  renderSaleProductSelector();
}

function renderSaleProductSelector() {
  if (!elements.saleProduct) return;

  const previous = elements.saleProduct.value;

  elements.saleProduct.innerHTML = "";

  const none = document.createElement("option");
  none.value = "";
  none.textContent = "Seleccionar";
  elements.saleProduct.appendChild(none);

  for (const row of sortedStockRows()) {
    const option = document.createElement("option");
    option.value = productLabel(row);
    option.textContent = `${productLabel(
      row
    )} · disp. ${formatKg(row.cantidad_g)}`;
    elements.saleProduct.appendChild(option);
  }

  const stillThere = [...elements.saleProduct.options].some(
    (option) => option.value === previous
  );

  elements.saleProduct.value =
    previous && stillThere ? previous : "";
}

function getSelectedSaleProduct() {
  const label = elements.saleProduct?.value;

  return label
    ? state.stockRows.find(
        (row) => productLabel(row) === label
      ) || null
    : null;
}

function onSaleProductChange() {
  const row = getSelectedSaleProduct();

  if (row && elements.pricePerKilo) {
    elements.pricePerKilo.value = Math.round(
      parseStockGrams(row.valor_kg)
    );
  }

  calculateTotal();
}

function renderStockSelector() {
  if (!elements.stockExistente) return;

  const previous = elements.stockExistente.value;

  elements.stockExistente.innerHTML = "";

  const nuevo = document.createElement("option");
  nuevo.value = "";
  nuevo.textContent = "— Nuevo producto —";
  elements.stockExistente.appendChild(nuevo);

  for (const row of sortedStockRows()) {
    const option = document.createElement("option");
    option.value = productLabel(row);
    option.textContent = `${productLabel(
      row
    )} · disp. ${formatKg(row.cantidad_g)}`;
    elements.stockExistente.appendChild(option);
  }

  const stillThere = [...elements.stockExistente.options].some(
    (option) => option.value === previous
  );

  elements.stockExistente.value =
    previous && stillThere ? previous : "";
}

function onStockExistenteChange() {
  const label = elements.stockExistente?.value;

  const row = label
    ? state.stockRows.find(
        (item) => productLabel(item) === label
      )
    : null;

  const isExisting = Boolean(row);

  if (elements.stockProducto) {
    elements.stockProducto.value = row?.producto || "";
    elements.stockProducto.readOnly = isExisting;
  }

  if (elements.stockMarca) {
    elements.stockMarca.value = row?.marca || "";
    elements.stockMarca.readOnly = isExisting;
  }

  if (elements.stockVariedad) {
    elements.stockVariedad.value = row?.variedad || "";
    elements.stockVariedad.readOnly = isExisting;
  }

  if (elements.stockValor) {
    elements.stockValor.value = row
      ? Math.round(parseStockGrams(row.valor_kg))
      : "";
  }

  if (elements.stockMax) {
    elements.stockMax.value = row
      ? kgInputString(row.stock_max_g)
      : "";
  }
}

function renderStockTable() {
  if (!elements.stockTableBody) return;

  elements.stockTableBody.innerHTML = "";

  const rows = sortedStockRows();

  elements.stockEmpty?.classList.toggle(
    "hidden",
    rows.length > 0
  );

  for (const row of rows) {
    const tr = document.createElement("tr");

    const values = [
      row.producto || "-",
      row.marca || "-",
      row.variedad || "-",
      formatKg(row.cantidad_g),
      money(row.valor_kg),
      formatKg(row.stock_max_g)
    ];

    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }

    elements.stockTableBody.appendChild(tr);
  }
}

async function openStockModal() {
  showStockError("");

  if (elements.stockExistente) {
    elements.stockExistente.value = "";
  }

  if (elements.stockProducto) {
    elements.stockProducto.value = "";
    elements.stockProducto.readOnly = false;
  }

  if (elements.stockMarca) {
    elements.stockMarca.value = "";
    elements.stockMarca.readOnly = false;
  }

  if (elements.stockVariedad) {
    elements.stockVariedad.value = "";
    elements.stockVariedad.readOnly = false;
  }

  if (elements.stockCantidad) {
    elements.stockCantidad.value = "";
  }

  if (elements.stockValor) {
    elements.stockValor.value = "";
  }

  if (elements.stockMax) {
    elements.stockMax.value = "";
  }

  elements.stockModal?.classList.remove("hidden");

  await loadStockOptions();
  renderStockTable();

  elements.stockProducto?.focus();
}

function closeStockModal() {
  elements.stockModal?.classList.add("hidden");
}

async function openStockStatusModal() {
  elements.stockStatusModal?.classList.remove("hidden");

  await loadStockOptions();
  renderStockStatus();
}

function closeStockStatusModal() {
  elements.stockStatusModal?.classList.add("hidden");
}

function renderStockStatus() {
  if (!elements.stockStatusBody) return;

  elements.stockStatusBody.innerHTML = "";

  const rows = sortedStockRows();

  elements.stockStatusEmpty?.classList.toggle(
    "hidden",
    rows.length > 0
  );

  if (elements.stockStatusSummary) {
    elements.stockStatusSummary.innerHTML = "";

    const totalGrams = rows.reduce(
      (sum, row) => sum + parseStockGrams(row.cantidad_g),
      0
    );

    const totalValue = rows.reduce(
      (sum, row) =>
        sum +
        Math.round(
          (parseStockGrams(row.valor_kg) / 1000) *
            parseStockGrams(row.cantidad_g)
        ),
      0
    );

    const count = document.createElement("span");
    count.innerHTML = `<strong>${rows.length}</strong> producto${
      rows.length === 1 ? "" : "s"
    }`;

    const available = document.createElement("span");
    available.innerHTML = `Disponible: <strong>${formatKg(
      totalGrams
    )}</strong>`;

    const value = document.createElement("span");
    value.innerHTML = `Valor total: <strong>${money(
      totalValue
    )}</strong>`;

    elements.stockStatusSummary.appendChild(count);
    elements.stockStatusSummary.appendChild(available);
    elements.stockStatusSummary.appendChild(value);
  }

  for (const row of rows) {
    const tr = document.createElement("tr");

    const values = [
      row.producto || "-",
      row.marca || "-",
      row.variedad || "-",
      formatKg(row.cantidad_g),
      money(row.valor_kg),
      formatKg(row.stock_max_g),
      row.fecha_carga || "-"
    ];

    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }

    const actionsTd = document.createElement("td");
    actionsTd.className = "stock-actions";

    const editButton = document.createElement("button");
    editButton.className = "stock-action-button";
    editButton.title = "Editar";
    editButton.setAttribute("aria-label", "Editar");
    editButton.innerHTML = EDIT_ICON;
    editButton.addEventListener("click", () =>
      openEditStockModal(row)
    );

    const deleteButton = document.createElement("button");
    deleteButton.className = "stock-action-button danger";
    deleteButton.title = "Eliminar";
    deleteButton.setAttribute("aria-label", "Eliminar");
    deleteButton.innerHTML = DELETE_ICON;
    deleteButton.addEventListener("click", () =>
      openDeleteStockModal(row)
    );

    actionsTd.appendChild(editButton);
    actionsTd.appendChild(deleteButton);
    tr.appendChild(actionsTd);

    elements.stockStatusBody.appendChild(tr);
  }
}

function openEditStockModal(row) {
  state.editingStock = {
    producto: row.producto,
    marca: row.marca,
    variedad: row.variedad
  };

  showStockEditError("");

  if (elements.editProducto) {
    elements.editProducto.value = row.producto || "";
  }

  if (elements.editMarca) {
    elements.editMarca.value = row.marca || "";
  }

  if (elements.editVariedad) {
    elements.editVariedad.value = row.variedad || "";
  }

  if (elements.editCantidad) {
    elements.editCantidad.value = kgInputString(
      row.cantidad_g
    );
  }

  if (elements.editValor) {
    elements.editValor.value = Math.round(
      parseStockGrams(row.valor_kg)
    );
  }

  if (elements.editMax) {
    elements.editMax.value = kgInputString(
      row.stock_max_g
    );
  }

  elements.stockEditModal?.classList.remove("hidden");
  elements.editProducto?.focus();
}

function closeStockEditModal() {
  elements.stockEditModal?.classList.add("hidden");
  state.editingStock = null;
}

function showStockEditError(text) {
  if (!elements.stockEditError) return;

  if (!text) {
    elements.stockEditError.classList.add("hidden");
    elements.stockEditError.textContent = "";
    return;
  }

  elements.stockEditError.textContent = text;
  elements.stockEditError.classList.remove("hidden");
}

async function saveStockEdit() {
  const item = {
    original: state.editingStock,
    producto: elements.editProducto?.value || "",
    marca: elements.editMarca?.value || "",
    variedad: elements.editVariedad?.value || "",
    cantidadKg: elements.editCantidad?.value || "",
    valorKg: elements.editValor?.value || "",
    stockMaxKg: elements.editMax?.value || ""
  };

  try {
    const result = await window.balanzaAPI?.updateStock(
      item
    );

    if (result?.ok === false) {
      throw new Error(
        result.error || "No se pudo actualizar el producto."
      );
    }

    closeStockEditModal();
    await loadStockOptions();
    renderStockStatus();
    showMessage(
      "Producto actualizado correctamente.",
      "success"
    );
  } catch (error) {
    showStockEditError(
      error?.message || "No se pudo actualizar el producto."
    );
  }
}

function openDeleteStockModal(row) {
  state.deletingStock = {
    producto: row.producto,
    marca: row.marca,
    variedad: row.variedad
  };

  if (elements.stockDeleteText) {
    elements.stockDeleteText.textContent = `¿Eliminar "${productLabel(
      row
    )}" del stock? Esta acción no se puede deshacer.`;
  }

  elements.stockDeleteModal?.classList.remove("hidden");
}

function closeStockDeleteModal() {
  elements.stockDeleteModal?.classList.add("hidden");
  state.deletingStock = null;
}

async function confirmDeleteStock() {
  try {
    const result = await window.balanzaAPI?.deleteStock(
      state.deletingStock
    );

    if (result?.ok === false) {
      throw new Error(
        result.error || "No se pudo eliminar el producto."
      );
    }

    closeStockDeleteModal();
    await loadStockOptions();
    renderStockStatus();
    showMessage(
      "Producto eliminado del stock.",
      "success"
    );
  } catch (error) {
    closeStockDeleteModal();
    showMessage(
      error?.message || "No se pudo eliminar el producto.",
      "error"
    );
  }
}

async function saveStockItem() {
  const item = {
    producto: elements.stockProducto?.value || "",
    marca: elements.stockMarca?.value || "",
    variedad: elements.stockVariedad?.value || "",
    cantidadKg: elements.stockCantidad?.value || "",
    valorKg: elements.stockValor?.value || "",
    stockMaxKg: elements.stockMax?.value || ""
  };

  try {
    const result = await window.balanzaAPI?.loadStock(item);

    if (result?.ok === false) {
      throw new Error(
        result.error || "No se pudo cargar el stock."
      );
    }

    closeStockModal();
    await loadStockOptions();
    showMessage("Stock cargado correctamente.", "success");
  } catch (error) {
    showStockError(
      error?.message || "No se pudo cargar el stock."
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

  const productRow = getSelectedSaleProduct();

  if (productRow) {
    const available = parseStockGrams(
      productRow.cantidad_g
    );

    if (state.weightGrams > available) {
      showMessage(
        `Stock insuficiente de "${
          productRow.producto
        }": disponible ${formatGrams(available)} g (${formatKg(
          available
        )}), pesado ${formatGrams(state.weightGrams)} g.`,
        "error"
      );
      return;
    }
  }

  const sale = {
    date: new Date().toISOString(),
    weightGrams: state.weightGrams,
    pricePerKg:
      Number(elements.pricePerKilo?.value) || 0,
    total: state.total,
    paymentMethod: state.paymentMethod,
    cashReceived,
    product: productRow
      ? {
          producto: productRow.producto,
          marca: productRow.marca,
          variedad: productRow.variedad
        }
      : null
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
    await loadStockOptions();
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

  if (elements.saleProduct) {
    elements.saleProduct.value = "";
  }

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
    "vuelto",
    "producto"
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

  elements.saleProduct?.addEventListener(
    "change",
    onSaleProductChange
  );

  elements.stockExistente?.addEventListener(
    "change",
    onStockExistenteChange
  );

  elements.closeStock?.addEventListener(
    "click",
    closeStockModal
  );

  elements.cancelStock?.addEventListener(
    "click",
    closeStockModal
  );

  elements.saveStockButton?.addEventListener(
    "click",
    saveStockItem
  );

  elements.stockModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.stockModal) {
        closeStockModal();
      }
    }
  );

  elements.closeStockStatus?.addEventListener(
    "click",
    closeStockStatusModal
  );

  elements.closeStockStatusBottom?.addEventListener(
    "click",
    closeStockStatusModal
  );

  elements.stockStatusModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.stockStatusModal) {
        closeStockStatusModal();
      }
    }
  );

  elements.closeStockEdit?.addEventListener(
    "click",
    closeStockEditModal
  );

  elements.cancelStockEdit?.addEventListener(
    "click",
    closeStockEditModal
  );

  elements.saveStockEditButton?.addEventListener(
    "click",
    saveStockEdit
  );

  elements.stockEditModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.stockEditModal) {
        closeStockEditModal();
      }
    }
  );

  elements.closeStockDelete?.addEventListener(
    "click",
    closeStockDeleteModal
  );

  elements.cancelStockDelete?.addEventListener(
    "click",
    closeStockDeleteModal
  );

  elements.confirmStockDeleteButton?.addEventListener(
    "click",
    confirmDeleteStock
  );

  elements.stockDeleteModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.stockDeleteModal) {
        closeStockDeleteModal();
      }
    }
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

  if (
    typeof window.balanzaAPI?.onOpenStock === "function"
  ) {
    window.balanzaAPI.onOpenStock(() => {
      openStockModal();
    });
  }

  if (
    typeof window.balanzaAPI?.onOpenStockStatus === "function"
  ) {
    window.balanzaAPI.onOpenStockStatus(() => {
      openStockStatusModal();
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

  await loadStockOptions();

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
