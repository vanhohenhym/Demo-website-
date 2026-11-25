import { roundHalfAwayFromZero } from "./round.ts";
import type {
  AttributeConfidence,
  AttributeSource,
  CanonicalAttributeKey,
  NormalizeAttributeInput,
  NormalizeAttributeResult,
} from "./types.ts";
import {
  ATTRIBUTE_NAME_ALIASES,
  FORM_FACTOR_VOCABULARY,
  RAM_TYPE_PATTERNS,
  SOCKET_VOCABULARY,
  STORAGE_KEYWORD_FALLBACKS,
  STORAGE_VOCABULARY,
} from "./vocab.ts";

interface ParsedLeadingNumber {
  value: number;
  unit: string;
  hasInchQuote: boolean;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isLetter(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function normalizeSocketToken(raw: string): string | undefined {
  let cleaned = raw.toUpperCase().replace(/[^A-Z0-9+]/g, "");
  if (cleaned.startsWith("SOCKET")) {
    cleaned = cleaned.slice(6);
  }
  return SOCKET_VOCABULARY[cleaned];
}

function normalizeStorageToken(raw: string): string | undefined {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const exact = STORAGE_VOCABULARY[cleaned];
  if (exact != null) {
    return exact;
  }
  // DEVIATION D8: keyword fallback on cleaned text
  for (const entry of STORAGE_KEYWORD_FALLBACKS) {
    for (const kw of entry.keywords) {
      if (cleaned.includes(kw)) {
        return entry.canonical;
      }
    }
  }
  return undefined;
}

function splitListValue(raw: string): string[] {
  return raw
    .split(/[,/;|]|\band\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Parses the leading number and its immediately adjacent unit from rawValue.
 * Implements DEVIATION D4 thousands-separator rules:
 * - Comma is treated as a thousands separator only when no decimal has been seen,
 *   the leading digit group has 1-2 digits (so "1,200W" -> 1200, "650,750W" -> 650),
 *   and exactly 3 digits immediately follow the comma (not followed by a 4th digit).
 */
function parseLeadingNumberAndUnit(rawValue: string): ParsedLeadingNumber | undefined {
  const len = rawValue.length;
  let i = 0;

  while (i < len && !isDigit(rawValue[i])) {
    i++;
  }
  if (i >= len) {
    return undefined;
  }

  let isNegative = false;
  if (i > 0 && rawValue[i - 1] === "-") {
    isNegative = true;
  }

  let numStr = "";
  let seenDot = false;
  let seenComma = false;
  let leadingGroupDigits = 0;

  while (i < len) {
    const ch = rawValue[i];
    if (isDigit(ch)) {
      numStr += ch;
      if (!seenDot && !seenComma) {
        leadingGroupDigits++;
      }
      i++;
    } else if (ch === "." && !seenDot) {
      seenDot = true;
      numStr += ch;
      i++;
    } else if (
      ch === "," &&
      !seenDot &&
      leadingGroupDigits >= 1 &&
      leadingGroupDigits <= 2 &&
      i + 3 < len &&
      isDigit(rawValue[i + 1]) &&
      isDigit(rawValue[i + 2]) &&
      isDigit(rawValue[i + 3]) &&
      (i + 4 >= len || !isDigit(rawValue[i + 4]))
    ) {
      seenComma = true;
      i++; // skip thousands separator comma
    } else {
      break;
    }
  }

  if (numStr === "" || numStr === ".") {
    return undefined;
  }

  const parsed = Number(isNegative ? `-${numStr}` : numStr);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  // Skip optional spaces before unit / quote
  while (i < len && (rawValue[i] === " " || rawValue[i] === "\t")) {
    i++;
  }

  const hasInchQuote = i < len && rawValue[i] === '"';
  let unit = "";
  if (!hasInchQuote) {
    while (i < len && isLetter(rawValue[i])) {
      unit += rawValue[i].toLowerCase();
      i++;
    }
  }

  return { value: parsed, unit, hasInchQuote };
}

export function normalizeAttribute(input: NormalizeAttributeInput): NormalizeAttributeResult {
  const source: AttributeSource = input.source ?? "explicit";
  const confidence: AttributeConfidence = source === "parsed" ? "medium" : "high";
  const effectiveType = (input.componentType ?? input.categoryHint ?? "").trim().toLowerCase();

  // Step 1: resolve alias (first match)
  const cleanName = input.rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  let canonicalKey: CanonicalAttributeKey | undefined = ATTRIBUTE_NAME_ALIASES[cleanName];

  if (canonicalKey == null) {
    return {
      matched: false,
      rejectionReason: "",
    };
  }

  // Component-aware overrides (first-match-wins)
  if (canonicalKey === "lengthMm" && effectiveType === "case") {
    canonicalKey = "maxGpuLengthMm";
  } else if (
    (cleanName === "power" || cleanName === "powerconsumption") &&
    (effectiveType === "cpu" || effectiveType === "gpu")
  ) {
    canonicalKey = "tdp";
  } else if (cleanName === "powerconsumption" && effectiveType === "psu") {
    canonicalKey = "wattage";
  }

  // Step 2: normalize value by canonicalKey (first-match-wins)
  if (canonicalKey === "socket") {
    const normalized = normalizeSocketToken(input.rawValue);
    if (normalized == null) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "Unrecognized socket value",
      };
    }
    return {
      canonicalKey,
      matched: true,
      rejectionReason: "",
      textResult: { value: normalized, source, confidence },
    };
  } else if (canonicalKey === "storageInterface") {
    const normalized = normalizeStorageToken(input.rawValue);
    if (normalized == null) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "Unrecognized storage value",
      };
    }
    return {
      canonicalKey,
      matched: true,
      rejectionReason: "",
      textResult: { value: normalized, source, confidence },
    };
  } else if (canonicalKey === "coolerSockets" || canonicalKey === "storageInterfaces") {
    // DEVIATION D3: handle list keys exclusively and set rejectionReason only when no item recognized
    const parts = splitListValue(input.rawValue);
    const items: string[] = [];
    for (const part of parts) {
      const normalized =
        canonicalKey === "coolerSockets"
          ? normalizeSocketToken(part)
          : normalizeStorageToken(part);
      if (normalized != null && !items.includes(normalized)) {
        items.push(normalized);
      }
    }
    if (items.length === 0) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "No recognized values in list",
      };
    }
    return {
      canonicalKey,
      matched: true,
      rejectionReason: "",
      listResult: { value: items, source, confidence },
    };
  } else if (canonicalKey === "ramType") {
    const lower = input.rawValue.toLowerCase();
    if (lower.includes("gddr")) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "GDDR graphics memory is not system RAM",
      };
    }
    for (const [pattern, canonical] of RAM_TYPE_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          canonicalKey,
          matched: true,
          rejectionReason: "",
          textResult: { value: canonical, source, confidence },
        };
      }
    }
    return {
      canonicalKey,
      matched: true,
      rejectionReason: "Unrecognized RAM generation",
    };
  } else if (canonicalKey === "formFactor") {
    const parenIdx = input.rawValue.indexOf("(");
    const beforeParen = parenIdx >= 0 ? input.rawValue.slice(0, parenIdx) : input.rawValue;
    const cleaned = beforeParen.toLowerCase().replace(/[^a-z0-9]/g, "");
    const canonical = FORM_FACTOR_VOCABULARY[cleaned];
    if (canonical == null) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "Unrecognized form factor",
      };
    }
    return {
      canonicalKey,
      matched: true,
      rejectionReason: "",
      textResult: { value: canonical, source, confidence },
    };
  } else if (canonicalKey === "wattage" || canonicalKey === "tdp") {
    const parsed = parseLeadingNumberAndUnit(input.rawValue);
    if (parsed == null) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "No numeric value found",
      };
    }
    let val = parsed.value;
    if (parsed.unit === "kw" || parsed.unit === "kilowatt" || parsed.unit === "kilowatts") {
      val *= 1000;
    }
    if (val <= 0) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "Power must be greater than 0",
      };
    }
    return {
      canonicalKey,
      matched: true,
      rejectionReason: "",
      numberResult: {
        value: roundHalfAwayFromZero(val),
        source,
        confidence,
      },
    };
  } else {
    // lengthMm / maxGpuLengthMm
    const parsed = parseLeadingNumberAndUnit(input.rawValue);
    if (parsed == null) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "No numeric value found",
      };
    }

    let mm: number | undefined;
    if (
      parsed.unit === "cm" ||
      parsed.unit === "centimeter" ||
      parsed.unit === "centimeters" ||
      parsed.unit === "centimetre" ||
      parsed.unit === "centimetres"
    ) {
      mm = parsed.value * 10;
    } else if (
      parsed.hasInchQuote ||
      parsed.unit === "in" ||
      parsed.unit === "inch" ||
      parsed.unit === "inches"
    ) {
      mm = parsed.value * 25.4;
    } else if (
      parsed.unit === "mm" ||
      parsed.unit === "millimeter" ||
      parsed.unit === "millimeters" ||
      parsed.unit === "millimetre" ||
      parsed.unit === "millimetres" ||
      (parsed.unit === "" && parsed.value >= 50)
    ) {
      mm = parsed.value;
    }

    if (mm == null) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "Dimension outside 50-600 mm range or missing unit",
      };
    }

    const rounded = roundHalfAwayFromZero(mm);
    if (rounded < 50 || rounded > 600) {
      return {
        canonicalKey,
        matched: true,
        rejectionReason: "Dimension outside 50-600 mm range or missing unit",
      };
    }

    return {
      canonicalKey,
      matched: true,
      rejectionReason: "",
      numberResult: {
        value: rounded,
        source,
        confidence,
      },
    };
  }
}
