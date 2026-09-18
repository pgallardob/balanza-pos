const { SerialPort } = require("serialport");
const { parseWeight } = require("./protocols");

let port = null;
let configuration = null;
let onWeightReceived = null;
let requestTimer = null;

let receiveBuffer = "";

async function listPorts() {
  const ports = await SerialPort.list();

  return ports.map((item) => ({
    path: item.path,
    manufacturer: item.manufacturer || "",
    serialNumber: item.serialNumber || "",
    pnpId: item.pnpId || "",
    vendorId: item.vendorId || "",
    productId: item.productId || ""
  }));
}

function getConnectionState() {
  return {
    connected: Boolean(port?.isOpen),
    path: port?.path || ""
  };
}

function getDelimiter() {
  switch (configuration?.lineEnding) {
    case "crlf":
      return "\r\n";

    case "lf":
      return "\n";

    case "cr":
      return "\r";

    default:
      return null;
  }
}

const MAX_BUFFER_LENGTH = 4096;

function processIncomingData(chunk) {
  receiveBuffer += chunk.toString("utf8");

  if (receiveBuffer.length > MAX_BUFFER_LENGTH) {
    receiveBuffer = receiveBuffer.slice(-MAX_BUFFER_LENGTH);
  }

  const delimiter = getDelimiter();

  if (delimiter) {
    const parts = receiveBuffer.split(delimiter);

    receiveBuffer = parts.pop() || "";

    for (const part of parts) {
      processMessage(part);
    }

    return;
  }

  const lines = receiveBuffer.split(/\r\n|\n|\r/);

  receiveBuffer = lines.pop() || "";

  for (const line of lines) {
    processMessage(line);
  }

  const directWeight = parseWeight(
    receiveBuffer,
    configuration
  );

  if (directWeight !== null) {
    processMessage(receiveBuffer);
    receiveBuffer = "";
  }
}

function processMessage(message) {
  const weight = parseWeight(
    message,
    configuration
  );

  if (
    weight !== null &&
    Number.isFinite(weight) &&
    onWeightReceived
  ) {
    onWeightReceived(weight);
  }
}

function stopRequestTimer() {
  if (requestTimer) {
    clearInterval(requestTimer);
    requestTimer = null;
  }
}

function startRequestTimer() {
  stopRequestTimer();

  const interval = Number(configuration?.requestInterval);
  const delay =
    Number.isFinite(interval) && interval >= 100
      ? interval
      : 500;

  requestTimer = setInterval(() => {
    requestWeight().catch(() => {});
  }, delay);
}

async function connect(config, weightCallback) {
  await disconnect();

  configuration = {
    ...(config || {})
  };

  onWeightReceived = weightCallback;
  receiveBuffer = "";

  if (!configuration.port) {
    throw new Error("No se seleccionó un puerto.");
  }

  const baudRate = Number(configuration.baudRate) || 9600;
  const dataBits = Number(configuration.dataBits) || 8;
  const stopBits = Number(configuration.stopBits) || 1;
  const parity = configuration.parity || "none";

  const newPort = new SerialPort({
    path: configuration.port,
    baudRate,
    dataBits,
    stopBits,
    parity,
    rtscts: configuration.flowControl === "hardware",
    xon: configuration.flowControl === "software",
    xoff: configuration.flowControl === "software",
    autoOpen: false
  });

  newPort.on("data", processIncomingData);

  newPort.on("error", () => {
    if (onWeightReceived) {
      onWeightReceived(null);
    }
  });

  newPort.on("close", () => {
    stopRequestTimer();

    if (onWeightReceived) {
      onWeightReceived(null);
    }
  });

  try {
    await new Promise((resolve, reject) => {
      newPort.open((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    try {
      newPort.removeAllListeners();
      newPort.destroy();
    } catch {}

    throw error;
  }

  port = newPort;

  if (configuration.mode === "request") {
    await requestWeight();
    startRequestTimer();
  }

  return getConnectionState();
}

async function requestWeight() {
  if (!port || !port.isOpen) {
    throw new Error("La balanza no está conectada.");
  }

  const command = configuration?.command || "P";

  let buffer;

  if (configuration?.commandHex) {
    const clean = command
      .replace(/\s+/g, "")
      .replace(/^0x/i, "");

    if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
      throw new Error(
        "El comando hexadecimal no es válido."
      );
    }

    buffer = Buffer.from(clean, "hex");
  } else {
    buffer = Buffer.from(
      command,
      "utf8"
    );
  }

  const ending = getDelimiter();

  if (ending) {
    buffer = Buffer.concat([
      buffer,
      Buffer.from(ending, "utf8")
    ]);
  }

  await new Promise((resolve, reject) => {
    port.write(buffer, (error) => {
      if (error) {
        reject(error);
        return;
      }

      port.drain((drainError) => {
        if (drainError) {
          reject(drainError);
          return;
        }

        resolve();
      });
    });
  });

  return true;
}

async function disconnect() {
  stopRequestTimer();

  if (!port) {
    return true;
  }

  const currentPort = port;

  port = null;
  receiveBuffer = "";

  if (!currentPort.isOpen) {
    try {
      currentPort.removeAllListeners();
    } catch {}
    return true;
  }

  await new Promise((resolve) => {
    currentPort.close(() => {
      try {
        currentPort.removeAllListeners();
      } catch {}
      resolve();
    });
  });

  return true;
}

module.exports = {
  listPorts,
  connect,
  disconnect,
  requestWeight,
  getConnectionState
};