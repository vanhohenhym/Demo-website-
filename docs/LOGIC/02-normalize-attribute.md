# 02 normalize_attribute

Turns one raw CMS name/value pair into a canonical attribute. Never guesses: unrecognised values stay absent with a reason.

**Inputs:** `rawName`, `rawValue`, `categoryHint?` (legacy), `componentType?`, `source` (default `"explicit"`).
**Outputs:** `canonicalKey`, `matched` (default false), `rejectionReason` (default ""), and ONE of `textResult` / `numberResult` / `listResult` (others absent).

`effectiveType = lower(trim(componentType ?? categoryHint ?? ""))`.
`confidence = source == "parsed" ? "medium" : "high"` (explicit and override are high).

## Step 1: resolve alias
`cleanName` = rawName lowercased, keeping only `a-z0-9`. Look up (first match):

| cleanName | canonicalKey |
|---|---|
| socket, cpusocket, processorsocket, sockettype, pasocket | socket |
| supportedsockets, socketcompatibility, coolersocket, coolersockets | coolerSockets |
| ramtype, memorytype, ddr, supportedmemory, pamemorytype, memory | ramType |
| formfactor, sizefactor, boardformfactor, caseformfactor, paformfactor | formFactor |
| wattage, power, psu, outputpower, maxwattage, pawattage | wattage |
| tdp, thermaldesignpower, powerconsumption, patdp | tdp |
| maxgpulength, maxgpulengthmm, gpuclearance, maxvgaclearance | maxGpuLengthMm |
| lengthmm, gpulength, cardlength, length, palength | lengthMm |
| supportedinterfaces, storagesupport, storageinterfaces | storageInterfaces |
| storageinterface, interface, m2interface, satainterface, pastorageinterface | storageInterface |
| anything else | unmatched: `matched=false`, return |

Component-aware overrides (first match):
1. canonicalKey `lengthMm` and effectiveType `case` -> `maxGpuLengthMm`
2. cleanName `power` or `powerconsumption` and effectiveType `cpu` or `gpu` -> `tdp`
3. cleanName `powerconsumption` and effectiveType `psu` -> `wattage`

Then `matched=true`.

## Step 2: normalize the value
### socket (scalar)
Uppercase, keep `A-Z0-9+`, strip a leading `SOCKET`, look up in the **socket vocabulary** (exact). Not found -> reject `"Unrecognized socket value"`.

| cleaned | canonical |
|---|---|
| AM5 AM4 AM3+ LGA1700 LGA1851 LGA1200 LGA1151 LGA2066 LGA4677 TR5 SP3 SP5 FM2+ | same |
| LGA20113 | LGA2011-3 |
| STR5 | sTR5 |
| STRX4 | sTRX4 |
| STRX5 | sTRX5 |

### storageInterface (scalar) and storageInterfaces (list)
Lowercase, keep `a-z0-9`, look up in the **storage vocabulary** (exact):

| cleaned | canonical |
|---|---|
| m2nvme, m2pcie, pcie30m2nvme, pcie40m2nvme, pcie50m2nvme, nvme | M.2 NVMe |
| m2sata | M.2 SATA |
| sataiii, sata3, sata6gbs, sata | SATA III |

**DEVIATION D8:** if no exact match, apply keyword fallback (contains `nvme` -> M.2 NVMe; `m2sata` -> M.2 SATA; `sataiii`/`sata3`/`sata6` -> SATA III) before rejecting.
Unrecognised -> reject `"Unrecognized storage value"`.

### coolerSockets / storageInterfaces (lists)
Split rawValue on `,` `/` `;` `|` and the word ` and ` (case-insensitive). Trim, drop empties. Normalize each item with the socket vocab (coolerSockets) or storage vocab (storageInterfaces). Drop unrecognised items, remove duplicates (keep order). Result = list. If empty -> reject `"No recognized values in list"`. **DEVIATION D3** applies.

### ramType
Lowercase value. If it contains `gddr` -> reject `"GDDR graphics memory is not system RAM"`. Else first match in order: `lpddr5x`->LPDDR5X, `lpddr5`->LPDDR5, `lpddr4x`->LPDDR4X, `lpddr4`->LPDDR4, `ddr5`->DDR5, `ddr4`->DDR4, `ddr3`->DDR3. None -> reject `"Unrecognized RAM generation"`. (Note: `DDR4/DDR5` returns DDR5 by order.)

### formFactor
If value contains `(`, keep only the text before it. Lowercase, keep `a-z0-9`:

| cleaned | canonical |
|---|---|
| eatx, extendedatx | EATX |
| microatx, matx | mATX |
| miniitx, mitx, itx, minidtx | Mini-ITX |
| standardatx, atx | ATX |

None -> reject `"Unrecognized form factor"`.

### wattage / tdp (number)
Parse the leading number: digits and `.`; a comma after digits is a thousands separator and is skipped (**D4**: only if exactly 3 digits follow). Stop at the first other character. Unit = letters after optional spaces. If unit is `kw` multiply by 1000. Must be > 0 else reject `"Power must be greater than 0"`. Result = round(value, 0). No number -> reject `"No numeric value found"`.

### lengthMm / maxGpuLengthMm (number)
Same number parse. Unit rules (first match): `cm` -> x10; `in`, `inch`, `inches` (or a `"` mark right after the number) -> x25.4; `mm` or no unit with value >= 50 -> as is. **D4** adds the spelled-out units. Round to whole mm. Valid only if 50 <= value <= 600, else reject `"Dimension outside 50-600 mm range or missing unit"`. Only the unit adjacent to the first number counts: `320 mm (12.6 in)` -> 320; `12.6 in (32 cm)` -> 320.

## Tests
`tests/normalize-attribute.test.json` (23 cases). Add tests for D3, D4, D8.
