function normalizeNumber(value, decimalSeparator = ".") {
  let text = String(value).trim();

  if (decimalSeparator === ",") {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function convertToGrams(value, unit) {
  switch (String(unit).toLowerCase()) {
    case "kg":
      return value * 1000;

    case "lb":
    case "lbs":
      return value * 453.59237;

    case "oz":
      return value * 28.349523125;

    case "g":
    default:
      return value;
  }
}

function extractUnit(text) {
  const match = text.match(
    /(-?\d+(?:[.,]\d+)?)\s*(kg|kgs|g|gr|gramos|lb|lbs|oz)\b/i
  );

  if (!match) {
    return null;
  }

  const rawUnit = match[2].toLowerCase();
  let unit = "g";

  if (rawUnit.startsWith("kg")) unit = "kg";
  else if (rawUnit.startsWith("lb")) unit = "lb";
  else if (rawUnit === "oz") unit = "oz";

  return {
    unit,
    value: match[1]
  };
}

function extractNumbers(text, decimalSeparator) {
  const normalized = text
    .replace(/[^\d,.\-+]/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  const matches = normalized.match(
    /[+-]?\d+(?:[.,]\d+)?/g
  );

  if (!matches) {
    return [];
  }

  return matches
    .map((value) =>
      normalizeNumber(value, decimalSeparator)
    )
    .filter((value) => value !== null);
}

function parseWeight(data, configuration = {}) {
  let text = String(data)
    .replace(/\0/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim();

  if (!text) {
    return null;
  }

  if (configuration.stableOnly) {
    const stableCharacters =
      configuration.stableCharacters || ["ST"];

    const stable = stableCharacters.some((marker) =>
      text.toUpperCase().includes(marker.toUpperCase())
    );

    if (!stable) {
      return null;
    }
  }

  if (configuration.customRegex) {
    try {
      const regex = new RegExp(
        configuration.customRegex,
        "i"
      );

      const match = text.match(regex);

      if (match) {
        const valueText =
          match.groups?.weight ||
          match[1] ||
          match[0];

        const detected = extractUnit(text);

        const unit =
          match.groups?.unit ||
          detected?.unit ||
          configuration.unit;

        const number = normalizeNumber(
          valueText,
          configuration.decimalSeparator
        );

        if (number !== null) {
          return Math.max(
            0,
            convertToGrams(number, unit)
          );
        }
      }
    } catch {
      return null;
    }
  }

  const detected = extractUnit(text);

  if (detected) {
    const number = normalizeNumber(
      detected.value,
      configuration.decimalSeparator
    );

    if (number !== null) {
      return Math.max(
        0,
        convertToGrams(number, detected.unit)
      );
    }
  }

  const numbers = extractNumbers(
    text,
    configuration.decimalSeparator
  );

  if (!numbers.length) {
    return null;
  }

  let value = numbers[0];

  if (configuration.unit === "kg") {
    value *= 1000;
  } else if (configuration.unit === "lb") {
    value *= 453.59237;
  } else if (configuration.unit === "oz") {
    value *= 28.349523125;
  }

  return Math.max(0, value);
}

module.exports = {
  parseWeight
};