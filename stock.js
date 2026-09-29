const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const directory = app.getPath("userData");
const filePath = path.join(directory, "stock.csv");

const HEADER =
  "producto;marca;variedad;cantidad_g;valor_kg;stock_max_g;fecha_carga\r\n";

function round3(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function gramString(value) {
  const number = round3(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  if (Number.isInteger(number)) {
    return String(number);
  }

  return number
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(".", ",");
}

function parseGrams(value) {
  const number = Number(
    String(value ?? "").replace(",", ".")
  );

  return Number.isFinite(number) ? number : 0;
}

function parseKgToGrams(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");

  const kg = Number(normalized);

  if (!Number.isFinite(kg)) {
    return NaN;
  }

  return round3(kg * 1000);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function sameProduct(row, product) {
  return (
    normalizeText(row.producto) ===
      normalizeText(product?.producto) &&
    normalizeText(row.marca) ===
      normalizeText(product?.marca) &&
    normalizeText(row.variedad) ===
      normalizeText(product?.variedad)
  );
}

function readStock() {
  if (!fs.existsSync(filePath)) {
    return { rows: [], count: 0, file: filePath };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);

  const rows = lines.slice(1).map((line) => {
    const [
      producto,
      marca,
      variedad,
      cantidad_g,
      valor_kg,
      stock_max_g,
      fecha_carga
    ] = line.split(";");

    return {
      producto,
      marca,
      variedad,
      cantidad_g,
      valor_kg,
      stock_max_g,
      fecha_carga
    };
  });

  return { rows, count: rows.length, file: filePath };
}

function writeStock(rows) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const content =
    HEADER +
    rows
      .map((row) =>
        [
          row.producto,
          row.marca,
          row.variedad,
          row.cantidad_g,
          row.valor_kg,
          row.stock_max_g,
          row.fecha_carga
        ].join(";")
      )
      .join("\r\n") + "\r\n";

  fs.writeFileSync(filePath, content, "utf8");
}

function loadStockItem(item) {
  const producto = String(item?.producto ?? "").trim();
  const marca = String(item?.marca ?? "").trim();
  const variedad = String(item?.variedad ?? "").trim();

  if (!producto) {
    return {
      ok: false,
      error: "Ingrese el nombre del producto."
    };
  }

  const cantidadG = parseKgToGrams(item?.cantidadKg);

  if (!Number.isFinite(cantidadG) || cantidadG <= 0) {
    return {
      ok: false,
      error: "La cantidad en kilos debe ser mayor a 0."
    };
  }

  const stockMaxG = parseKgToGrams(item?.stockMaxKg);

  if (!Number.isFinite(stockMaxG) || stockMaxG <= 0) {
    return {
      ok: false,
      error: "El stock máximo en kilos debe ser mayor a 0."
    };
  }

  const valorKg = Math.round(Number(item?.valorKg) || 0);

  if (valorKg <= 0) {
    return {
      ok: false,
      error: "El valor por kilo debe ser mayor a 0."
    };
  }

  const rows = readStock().rows;
  const existing = rows.find((row) =>
    sameProduct(row, { producto, marca, variedad })
  );

  const currentG = existing
    ? parseGrams(existing.cantidad_g)
    : 0;
  const newTotalG = round3(currentG + cantidadG);

  if (newTotalG > stockMaxG) {
    return {
      ok: false,
      error: `Supera el stock máximo (${gramString(
        stockMaxG
      )} g). Queda espacio para ${gramString(
        Math.max(0, stockMaxG - currentG)
      )} g.`
    };
  }

  const now = new Date();
  const fecha_carga = `${now.toLocaleDateString(
    "es-CL"
  )} ${now.toLocaleTimeString("es-CL")}`;

  if (existing) {
    existing.cantidad_g = gramString(newTotalG);
    existing.valor_kg = String(valorKg);
    existing.stock_max_g = gramString(stockMaxG);
    existing.fecha_carga = fecha_carga;
  } else {
    rows.push({
      producto,
      marca,
      variedad,
      cantidad_g: gramString(cantidadG),
      valor_kg: String(valorKg),
      stock_max_g: gramString(stockMaxG),
      fecha_carga
    });
  }

  writeStock(rows);

  return { ok: true, rows: readStock().rows };
}

function deductStock(product, grams) {
  const amount = round3(grams);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      error: "Peso inválido para descontar del stock."
    };
  }

  const rows = readStock().rows;
  const row = rows.find((item) => sameProduct(item, product));

  if (!row) {
    return {
      ok: false,
      error: "El producto no existe en el stock."
    };
  }

  const available = parseGrams(row.cantidad_g);

  if (amount > available) {
    return {
      ok: false,
      error: `Stock insuficiente de "${
        row.producto
      }": disponible ${gramString(available)} g, pesado ${gramString(
        amount
      )} g.`
    };
  }

  row.cantidad_g = gramString(round3(available - amount));

  writeStock(rows);

  return {
    ok: true,
    remainingGrams: parseGrams(row.cantidad_g)
  };
}

function updateStockItem(item) {
  const producto = String(item?.producto ?? "").trim();
  const marca = String(item?.marca ?? "").trim();
  const variedad = String(item?.variedad ?? "").trim();

  if (!producto) {
    return {
      ok: false,
      error: "Ingrese el nombre del producto."
    };
  }

  const cantidadG = parseKgToGrams(item?.cantidadKg);

  if (!Number.isFinite(cantidadG) || cantidadG <= 0) {
    return {
      ok: false,
      error: "La cantidad en kilos debe ser mayor a 0."
    };
  }

  const stockMaxG = parseKgToGrams(item?.stockMaxKg);

  if (!Number.isFinite(stockMaxG) || stockMaxG <= 0) {
    return {
      ok: false,
      error: "El stock máximo en kilos debe ser mayor a 0."
    };
  }

  const valorKg = Math.round(Number(item?.valorKg) || 0);

  if (valorKg <= 0) {
    return {
      ok: false,
      error: "El valor por kilo debe ser mayor a 0."
    };
  }

  if (cantidadG > stockMaxG) {
    return {
      ok: false,
      error: `La cantidad (${gramString(
        cantidadG
      )} g) supera el stock máximo (${gramString(stockMaxG)} g).`
    };
  }

  const rows = readStock().rows;
  const index = rows.findIndex((row) =>
    sameProduct(row, item?.original)
  );

  if (index < 0) {
    return {
      ok: false,
      error: "El producto no existe en el stock."
    };
  }

  const duplicate = rows.findIndex(
    (row, i) =>
      i !== index &&
      sameProduct(row, { producto, marca, variedad })
  );

  if (duplicate >= 0) {
    return {
      ok: false,
      error: "Ya existe un producto con ese nombre, marca y variedad."
    };
  }

  rows[index] = {
    producto,
    marca,
    variedad,
    cantidad_g: gramString(cantidadG),
    valor_kg: String(valorKg),
    stock_max_g: gramString(stockMaxG),
    fecha_carga: rows[index].fecha_carga
  };

  writeStock(rows);

  return { ok: true, rows: readStock().rows };
}

function deleteStockItem(product) {
  const rows = readStock().rows;
  const index = rows.findIndex((row) =>
    sameProduct(row, product)
  );

  if (index < 0) {
    return {
      ok: false,
      error: "El producto no existe en el stock."
    };
  }

  const removed = rows.splice(index, 1)[0];
  writeStock(rows);

  return { ok: true, removed, rows: readStock().rows };
}

module.exports = {
  readStock,
  loadStockItem,
  deductStock,
  updateStockItem,
  deleteStockItem
};
