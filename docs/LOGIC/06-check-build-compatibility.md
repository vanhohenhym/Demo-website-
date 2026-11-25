# 06 check_build_compatibility

**Inputs:** `cpu?, motherboard?, ram?, ramQuantity` (default 1), `gpu?, psu?, pcCase?, cooler?, storageItems: SlotItem[]` (default []), `verifiedRules: string[]` (default []).
**Outputs:** `checks: CompatibilityCheck[]`, `errorCount`, `warningCount`, `unverifiedCount` (all start empty / 0).

## Common rules for every check
- A check runs ONLY when all the parts it needs are selected. Otherwise no entry is added for that rule.
- `isVerified = verifiedRules.includes(ruleId)`. Every check carries `verified: isVerified`.
- **Missing data** (any needed attribute absent) -> `status "unknown"`, `confidence "low"`, and `unverifiedCount += 1` unless verified. Never an error.
- **Confidence / suffix:** if ANY attribute actually used by that rule has `source == "parsed"` -> `confidence "medium"` and the message ends with ` (based on detected data)`. Otherwise `confidence "high"`, no suffix. This is per attribute, per rule.
- `status "error"` -> `errorCount += 1`. `status "warning"` -> `warningCount += 1`.
- Checks are appended in the order below. Use `if / else if` (first match wins).

## Rules
### 1. `cpu_mobo_socket` (needs cpu, motherboard)
- cpu.socket or motherboard.socket absent -> unknown, "Missing CPU or motherboard socket data"
- equal (exact string) -> ok, "CPU and motherboard both use socket {s}{suffix}"
- else -> error, "CPU socket {a} does not match motherboard socket {b}{suffix}"

### 2. `ram_mobo_type` (needs ram, motherboard)
- ram.ramType or motherboard.ramType absent -> unknown, "Missing RAM or motherboard memory type data"
- equal -> ok, "Memory and motherboard both use {t}{suffix}"
- else -> error, "{ram} memory is incompatible with {mobo} motherboard{suffix}"

### 3. `mobo_case_formfactor` (needs motherboard, pcCase)
- motherboard.formFactor or pcCase.formFactor absent -> unknown, "Missing motherboard or case form factor data"
- Fit matrix (case -> boards that fit): EATX -> any; ATX -> ATX, mATX, Mini-ITX; mATX -> mATX, Mini-ITX; Mini-ITX -> Mini-ITX.
- fits -> ok, "{board} motherboard fits {case} case{suffix}"; else error, "{board} motherboard does not fit {case} case{suffix}"

### 4. `gpu_case_length` (needs gpu, pcCase)
- gpu.lengthMm or pcCase.maxGpuLengthMm absent -> unknown, "Missing GPU length or case clearance data"
- `clearance = case.maxGpuLengthMm - gpu.lengthMm`
- `< 0` -> error, "GPU length ({g}mm) exceeds case limit ({c}mm){suffix}"
- `0 to 10 inclusive` -> warning, "Tight GPU clearance: {clearance}mm remaining{suffix}"
- `> 10` -> ok, "GPU fits with {clearance}mm clearance{suffix}"

### 5. `psu_wattage` (needs psu AND cpu)
- psu.wattage or cpu.tdp absent -> unknown, "Missing PSU wattage or CPU TDP data"
- gpu selected but gpu.tdp absent -> unknown, "GPU power draw unknown" (never assume 0W)
- else: `ramCount = ram selected ? ramQuantity : 0`; `storageCount = sum of storageItems quantities`
  `estimated = cpu.tdp + (gpu ? gpu.tdp : 0) + 75 + (ramCount + storageCount) * 5`
  `recommended = round(estimated * 1.3, 0)`
  - `psu < estimated` -> error, "{psu}W PSU is below estimated {estimated}W draw{suffix}"
  - `psu < recommended` -> warning, "{psu}W PSU is below recommended {recommended}W (1.3x headroom){suffix}"
  - else ok, "{psu}W PSU meets recommended {recommended}W{suffix}"
- Parsed check uses psu.wattage, cpu.tdp and (if gpu) gpu.tdp.

### 6. `cooler_cpu_socket` (needs cooler, cpu)
- cooler.coolerSockets absent OR empty list OR cpu.socket absent -> unknown, "Missing cooler supported sockets or CPU socket data"
- list contains cpu.socket -> ok, "Cooler supports {socket} socket{suffix}"
- else error, "Cooler does not list support for {socket}{suffix}"

### 7. `storage_interface` (needs motherboard AND storageItems.length > 0)
- `missingMobo` = motherboard.storageInterfaces absent or empty. `missingDrive` = any drive's `storageInterface` absent.
- If motherboard data present: for each drive with an interface, if not in the motherboard list -> unsupported (remember it).
- **Priority: error > unknown > ok.**
  1. any unsupported drive -> error, "Storage interface {x} is not supported by motherboard{suffix}"
  2. missingMobo or missingDrive -> unknown, "Missing motherboard or storage drive interface data"
  3. else ok, "All storage interfaces are supported by the motherboard{suffix}"
- Parsed check: motherboard.storageInterfaces or any drive's storageInterface is parsed.

## Tests
`tests/pc-builder-compatibility-and-pricing.test.json` (17 cases; covers this and 07). Keep boundary tests: clearance 0 and 10 mm, PSU exactly at estimated (390W) and recommended (507W).
