const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const filePath = path.join(app.getPath("userData"), "settings.json");

const defaultSettings = {
  scale: {
    port: "",
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
    mode: "continuous",
    command: "P",
    commandHex: false,
    lineEnding: "auto",
    unit: "g",
    decimalSeparator: ".",
    stableOnly: false,
    stableCharacters: ["ST"],
    customRegex: ""
  }
};

function loadSettings() {
  try {
    if (!fs.existsSync(filePath)) {
      return structuredClone(defaultSettings);
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return {
      ...structuredClone(defaultSettings),
      ...data,
      scale: {
        ...defaultSettings.scale,
        ...(data.scale || {})
      }
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}

function saveSettings(settings) {
  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(settings, null, 2),
    "utf8"
  );
}

module.exports = {
  loadSettings,
  saveSettings
};