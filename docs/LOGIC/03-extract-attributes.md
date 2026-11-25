# 03 extract_attributes

Builds a product's normalized attributes from a `RawCmsProduct`. Uses `normalize_attribute` (see 02).

**Input:** `product: RawCmsProduct`
**Outputs:** `socket, ramType, formFactor, storageInterface` (TextAttribute), `wattage, tdp, lengthMm, maxGpuLengthMm` (NumberAttribute), `coolerSockets, storageInterfaces` (TextListAttribute), `unmappedAttributes: string[]`, `unrecognizedValues: UnrecognizedAttributeValue[]`. All attribute outputs start absent.

`effectiveType = lower(trim(product.componentType ?? product.categorySlug))`, passed as `componentType` to every `normalize_attribute` call.

## Precedence (first hit wins per output key)
1. **skuOverrides**, source `override` (always win)
2. **explicitAttributes**, source `explicit`
3. **customFields**, source `explicit`
4. **descriptionSpecs**, source `parsed`
5. **title extraction**, source `parsed` (medium confidence), gated by effectiveType

## Layers 1 to 4 (per pair, in order)
```
norm = normalize_attribute(source, rawName=pair.key, rawValue=pair.value, componentType=effectiveType)
if (!norm.matched)                       -> add pair.key to unmappedAttributes (no duplicates)
else if (no textResult/numberResult/listResult)
                                         -> add { attributeName: pair.key, rawValue: pair.value, reason: norm.rejectionReason } to unrecognizedValues
else assign by norm.canonicalKey only if that output is still absent:
  socket, ramType, formFactor, storageInterface <- textResult
  wattage, tdp, lengthMm, maxGpuLengthMm        <- numberResult
  coolerSockets, storageInterfaces              <- listResult
```

## Layer 5: title extraction
Build `paddedTitle`: lowercase title, keep `a-z0-9`, `-`, `.`; every other character becomes a space; add a space at both ends. Search for tokens as whole words (surrounded by spaces). **DEVIATION D1:** `-` and `.` also count as boundaries except inside `e-atx`, `micro-atx`, `mini-itx`, `mini-dtx`, `m.2` and decimal numbers.

Each hit is passed through `normalize_attribute(source="parsed", ...)` so the result is medium confidence.

| Output | Only when effectiveType is | Tokens (first match wins in this order) |
|---|---|---|
| socket | cpu, motherboard (**D5:** not cooler) | `am5`; `am4`; `lga1700` or `lga 1700`; `lga1851` or `lga 1851`; `lga1200` or `lga 1200` |
| ramType | ram, motherboard, and title has no `gddr` | `ddr5`; `ddr4`; `ddr3` |
| formFactor | motherboard, case, psu | `e-atx`/`eatx` -> EATX; `micro-atx`/`micro atx`/`m-atx`/`matx` -> mATX; `mini-itx`/`mini itx`/`mitx`/`itx`/`mini-dtx` -> Mini-ITX; `atx` -> ATX. **D2:** for case use the LARGEST size mentioned (EATX > ATX > mATX > Mini-ITX); for motherboard the first mentioned. |
| wattage | psu | a run of >= 3 digits immediately followed by `w` then a boundary, e.g. `850w`. First one wins. Value is normalized as `<digits>W`. |
| storageInterface | storage | `nvme` or `m.2 pcie` -> M.2 NVMe; `m.2 sata`/`m2 sata` -> M.2 SATA; `sata iii`/`sata 3`/`sata3` -> SATA III |

Title extraction runs only for outputs that are still absent after layers 1 to 4. Title extraction never produces tdp, lengthMm, maxGpuLengthMm, coolerSockets or storageInterfaces.

## Tests
`tests/extract-attributes.test.json` (14 cases). Add tests for D1 (`DDR5-6000`, `850W-Gold`), D2 (ATX tower that "supports mATX/ITX"), D5.
