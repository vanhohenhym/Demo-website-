import type { CanonicalAttributeKey, FormFactor } from "./types.ts";

/**
 * Single editable vocabulary data file (Global Rule 8 in docs/LOGIC/README.md).
 * Contains attribute name aliases, socket, storage, form factor, RAM type,
 * and brand placeholder vocabularies.
 */

export const ATTRIBUTE_NAME_ALIASES: Readonly<Record<string, CanonicalAttributeKey>> = {
  // socket
  socket: "socket",
  cpusocket: "socket",
  processorsocket: "socket",
  sockettype: "socket",
  pasocket: "socket",

  // coolerSockets
  supportedsockets: "coolerSockets",
  socketcompatibility: "coolerSockets",
  coolersocket: "coolerSockets",
  coolersockets: "coolerSockets",

  // ramType
  ramtype: "ramType",
  memorytype: "ramType",
  ddr: "ramType",
  supportedmemory: "ramType",
  pamemorytype: "ramType",
  memory: "ramType",

  // formFactor
  formfactor: "formFactor",
  sizefactor: "formFactor",
  boardformfactor: "formFactor",
  caseformfactor: "formFactor",
  paformfactor: "formFactor",

  // wattage
  wattage: "wattage",
  power: "wattage",
  psu: "wattage",
  outputpower: "wattage",
  maxwattage: "wattage",
  pawattage: "wattage",

  // tdp
  tdp: "tdp",
  thermaldesignpower: "tdp",
  powerconsumption: "tdp",
  patdp: "tdp",

  // maxGpuLengthMm
  maxgpulength: "maxGpuLengthMm",
  maxgpulengthmm: "maxGpuLengthMm",
  gpuclearance: "maxGpuLengthMm",
  maxvgaclearance: "maxGpuLengthMm",

  // lengthMm
  lengthmm: "lengthMm",
  gpulength: "lengthMm",
  cardlength: "lengthMm",
  length: "lengthMm",
  palength: "lengthMm",

  // storageInterfaces
  supportedinterfaces: "storageInterfaces",
  storagesupport: "storageInterfaces",
  storageinterfaces: "storageInterfaces",

  // storageInterface
  storageinterface: "storageInterface",
  interface: "storageInterface",
  m2interface: "storageInterface",
  satainterface: "storageInterface",
  pastorageinterface: "storageInterface",
};

/**
 * Socket vocabulary: cleaned uppercase A-Z0-9+ (after stripping leading SOCKET) -> canonical socket.
 */
export const SOCKET_VOCABULARY: Readonly<Record<string, string>> = {
  AM5: "AM5",
  AM4: "AM4",
  "AM3+": "AM3+",
  LGA1700: "LGA1700",
  LGA1851: "LGA1851",
  LGA1200: "LGA1200",
  LGA1151: "LGA1151",
  LGA2066: "LGA2066",
  LGA4677: "LGA4677",
  TR5: "TR5",
  SP3: "SP3",
  SP5: "SP5",
  "FM2+": "FM2+",
  LGA20113: "LGA2011-3",
  STR5: "sTR5",
  STRX4: "sTRX4",
  STRX5: "sTRX5",
};

/**
 * Storage interface exact vocabulary: cleaned lowercase a-z0-9 -> canonical storage interface.
 */
export const STORAGE_VOCABULARY: Readonly<Record<string, string>> = {
  m2nvme: "M.2 NVMe",
  m2pcie: "M.2 NVMe",
  pcie30m2nvme: "M.2 NVMe",
  pcie40m2nvme: "M.2 NVMe",
  pcie50m2nvme: "M.2 NVMe",
  nvme: "M.2 NVMe",
  m2sata: "M.2 SATA",
  sataiii: "SATA III",
  sata3: "SATA III",
  sata6gbs: "SATA III",
  sata: "SATA III",
};

/**
 * DEVIATION D8 storage keyword fallbacks (checked in order on cleaned lowercase a-z0-9 text).
 */
export const STORAGE_KEYWORD_FALLBACKS: ReadonlyArray<{
  readonly keywords: readonly string[];
  readonly canonical: string;
}> = [
  { keywords: ["nvme"], canonical: "M.2 NVMe" },
  { keywords: ["m2sata"], canonical: "M.2 SATA" },
  { keywords: ["sataiii", "sata3", "sata6"], canonical: "SATA III" },
];

/**
 * Form factor vocabulary: cleaned lowercase a-z0-9 (before any "(") -> canonical FormFactor.
 */
export const FORM_FACTOR_VOCABULARY: Readonly<Record<string, FormFactor>> = {
  eatx: "EATX",
  extendedatx: "EATX",
  microatx: "mATX",
  matx: "mATX",
  miniitx: "Mini-ITX",
  mitx: "Mini-ITX",
  itx: "Mini-ITX",
  minidtx: "Mini-ITX",
  standardatx: "ATX",
  atx: "ATX",
};

/**
 * Relative form factor size rank (DEVIATION D2: EATX > ATX > mATX > Mini-ITX).
 */
export const FORM_FACTOR_SIZE_RANK: Readonly<Record<FormFactor, number>> = {
  EATX: 4,
  ATX: 3,
  mATX: 2,
  "Mini-ITX": 1,
};

/**
 * RAM type patterns checked in strict first-match-wins order on lowercased text.
 */
export const RAM_TYPE_PATTERNS: ReadonlyArray<readonly [string, string]> = [
  ["lpddr5x", "LPDDR5X"],
  ["lpddr5", "LPDDR5"],
  ["lpddr4x", "LPDDR4X"],
  ["lpddr4", "LPDDR4"],
  ["ddr5", "DDR5"],
  ["ddr4", "DDR4"],
  ["ddr3", "DDR3"],
];

/**
 * Placeholder brand strings ignored during brand resolution (04-resolve-brand.md).
 */
export const BRAND_PLACEHOLDERS: readonly string[] = [
  "n/a",
  "na",
  "generic",
  "oem",
  "no brand",
  "unknown",
];
