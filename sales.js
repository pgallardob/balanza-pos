const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const directory = app.getPath("userData");
const filePath = path.join(directory, "ventas.csv");

const HEADER =
  "fecha;hora;peso_g;precio_kg;total;metodo_pago;recibido;vuelto;producto\r\n";

const PAYMENT_LABELS = {
  debito: "Débito",
  credito: "Crédito",
  efectivo: "Efectivo",
  transferencia: "Transferencia"
};

function formatDecimal(value, decimals = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toFixed(decimals).replace(".", ",");
}

function appendSale(sale) {
  const now = sale?.date ? new Date(sale.date) : new Date();

  const fecha = now.toLocaleDateString("es-CL");
  const hora = now.toLocaleTimeString("es-CL");

  const total = Math.round(Number(sale?.total) || 0);
  const isCash = sale?.paymentMethod === "efectivo";
  const received = isCash
    ? Math.round(Number(sale?.cashReceived) || 0)
    : "";
  const change = isCash
    ? Math.max(0, (Number(received) || 0) - total)
    : "";

  const method =
    PAYMENT_LABELS[sale?.paymentMethod] ||
    sale?.paymentMethod ||
    "";

  const producto = [
    sale?.product?.producto,
    sale?.product?.marca,
    sale?.product?.variedad
  ]
    .filter(Boolean)
    .join(" - ");

  const line =
    [
      fecha,
      hora,
      Math.round(Number(sale?.weightGrams) || 0),
      Math.round(Number(sale?.pricePerKg) || 0),
      total,
      method,
      received,
      change,
      producto
    ].join(";") + "\r\n";

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, HEADER, "utf8");
  } else {
    const content = fs.readFileSync(filePath, "utf8");
    const firstLine = content.split(/\r?\n/, 1)[0];

    if (firstLine !== HEADER.trimEnd()) {
      const lines = content.split(/\r?\n/).filter(Boolean);
      lines[0] = HEADER.trimEnd();
      fs.writeFileSync(
        filePath,
        lines.join("\r\n") + "\r\n",
        "utf8"
      );
    }
  }

  fs.appendFileSync(filePath, line, "utf8");

  return filePath;
}

function readSales() {
  if (!fs.existsSync(filePath)) {
    return { rows: [], count: 0, totalSum: 0, file: filePath };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);

  const rows = lines.slice(1).map((line) => {
    const [
      fecha,
      hora,
      peso_g,
      precio_kg,
      total,
      metodo_pago,
      recibido,
      vuelto,
      producto
    ] = line.split(";");

    return {
      fecha,
      hora,
      peso_g,
      precio_kg,
      total,
      metodo_pago,
      recibido,
      vuelto,
      producto: producto ?? ""
    };
  });

  const totalSum = rows.reduce(
    (sum, row) => sum + (parseInt(row.total, 10) || 0),
    0
  );

  return { rows, count: rows.length, totalSum, file: filePath };
}

module.exports = {
  appendSale,
  readSales
};
