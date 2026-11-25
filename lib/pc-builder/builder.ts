import type { ComponentType, FormFactor, Product } from "../cms/types.ts";
import { toCatalogProduct } from "../cms/types.ts";
import { evaluatePcBuild } from "../logic/evaluate-pc-build.ts";
import type { CompatibilityCheck, SlotItem } from "../logic/types.ts";

export const PC_BUILDER_STORAGE_KEY = "pc_builder_state";
export const PREFILTER_MIN_COVERAGE_PERCENT = 60;

export type BuilderSlotId =
  | "cpu"
  | "cooler"
  | "motherboard"
  | "ram"
  | "storage"
  | "gpu"
  | "psu"
  | "case"
  | "monitor"
  | "keyboard"
  | "mouse"
  | "others";

export interface BuilderSlotDefinition {
  id: BuilderSlotId;
  componentType: ComponentType;
  categorySlug: string;
  label: string;
  required: boolean;
  notes: string;
  supportsQuantity: boolean;
  minQuantity: number;
  maxQuantity: number;
}

export const BUILDER_SLOTS: readonly BuilderSlotDefinition[] = [
  {
    id: "cpu",
    componentType: "cpu",
    categorySlug: "processor",
    label: "Processor (CPU)",
    required: true,
    notes: "Required core component; determines socket compatibility.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "cooler",
    componentType: "cooler",
    categorySlug: "cpu-cooler",
    label: "CPU Cooler",
    required: false,
    notes: "Optional if your processor includes a stock cooler.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "motherboard",
    componentType: "motherboard",
    categorySlug: "motherboard",
    label: "Motherboard",
    required: true,
    notes: "Required; must match CPU socket, RAM type, and case form factor.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "ram",
    componentType: "ram",
    categorySlug: "ram",
    label: "Memory (RAM)",
    required: true,
    notes: "Required; supports up to 8 modules.",
    supportsQuantity: true,
    minQuantity: 1,
    maxQuantity: 8,
  },
  {
    id: "storage",
    componentType: "storage",
    categorySlug: "storage",
    label: "Storage (SSD / HDD)",
    required: true,
    notes: "Required; supports up to 4 drives.",
    supportsQuantity: true,
    minQuantity: 1,
    maxQuantity: 4,
  },
  {
    id: "gpu",
    componentType: "gpu",
    categorySlug: "graphics-card",
    label: "Graphics Card (GPU)",
    required: false,
    notes: "Optional if CPU has integrated graphics; required for display otherwise.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "psu",
    componentType: "psu",
    categorySlug: "power-supply",
    label: "Power Supply (PSU)",
    required: true,
    notes: "Required; wattage should cover estimated draw with 1.3x headroom.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "case",
    componentType: "case",
    categorySlug: "casing",
    label: "Casing",
    required: true,
    notes: "Required; must fit motherboard form factor and GPU length.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "monitor",
    componentType: "monitor",
    categorySlug: "monitor",
    label: "Monitor",
    required: false,
    notes: "Optional display peripheral; supports up to 4.",
    supportsQuantity: true,
    minQuantity: 1,
    maxQuantity: 4,
  },
  {
    id: "keyboard",
    componentType: "keyboard",
    categorySlug: "keyboard",
    label: "Keyboard",
    required: false,
    notes: "Optional input peripheral.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "mouse",
    componentType: "mouse",
    categorySlug: "mouse",
    label: "Mouse",
    required: false,
    notes: "Optional input peripheral.",
    supportsQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
  },
  {
    id: "others",
    componentType: "other",
    categorySlug: "accessories",
    label: "Additional Accessories",
    required: false,
    notes: "Optional cables, thermal paste, fans, or accessories; up to 4.",
    supportsQuantity: true,
    minQuantity: 1,
    maxQuantity: 4,
  },
];

const SLOT_BY_ID: ReadonlyMap<BuilderSlotId, BuilderSlotDefinition> = new Map(
  BUILDER_SLOTS.map((slot) => [slot.id, slot])
);

const EXTRA_SLOT_IDS: readonly BuilderSlotId[] = [
  "monitor",
  "keyboard",
  "mouse",
  "others",
];

const COMPATIBLE_CASE_FORM_FACTORS: Readonly<Record<FormFactor, readonly FormFactor[]>> = {
  EATX: ["EATX"],
  ATX: ["EATX", "ATX"],
  mATX: ["EATX", "ATX", "mATX"],
  "Mini-ITX": ["EATX", "ATX", "mATX", "Mini-ITX"],
};

export interface PcBuilderState {
  items: Partial<Record<BuilderSlotId, Product>>;
  quantities: Partial<Record<BuilderSlotId, number>>;
  verifiedRules: string[];
  ignoreCompatibility: boolean;
}

export interface BuilderSlotEvaluation {
  slotId: BuilderSlotId;
  product: Product;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  isExcluded: boolean;
}

export interface BuilderEvaluationResult {
  totalPrice: number;
  itemCount: number;
  excludedItemIds: string[];
  checks: CompatibilityCheck[];
  errorCount: number;
  warningCount: number;
  unverifiedCount: number;
  estimatedWattage?: number;
  slots: Partial<Record<BuilderSlotId, BuilderSlotEvaluation>>;
}

export interface DecodedShareSlot {
  slug: string;
  quantity: number;
}

export interface DecodedShareState {
  slots: Partial<Record<BuilderSlotId, DecodedShareSlot>>;
  verifiedRules: string[];
  ignoreCompatibility: boolean;
}

interface SharePayload {
  s: Partial<Record<BuilderSlotId, { slug: string; qty?: number }>>;
  v?: string[];
  i?: boolean;
}

export function isBuilderSlotId(value: string): value is BuilderSlotId {
  return SLOT_BY_ID.has(value as BuilderSlotId);
}

export function getBuilderSlot(slotId: BuilderSlotId): BuilderSlotDefinition | undefined {
  return SLOT_BY_ID.get(slotId);
}

export function createEmptyBuilderState(): PcBuilderState {
  return {
    items: {},
    quantities: {},
    verifiedRules: [],
    ignoreCompatibility: false,
  };
}

function clampQuantity(slotId: BuilderSlotId, quantity: number | undefined): number {
  const def = SLOT_BY_ID.get(slotId);
  if (!def || !def.supportsQuantity) {
    return 1;
  }
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return def.minQuantity;
  }
  const rounded = Math.floor(quantity);
  return Math.max(def.minQuantity, Math.min(def.maxQuantity, rounded));
}

export function getSlotQuantity(state: PcBuilderState, slotId: BuilderSlotId): number {
  return clampQuantity(slotId, state.quantities[slotId]);
}

export function setBuilderItem(
  state: PcBuilderState,
  slotId: BuilderSlotId,
  product: Product,
  quantity?: number
): PcBuilderState {
  const def = SLOT_BY_ID.get(slotId);
  const nextItems: Partial<Record<BuilderSlotId, Product>> = {
    ...state.items,
    [slotId]: product,
  };
  const nextQuantities: Partial<Record<BuilderSlotId, number>> = {
    ...state.quantities,
  };
  if (def?.supportsQuantity) {
    nextQuantities[slotId] = clampQuantity(
      slotId,
      quantity ?? state.quantities[slotId] ?? 1
    );
  } else {
    delete nextQuantities[slotId];
  }
  return {
    ...state,
    items: nextItems,
    quantities: nextQuantities,
  };
}

export function removeBuilderItem(
  state: PcBuilderState,
  slotId: BuilderSlotId
): PcBuilderState {
  const nextItems: Partial<Record<BuilderSlotId, Product>> = { ...state.items };
  const nextQuantities: Partial<Record<BuilderSlotId, number>> = {
    ...state.quantities,
  };
  delete nextItems[slotId];
  delete nextQuantities[slotId];
  return {
    ...state,
    items: nextItems,
    quantities: nextQuantities,
  };
}

export function setBuilderQuantity(
  state: PcBuilderState,
  slotId: BuilderSlotId,
  quantity: number
): PcBuilderState {
  const def = SLOT_BY_ID.get(slotId);
  if (!def || !def.supportsQuantity) {
    return state;
  }
  return {
    ...state,
    quantities: {
      ...state.quantities,
      [slotId]: clampQuantity(slotId, quantity),
    },
  };
}

export function toggleVerifiedRule(
  state: PcBuilderState,
  ruleId: string
): PcBuilderState {
  const exists = state.verifiedRules.includes(ruleId);
  return {
    ...state,
    verifiedRules: exists
      ? state.verifiedRules.filter((id) => id !== ruleId)
      : [...state.verifiedRules, ruleId],
  };
}

export function setIgnoreCompatibility(
  state: PcBuilderState,
  ignore: boolean
): PcBuilderState {
  return {
    ...state,
    ignoreCompatibility: ignore,
  };
}

function getProductUnitPrice(product: Product): number | undefined {
  if (product.availability === "out_of_stock" || product.price == null) {
    return undefined;
  }
  if (product.salePrice != null && product.salePrice < product.price) {
    return product.salePrice;
  }
  return product.price;
}

/**
 * Evaluates pricing, per-slot subtotals, estimated wattage, and compatibility
 * for the current PC Builder state via `lib/logic/evaluate-pc-build.ts`.
 */
export function evaluateBuilderState(state: PcBuilderState): BuilderEvaluationResult {
  const { items } = state;

  const storageItems: SlotItem[] = items.storage
    ? [
        {
          product: toCatalogProduct(items.storage, true),
          quantity: getSlotQuantity(state, "storage"),
        },
      ]
    : [];

  const extras: SlotItem[] = [];
  for (const extraId of EXTRA_SLOT_IDS) {
    const prod = items[extraId];
    if (prod) {
      extras.push({
        product: toCatalogProduct(prod, true),
        quantity: getSlotQuantity(state, extraId),
      });
    }
  }

  const logicResult = evaluatePcBuild({
    cpu: items.cpu ? toCatalogProduct(items.cpu, true) : undefined,
    motherboard: items.motherboard
      ? toCatalogProduct(items.motherboard, true)
      : undefined,
    ram: items.ram ? toCatalogProduct(items.ram, true) : undefined,
    ramQuantity: items.ram ? getSlotQuantity(state, "ram") : 1,
    gpu: items.gpu ? toCatalogProduct(items.gpu, true) : undefined,
    psu: items.psu ? toCatalogProduct(items.psu, true) : undefined,
    pcCase: items.case ? toCatalogProduct(items.case, true) : undefined,
    cooler: items.cooler ? toCatalogProduct(items.cooler, true) : undefined,
    storageItems,
    extras,
    ignoreCompatibility: state.ignoreCompatibility,
    verifiedRules: state.verifiedRules,
  });

  const slots: Partial<Record<BuilderSlotId, BuilderSlotEvaluation>> = {};
  for (const def of BUILDER_SLOTS) {
    const product = items[def.id];
    if (!product) {
      continue;
    }
    const quantity = getSlotQuantity(state, def.id);
    const unitPrice = getProductUnitPrice(product);
    const isExcluded = unitPrice === undefined;
    slots[def.id] = {
      slotId: def.id,
      product,
      quantity,
      unitPrice,
      subtotal: isExcluded ? undefined : unitPrice * quantity,
      isExcluded,
    };
  }

  let estimatedWattage: number | undefined;
  const cpuTdp = items.cpu?.attributes.tdp?.value;
  const gpuSelected = items.gpu !== undefined;
  const gpuTdp = items.gpu?.attributes.tdp?.value;

  if (cpuTdp !== undefined && (!gpuSelected || gpuTdp !== undefined)) {
    const ramQty = items.ram ? getSlotQuantity(state, "ram") : 0;
    const storageQty = items.storage ? getSlotQuantity(state, "storage") : 0;
    estimatedWattage =
      cpuTdp + (gpuTdp ?? 0) + 75 + (ramQty + storageQty) * 5;
  }

  return {
    ...logicResult,
    estimatedWattage,
    slots,
  };
}

/**
 * Builds the catalog picker URL for a builder slot.
 * Appends compatibility pre-filter query params only when compatibility is
 * enabled AND category attribute coverage meets the 60% threshold.
 */
export function getChooseHref(
  slotDef: BuilderSlotDefinition,
  state: PcBuilderState,
  slotCoveragePercent: number
): string {
  const params = new URLSearchParams();
  params.set("builder", "1");
  params.set("slot", slotDef.id);

  if (
    !state.ignoreCompatibility &&
    slotCoveragePercent >= PREFILTER_MIN_COVERAGE_PERCENT
  ) {
    const { items } = state;
    let hasPrefilterParam = false;

    const addParam = (key: string, value: string | undefined) => {
      if (value) {
        params.set(key, value);
        hasPrefilterParam = true;
      }
    };

    if (slotDef.id === "cpu") {
      addParam("socket", items.motherboard?.attributes.socket?.value);
    } else if (slotDef.id === "motherboard") {
      addParam("socket", items.cpu?.attributes.socket?.value);
      addParam("ramType", items.ram?.attributes.ramType?.value);
      addParam("storageInterface", items.storage?.attributes.storageInterface?.value);
    } else if (slotDef.id === "ram") {
      addParam("ramType", items.motherboard?.attributes.ramType?.value);
    } else if (slotDef.id === "cooler") {
      addParam("socket", items.cpu?.attributes.socket?.value);
    } else if (slotDef.id === "storage") {
      const moboInterfaces = items.motherboard?.attributes.storageInterfaces?.value;
      if (moboInterfaces && moboInterfaces.length > 0) {
        addParam("storageInterface", moboInterfaces.join(","));
      }
    } else if (slotDef.id === "case") {
      const moboFf = items.motherboard?.attributes.formFactor?.value;
      if (moboFf && moboFf in COMPATIBLE_CASE_FORM_FACTORS) {
        addParam("formFactor", COMPATIBLE_CASE_FORM_FACTORS[moboFf].join(","));
      }
    }

    if (hasPrefilterParam) {
      params.set("prefilter", "1");
    }
  }

  return `/category/${slotDef.categorySlug}?${params.toString()}`;
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string | null {
  if (!encoded || !/^[A-Za-z0-9\-_]+$/.test(encoded)) {
    return null;
  }
  try {
    const padded =
      encoded.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (encoded.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeShareState(state: PcBuilderState): string {
  const s: SharePayload["s"] = {};
  for (const def of BUILDER_SLOTS) {
    const product = state.items[def.id];
    if (!product) {
      continue;
    }
    const qty = getSlotQuantity(state, def.id);
    s[def.id] = qty > 1 ? { slug: product.slug, qty } : { slug: product.slug };
  }

  const payload: SharePayload = { s };
  if (state.verifiedRules.length > 0) {
    payload.v = [...state.verifiedRules];
  }
  if (state.ignoreCompatibility) {
    payload.i = true;
  }

  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareState(encoded: string): DecodedShareState | null {
  const json = fromBase64Url(encoded.trim());
  if (!json) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
      typeof record.s !== "object" ||
      record.s === null ||
      Array.isArray(record.s)
    ) {
      return null;
    }

    const slots: Partial<Record<BuilderSlotId, DecodedShareSlot>> = {};
    for (const [key, val] of Object.entries(
      record.s as Record<string, unknown>
    )) {
      if (!isBuilderSlotId(key)) {
        continue;
      }
      if (typeof val !== "object" || val === null || Array.isArray(val)) {
        continue;
      }
      const entry = val as Record<string, unknown>;
      if (typeof entry.slug !== "string" || entry.slug.trim().length === 0) {
        continue;
      }
      const qty =
        typeof entry.qty === "number"
          ? clampQuantity(key, entry.qty)
          : 1;
      slots[key] = { slug: entry.slug.trim(), quantity: qty };
    }

    const verifiedRules = Array.isArray(record.v)
      ? record.v.filter((item): item is string => typeof item === "string")
      : [];

    const ignoreCompatibility = record.i === true;

    return {
      slots,
      verifiedRules,
      ignoreCompatibility,
    };
  } catch {
    return null;
  }
}

function isProductLike(value: unknown): value is Product {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.slug === "string" &&
    typeof obj.name === "string" &&
    typeof obj.componentType === "string"
  );
}

/**
 * Safely parses serialized `PcBuilderState` from localStorage,
 * recovering with an empty state on corrupt or malformed input.
 */
export function parseBuilderStorage(raw: string | null | undefined): PcBuilderState {
  if (!raw || typeof raw !== "string") {
    return createEmptyBuilderState();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return createEmptyBuilderState();
    }

    const record = parsed as Record<string, unknown>;
    const items: Partial<Record<BuilderSlotId, Product>> = {};
    const quantities: Partial<Record<BuilderSlotId, number>> = {};

    if (
      typeof record.items === "object" &&
      record.items !== null &&
      !Array.isArray(record.items)
    ) {
      for (const [key, val] of Object.entries(
        record.items as Record<string, unknown>
      )) {
        if (isBuilderSlotId(key) && isProductLike(val)) {
          items[key] = val;
        }
      }
    }

    if (
      typeof record.quantities === "object" &&
      record.quantities !== null &&
      !Array.isArray(record.quantities)
    ) {
      for (const [key, val] of Object.entries(
        record.quantities as Record<string, unknown>
      )) {
        if (!isBuilderSlotId(key)) {
          continue;
        }
        const def = SLOT_BY_ID.get(key);
        if (def?.supportsQuantity && typeof val === "number") {
          quantities[key] = clampQuantity(key, val);
        }
      }
    }

    const verifiedRules = Array.isArray(record.verifiedRules)
      ? record.verifiedRules.filter((item): item is string => typeof item === "string")
      : [];

    const ignoreCompatibility = record.ignoreCompatibility === true;

    return {
      items,
      quantities,
      verifiedRules,
      ignoreCompatibility,
    };
  } catch {
    return createEmptyBuilderState();
  }
}
