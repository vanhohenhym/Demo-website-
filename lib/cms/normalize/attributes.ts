import {
  extractAttributes,
  normalizeAttribute,
  type NormalizeAttributeResult,
  type RawCmsProduct,
} from "../../logic/index.ts";
import { getOverridesForSku } from "../config-loader.ts";
import {
  BRAND_TAXONOMY_KEYS,
  COMPONENT_TYPE_ATTRIBUTE_KEYS,
} from "../field-map.ts";
import type {
  AttributeSource,
  ComponentType,
  KeyValuePair,
  ProductAttributes,
  RawAdapterProduct,
  SkuOverridesMap,
  UnrecognizedAttributeRecord,
} from "../types.ts";

export interface NormalizeProductAttributesOptions {
  overridesMap?: SkuOverridesMap;
  /** When true (default), logs each newly seen unmapped CMS attribute name once. */
  logUnmapped?: boolean;
  /** Optional custom logger used instead of `console.warn` for unmapped attributes. */
  logger?: (message: string) => void;
}

export interface AttributeNormalizationOutput {
  attributes: ProductAttributes;
  unmappedAttributes: Record<string, string>;
  unmappedAttributeNames: string[];
  unrecognizedAttributes: UnrecognizedAttributeRecord[];
  hasParsedAttributes: boolean;
  hasOverrideAttributes: boolean;
}

const loggedUnmappedNames = new Set<string>();

function isNonHardwareMetadataKey(key: string): boolean {
  const lower = key.trim().toLowerCase();
  if (BRAND_TAXONOMY_KEYS.includes(lower) || lower === "manufacturer") {
    return true;
  }
  const clean = lower.replace(/[^a-z0-9_-]/g, "");
  return COMPONENT_TYPE_ATTRIBUTE_KEYS.includes(clean);
}

function filterHardwarePairs(pairs: KeyValuePair[]): KeyValuePair[] {
  return pairs.filter((pair) => !isNonHardwareMetadataKey(pair.key));
}

function recordAndLogUnmapped(
  unmappedNames: string[],
  sku: string,
  options: NormalizeProductAttributesOptions
): void {
  const shouldLog = options.logUnmapped !== false;
  const logFn = options.logger ?? ((msg: string) => console.warn(msg));

  for (const attrName of unmappedNames) {
    const isNew = !loggedUnmappedNames.has(attrName);
    loggedUnmappedNames.add(attrName);

    if (shouldLog && (isNew || options.logger !== undefined)) {
      logFn(
        `[cms:attributes] Unmapped CMS attribute "${attrName}" on SKU "${sku}"`
      );
    }
  }
}

/**
 * Normalizes a single raw CMS attribute key/value pair via `lib/logic/normalizeAttribute`.
 */
export function normalizeSingleAttribute(
  rawName: string,
  rawValue: string,
  componentType?: ComponentType,
  source: AttributeSource = "explicit"
): NormalizeAttributeResult {
  return normalizeAttribute({
    rawName,
    rawValue,
    componentType,
    source,
  });
}

/**
 * Extracts and normalizes all hardware attributes for a raw CMS product via `lib/logic/extractAttributes`.
 * Applies per-SKU overrides from `data/overrides.json` and tracks/logs unmapped CMS attribute names.
 */
export function normalizeProductAttributes(
  raw: RawAdapterProduct,
  componentType: ComponentType,
  options: NormalizeProductAttributesOptions = {}
): AttributeNormalizationOutput {
  const skuOverrides = getOverridesForSku(raw.sku, options.overridesMap);
  const explicitHardware = filterHardwarePairs(raw.explicitAttributes);
  const customHardware = filterHardwarePairs(raw.customFields);
  const descriptionHardware = filterHardwarePairs(raw.descriptionSpecs ?? []);

  const logicInput: RawCmsProduct = {
    id: raw.id,
    title: raw.title,
    sku: raw.sku,
    categorySlug: raw.categorySlug,
    componentType,
    brandTaxonomy: raw.brandTaxonomy,
    explicitAttributes: explicitHardware,
    customFields: customHardware,
    descriptionSpecs: descriptionHardware,
    skuOverrides,
  };

  const extracted = extractAttributes(logicInput);
  const attributes: ProductAttributes = {};

  if (extracted.socket != null) {
    attributes.socket = { ...extracted.socket };
  }
  if (extracted.ramType != null) {
    attributes.ramType = { ...extracted.ramType };
  }
  if (extracted.formFactor != null) {
    attributes.formFactor = { ...extracted.formFactor };
  }
  if (extracted.storageInterface != null) {
    attributes.storageInterface = { ...extracted.storageInterface };
  }
  if (extracted.wattage != null) {
    attributes.wattage = { ...extracted.wattage };
  }
  if (extracted.tdp != null) {
    attributes.tdp = { ...extracted.tdp };
  }
  if (extracted.lengthMm != null) {
    attributes.lengthMm = { ...extracted.lengthMm };
  }
  if (extracted.maxGpuLengthMm != null) {
    attributes.maxGpuLengthMm = { ...extracted.maxGpuLengthMm };
  }
  if (extracted.coolerSockets != null) {
    attributes.coolerSockets = { ...extracted.coolerSockets };
  }
  if (extracted.storageInterfaces != null) {
    attributes.storageInterfaces = { ...extracted.storageInterfaces };
  }

  // Capture raw values for unmapped attributes across all input layers
  const allInputPairs = [
    ...skuOverrides,
    ...explicitHardware,
    ...customHardware,
    ...descriptionHardware,
  ];
  const rawValuesByKey = new Map<string, string>();
  for (const pair of allInputPairs) {
    if (!rawValuesByKey.has(pair.key)) {
      rawValuesByKey.set(pair.key, pair.value);
    }
  }

  const unmappedAttributes: Record<string, string> = {};
  for (const unmappedKey of extracted.unmappedAttributes) {
    unmappedAttributes[unmappedKey] = rawValuesByKey.get(unmappedKey) ?? "";
  }

  recordAndLogUnmapped(extracted.unmappedAttributes, raw.sku, options);

  let hasParsedAttributes = false;
  let hasOverrideAttributes = false;
  for (const attr of Object.values(attributes)) {
    if (!attr) continue;
    if (attr.source === "parsed") {
      hasParsedAttributes = true;
    } else if (attr.source === "override") {
      hasOverrideAttributes = true;
    }
  }

  const unrecognizedAttributes: UnrecognizedAttributeRecord[] =
    extracted.unrecognizedValues.map((item) => ({
      attributeName: item.attributeName,
      rawValue: item.rawValue,
      reason: item.reason,
    }));

  return {
    attributes,
    unmappedAttributes,
    unmappedAttributeNames: [...extracted.unmappedAttributes],
    unrecognizedAttributes,
    hasParsedAttributes,
    hasOverrideAttributes,
  };
}

/** Returns all unique unmapped CMS attribute names logged so far in this process. */
export function getLoggedUnmappedAttributes(): string[] {
  return Array.from(loggedUnmappedNames).sort((a, b) => a.localeCompare(b));
}

/** Clears the in-memory unmapped attribute log (useful in tests). */
export function clearUnmappedAttributeLog(): void {
  loggedUnmappedNames.clear();
}
