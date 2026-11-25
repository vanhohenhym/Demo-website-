# 07 evaluate_pc_build

Prices a PC Builder configuration and runs compatibility checks.

**Inputs:** `cpu?, motherboard?, ram?, ramQuantity` (1 to 8, default 1), `gpu?, psu?, pcCase?, cooler?, storageItems: SlotItem[]` (default []), `extras: SlotItem[]` (monitor, keyboard, mouse, others; default []), `ignoreCompatibility` (default false), `verifiedRules` (default []).
**Outputs:** `totalPrice` (0), `itemCount` (0), `excludedItemIds` ([]), `checks` ([]), `errorCount`, `warningCount`, `unverifiedCount` (0).

## Pricing
Items: single slots (cpu, motherboard, gpu, psu, case, cooler; quantity 1), `storageItems` and `extras` (their `quantity`), and `ram` (quantity = `ramQuantity`).
For each selected item:
1. `itemCount += quantity` (excluded items still count).
2. If `availability == "out_of_stock"` OR `price` absent -> push `product.id` to `excludedItemIds`; not added to total.
3. Else `unit = (salePrice present AND salePrice < price) ? salePrice : price`; `totalPrice += unit * quantity`.
`preorder` and `upcoming` items ARE priced. Add a UI flag for them if wanted.

## Compatibility
If `ignoreCompatibility` is true: skip entirely (checks empty, all counts 0).
Otherwise call `check_build_compatibility(cpu, gpu, psu, ram, ramQuantity, cooler, pcCase, motherboard, storageItems, verifiedRules)` and copy `checks`, `errorCount`, `warningCount`, `unverifiedCount`.

## UI notes (from the master prompt)
- Show per slot: image, type, name, unit price, quantity, subtotal, change/remove.
- Show total, item count, excluded items ("out of stock / call for price"), error and warning counts, and "N unverified checks".
- Unknown checks show a "Could not verify" badge and an "I verified this manually" toggle that adds the ruleId to `verifiedRules`. It never blocks the build.

## Tests
`tests/pc-builder-compatibility-and-pricing.test.json`. Add: salePrice higher than price is ignored; RAM quantity 4 multiplies price; extras with quantity; excluded item still counts in itemCount.
