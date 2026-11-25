import { normalizeAttribute } from "./normalize-attribute.ts";
import type {
  AttributeSource,
  ExtractAttributesResult,
  FormFactor,
  FormFactorAttribute,
  KeyValuePair,
  RawCmsProduct,
} from "./types.ts";
import { FORM_FACTOR_SIZE_RANK } from "./vocab.ts";

function isFormFactor(val: string): val is FormFactor {
  return val === "EATX" || val === "ATX" || val === "mATX" || val === "Mini-ITX";
}

/**
 * Builds paddedTitle with DEVIATION D1 word-boundary semantics:
 * - Lowercase title, keep a-z0-9, "-", "."; every other character becomes a space.
 * - "-" and "." count as boundaries EXCEPT inside e-atx, micro-atx, m-atx,
 *   mini-itx, mini-dtx, m.2, and decimal numbers.
 * - Surrounded by single spaces so whole words are matched with leading/trailing spaces.
 */
function buildPaddedTitle(title: string): string {
  let s = " " + title.toLowerCase().replace(/[^a-z0-9.-]/g, " ") + " ";

  s = s
    .replace(/(?<![a-z0-9])e-atx(?![a-z0-9])/g, "__eatx__")
    .replace(/(?<![a-z0-9])micro-atx(?![a-z0-9])/g, "__microatx__")
    .replace(/(?<![a-z0-9])m-atx(?![a-z0-9])/g, "__matx__")
    .replace(/(?<![a-z0-9])mini-itx(?![a-z0-9])/g, "__miniitx__")
    .replace(/(?<![a-z0-9])mini-dtx(?![a-z0-9])/g, "__minidtx__")
    .replace(/(?<![a-z0-9])m\.2(?![a-z0-9])/g, "__m2__")
    .replace(/(?<=\d)\.(?=\d)/g, "__dec__");

  s = s.replace(/[-.]/g, " ");

  s = s
    .replace(/__eatx__/g, "e-atx")
    .replace(/__microatx__/g, "micro-atx")
    .replace(/__matx__/g, "m-atx")
    .replace(/__miniitx__/g, "mini-itx")
    .replace(/__minidtx__/g, "mini-dtx")
    .replace(/__m2__/g, "m.2")
    .replace(/__dec__/g, ".");

  return " " + s.replace(/\s+/g, " ").trim() + " ";
}

const FORM_FACTOR_TITLE_RE =
  /(?<= )(e-atx|eatx|extended atx|micro-atx|micro atx|m-atx|matx|mini-itx|mini itx|mitx|mini-dtx|itx|atx)(?= )/g;

export function extractAttributes(product: RawCmsProduct): ExtractAttributesResult {
  const result: ExtractAttributesResult = {
    unmappedAttributes: [],
    unrecognizedValues: [],
  };

  const effectiveType = (product.componentType ?? product.categorySlug).trim().toLowerCase();

  const processLayer = (pairs: readonly KeyValuePair[] | undefined, source: AttributeSource): void => {
    if (pairs == null) {
      return;
    }
    for (const pair of pairs) {
      const norm = normalizeAttribute({
        source,
        rawName: pair.key,
        rawValue: pair.value,
        componentType: effectiveType,
      });

      if (!norm.matched) {
        if (!result.unmappedAttributes.includes(pair.key)) {
          result.unmappedAttributes.push(pair.key);
        }
      } else if (
        norm.textResult == null &&
        norm.numberResult == null &&
        norm.listResult == null
      ) {
        result.unrecognizedValues.push({
          attributeName: pair.key,
          rawValue: pair.value,
          reason: norm.rejectionReason,
        });
      } else if (norm.canonicalKey === "socket") {
        if (result.socket == null && norm.textResult != null) {
          result.socket = norm.textResult;
        }
      } else if (norm.canonicalKey === "ramType") {
        if (result.ramType == null && norm.textResult != null) {
          result.ramType = norm.textResult;
        }
      } else if (norm.canonicalKey === "formFactor") {
        if (result.formFactor == null && norm.textResult != null && isFormFactor(norm.textResult.value)) {
          result.formFactor = {
            value: norm.textResult.value,
            source: norm.textResult.source,
            confidence: norm.textResult.confidence,
          };
        }
      } else if (norm.canonicalKey === "storageInterface") {
        if (result.storageInterface == null && norm.textResult != null) {
          result.storageInterface = norm.textResult;
        }
      } else if (norm.canonicalKey === "wattage") {
        if (result.wattage == null && norm.numberResult != null) {
          result.wattage = norm.numberResult;
        }
      } else if (norm.canonicalKey === "tdp") {
        if (result.tdp == null && norm.numberResult != null) {
          result.tdp = norm.numberResult;
        }
      } else if (norm.canonicalKey === "lengthMm") {
        if (result.lengthMm == null && norm.numberResult != null) {
          result.lengthMm = norm.numberResult;
        }
      } else if (norm.canonicalKey === "maxGpuLengthMm") {
        if (result.maxGpuLengthMm == null && norm.numberResult != null) {
          result.maxGpuLengthMm = norm.numberResult;
        }
      } else if (norm.canonicalKey === "coolerSockets") {
        if (result.coolerSockets == null && norm.listResult != null) {
          result.coolerSockets = norm.listResult;
        }
      } else if (norm.canonicalKey === "storageInterfaces") {
        if (result.storageInterfaces == null && norm.listResult != null) {
          result.storageInterfaces = norm.listResult;
        }
      }
    }
  };

  // Precedence layers 1 to 4
  processLayer(product.skuOverrides, "override");
  processLayer(product.explicitAttributes, "explicit");
  processLayer(product.customFields, "explicit");
  processLayer(product.descriptionSpecs, "parsed");

  // Layer 5: title extraction (only for still-absent attributes, gated by effectiveType)
  const paddedTitle = buildPaddedTitle(product.title);
  const lowerTitle = product.title.toLowerCase();

  // socket: cpu or motherboard only (DEVIATION D5: never cooler)
  if (result.socket == null && (effectiveType === "cpu" || effectiveType === "motherboard")) {
    let rawSocket: string | undefined;
    if (paddedTitle.includes(" am5 ")) {
      rawSocket = "AM5";
    } else if (paddedTitle.includes(" am4 ")) {
      rawSocket = "AM4";
    } else if (paddedTitle.includes(" lga1700 ") || paddedTitle.includes(" lga 1700 ")) {
      rawSocket = "LGA1700";
    } else if (paddedTitle.includes(" lga1851 ") || paddedTitle.includes(" lga 1851 ")) {
      rawSocket = "LGA1851";
    } else if (paddedTitle.includes(" lga1200 ") || paddedTitle.includes(" lga 1200 ")) {
      rawSocket = "LGA1200";
    }
    if (rawSocket != null) {
      const norm = normalizeAttribute({
        source: "parsed",
        rawName: "socket",
        rawValue: rawSocket,
        componentType: effectiveType,
      });
      if (norm.textResult != null) {
        result.socket = norm.textResult;
      }
    }
  }

  // ramType: ram or motherboard, and title has no "gddr"
  if (
    result.ramType == null &&
    (effectiveType === "ram" || effectiveType === "motherboard") &&
    !lowerTitle.includes("gddr")
  ) {
    let rawRam: string | undefined;
    if (paddedTitle.includes(" ddr5 ")) {
      rawRam = "DDR5";
    } else if (paddedTitle.includes(" ddr4 ")) {
      rawRam = "DDR4";
    } else if (paddedTitle.includes(" ddr3 ")) {
      rawRam = "DDR3";
    }
    if (rawRam != null) {
      const norm = normalizeAttribute({
        source: "parsed",
        rawName: "ramType",
        rawValue: rawRam,
        componentType: effectiveType,
      });
      if (norm.textResult != null) {
        result.ramType = norm.textResult;
      }
    }
  }

  // formFactor: motherboard, case, psu (DEVIATION D2: largest for case, first for motherboard)
  if (
    result.formFactor == null &&
    (effectiveType === "motherboard" || effectiveType === "case" || effectiveType === "psu")
  ) {
    const matches = Array.from(paddedTitle.matchAll(FORM_FACTOR_TITLE_RE));
    let chosen: FormFactorAttribute | undefined;

    for (const match of matches) {
      const token = match[1];
      const norm = normalizeAttribute({
        source: "parsed",
        rawName: "formFactor",
        rawValue: token,
        componentType: effectiveType,
      });
      if (norm.textResult != null && isFormFactor(norm.textResult.value)) {
        const attr: FormFactorAttribute = {
          value: norm.textResult.value,
          source: norm.textResult.source,
          confidence: norm.textResult.confidence,
        };
        if (effectiveType === "case") {
          if (
            chosen == null ||
            FORM_FACTOR_SIZE_RANK[attr.value] > FORM_FACTOR_SIZE_RANK[chosen.value]
          ) {
            chosen = attr;
          }
        } else {
          chosen = attr;
          break;
        }
      }
    }

    if (chosen != null) {
      result.formFactor = chosen;
    }
  }

  // wattage: psu only (>= 3 digits immediately followed by w then boundary)
  if (result.wattage == null && effectiveType === "psu") {
    const wattMatch = / (\d{3,})w /.exec(paddedTitle);
    if (wattMatch != null) {
      const norm = normalizeAttribute({
        source: "parsed",
        rawName: "wattage",
        rawValue: `${wattMatch[1]}W`,
        componentType: effectiveType,
      });
      if (norm.numberResult != null) {
        result.wattage = norm.numberResult;
      }
    }
  }

  // storageInterface: storage only
  if (result.storageInterface == null && effectiveType === "storage") {
    let rawStorage: string | undefined;
    if (paddedTitle.includes(" nvme ") || paddedTitle.includes(" m.2 pcie ")) {
      rawStorage = "M.2 NVMe";
    } else if (paddedTitle.includes(" m.2 sata ") || paddedTitle.includes(" m2 sata ")) {
      rawStorage = "M.2 SATA";
    } else if (
      paddedTitle.includes(" sata iii ") ||
      paddedTitle.includes(" sata 3 ") ||
      paddedTitle.includes(" sata3 ")
    ) {
      rawStorage = "SATA III";
    }
    if (rawStorage != null) {
      const norm = normalizeAttribute({
        source: "parsed",
        rawName: "storageInterface",
        rawValue: rawStorage,
        componentType: effectiveType,
      });
      if (norm.textResult != null) {
        result.storageInterface = norm.textResult;
      }
    }
  }

  return result;
}
