import { roundHalfAwayFromZero } from "./round.ts";
import type {
  AttributeConfidence,
  AttributeSource,
  CheckBuildCompatibilityInput,
  CheckBuildCompatibilityResult,
  CompatibilityCheck,
  CompatibilityStatus,
  FormFactor,
} from "./types.ts";

const DETECTED_SUFFIX = " (based on detected data)";

const CASE_FORM_FACTOR_FITS: Readonly<Record<FormFactor, readonly FormFactor[]>> = {
  EATX: ["EATX", "ATX", "mATX", "Mini-ITX"],
  ATX: ["ATX", "mATX", "Mini-ITX"],
  mATX: ["mATX", "Mini-ITX"],
  "Mini-ITX": ["Mini-ITX"],
};

function hasParsedSource(sources: ReadonlyArray<AttributeSource | undefined>): boolean {
  for (const src of sources) {
    if (src === "parsed") {
      return true;
    }
  }
  return false;
}

export function checkBuildCompatibility(
  input: CheckBuildCompatibilityInput,
): CheckBuildCompatibilityResult {
  const {
    cpu,
    motherboard,
    ram,
    ramQuantity = 1,
    gpu,
    psu,
    pcCase,
    cooler,
    storageItems = [],
    verifiedRules = [],
  } = input;

  const checks: CompatibilityCheck[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let unverifiedCount = 0;

  const addCheck = (
    ruleId: string,
    status: CompatibilityStatus,
    message: string,
    confidence: AttributeConfidence,
  ): void => {
    const verified = verifiedRules.includes(ruleId);
    if (status === "error") {
      errorCount += 1;
    } else if (status === "warning") {
      warningCount += 1;
    } else if (status === "unknown" && !verified) {
      unverifiedCount += 1;
    }
    checks.push({
      ruleId,
      status,
      message,
      confidence,
      verified,
    });
  };

  // 1. cpu_mobo_socket (needs cpu, motherboard)
  if (cpu != null && motherboard != null) {
    if (cpu.socket == null || motherboard.socket == null) {
      addCheck(
        "cpu_mobo_socket",
        "unknown",
        "Missing CPU or motherboard socket data",
        "low",
      );
    } else {
      const parsed = hasParsedSource([cpu.socket.source, motherboard.socket.source]);
      const confidence: AttributeConfidence = parsed ? "medium" : "high";
      const suffix = parsed ? DETECTED_SUFFIX : "";
      if (cpu.socket.value === motherboard.socket.value) {
        addCheck(
          "cpu_mobo_socket",
          "ok",
          `CPU and motherboard both use socket ${cpu.socket.value}${suffix}`,
          confidence,
        );
      } else {
        addCheck(
          "cpu_mobo_socket",
          "error",
          `CPU socket ${cpu.socket.value} does not match motherboard socket ${motherboard.socket.value}${suffix}`,
          confidence,
        );
      }
    }
  }

  // 2. ram_mobo_type (needs ram, motherboard)
  if (ram != null && motherboard != null) {
    if (ram.ramType == null || motherboard.ramType == null) {
      addCheck(
        "ram_mobo_type",
        "unknown",
        "Missing RAM or motherboard memory type data",
        "low",
      );
    } else {
      const parsed = hasParsedSource([ram.ramType.source, motherboard.ramType.source]);
      const confidence: AttributeConfidence = parsed ? "medium" : "high";
      const suffix = parsed ? DETECTED_SUFFIX : "";
      if (ram.ramType.value === motherboard.ramType.value) {
        addCheck(
          "ram_mobo_type",
          "ok",
          `Memory and motherboard both use ${ram.ramType.value}${suffix}`,
          confidence,
        );
      } else {
        addCheck(
          "ram_mobo_type",
          "error",
          `${ram.ramType.value} memory is incompatible with ${motherboard.ramType.value} motherboard${suffix}`,
          confidence,
        );
      }
    }
  }

  // 3. mobo_case_formfactor (needs motherboard, pcCase)
  if (motherboard != null && pcCase != null) {
    if (motherboard.formFactor == null || pcCase.formFactor == null) {
      addCheck(
        "mobo_case_formfactor",
        "unknown",
        "Missing motherboard or case form factor data",
        "low",
      );
    } else {
      const parsed = hasParsedSource([
        motherboard.formFactor.source,
        pcCase.formFactor.source,
      ]);
      const confidence: AttributeConfidence = parsed ? "medium" : "high";
      const suffix = parsed ? DETECTED_SUFFIX : "";
      const boardFF = motherboard.formFactor.value;
      const caseFF = pcCase.formFactor.value;
      const fits = CASE_FORM_FACTOR_FITS[caseFF].includes(boardFF);
      if (fits) {
        addCheck(
          "mobo_case_formfactor",
          "ok",
          `${boardFF} motherboard fits ${caseFF} case${suffix}`,
          confidence,
        );
      } else {
        addCheck(
          "mobo_case_formfactor",
          "error",
          `${boardFF} motherboard does not fit ${caseFF} case${suffix}`,
          confidence,
        );
      }
    }
  }

  // 4. gpu_case_length (needs gpu, pcCase)
  if (gpu != null && pcCase != null) {
    if (gpu.lengthMm == null || pcCase.maxGpuLengthMm == null) {
      addCheck(
        "gpu_case_length",
        "unknown",
        "Missing GPU length or case clearance data",
        "low",
      );
    } else {
      const parsed = hasParsedSource([
        gpu.lengthMm.source,
        pcCase.maxGpuLengthMm.source,
      ]);
      const confidence: AttributeConfidence = parsed ? "medium" : "high";
      const suffix = parsed ? DETECTED_SUFFIX : "";
      const gpuLen = gpu.lengthMm.value;
      const caseMax = pcCase.maxGpuLengthMm.value;
      const clearance = caseMax - gpuLen;

      if (clearance < 0) {
        addCheck(
          "gpu_case_length",
          "error",
          `GPU length (${gpuLen}mm) exceeds case limit (${caseMax}mm)${suffix}`,
          confidence,
        );
      } else if (clearance <= 10) {
        addCheck(
          "gpu_case_length",
          "warning",
          `Tight GPU clearance: ${clearance}mm remaining${suffix}`,
          confidence,
        );
      } else {
        addCheck(
          "gpu_case_length",
          "ok",
          `GPU fits with ${clearance}mm clearance${suffix}`,
          confidence,
        );
      }
    }
  }

  // 5. psu_wattage (needs psu AND cpu)
  if (psu != null && cpu != null) {
    if (psu.wattage == null || cpu.tdp == null) {
      addCheck(
        "psu_wattage",
        "unknown",
        "Missing PSU wattage or CPU TDP data",
        "low",
      );
    } else if (gpu != null && gpu.tdp == null) {
      addCheck("psu_wattage", "unknown", "GPU power draw unknown", "low");
    } else {
      const parsed = hasParsedSource([
        psu.wattage.source,
        cpu.tdp.source,
        gpu?.tdp?.source,
      ]);
      const confidence: AttributeConfidence = parsed ? "medium" : "high";
      const suffix = parsed ? DETECTED_SUFFIX : "";

      const ramCount = ram != null ? ramQuantity : 0;
      const storageCount = storageItems.reduce(
        (sum, item) => sum + (item.quantity ?? 1),
        0,
      );
      const gpuTdp = gpu != null && gpu.tdp != null ? gpu.tdp.value : 0;
      const estimated = cpu.tdp.value + gpuTdp + 75 + (ramCount + storageCount) * 5;
      const recommended = roundHalfAwayFromZero(estimated * 1.3);
      const psuW = psu.wattage.value;

      if (psuW < estimated) {
        addCheck(
          "psu_wattage",
          "error",
          `${psuW}W PSU is below estimated ${estimated}W draw${suffix}`,
          confidence,
        );
      } else if (psuW < recommended) {
        addCheck(
          "psu_wattage",
          "warning",
          `${psuW}W PSU is below recommended ${recommended}W (1.3x headroom)${suffix}`,
          confidence,
        );
      } else {
        addCheck(
          "psu_wattage",
          "ok",
          `${psuW}W PSU meets recommended ${recommended}W${suffix}`,
          confidence,
        );
      }
    }
  }

  // 6. cooler_cpu_socket (needs cooler, cpu)
  if (cooler != null && cpu != null) {
    if (
      cooler.coolerSockets == null ||
      cooler.coolerSockets.value.length === 0 ||
      cpu.socket == null
    ) {
      addCheck(
        "cooler_cpu_socket",
        "unknown",
        "Missing cooler supported sockets or CPU socket data",
        "low",
      );
    } else {
      const parsed = hasParsedSource([cooler.coolerSockets.source, cpu.socket.source]);
      const confidence: AttributeConfidence = parsed ? "medium" : "high";
      const suffix = parsed ? DETECTED_SUFFIX : "";
      if (cooler.coolerSockets.value.includes(cpu.socket.value)) {
        addCheck(
          "cooler_cpu_socket",
          "ok",
          `Cooler supports ${cpu.socket.value} socket${suffix}`,
          confidence,
        );
      } else {
        addCheck(
          "cooler_cpu_socket",
          "error",
          `Cooler does not list support for ${cpu.socket.value}${suffix}`,
          confidence,
        );
      }
    }
  }

  // 7. storage_interface (needs motherboard AND storageItems.length > 0)
  if (motherboard != null && storageItems.length > 0) {
    const missingMobo =
      motherboard.storageInterfaces == null ||
      motherboard.storageInterfaces.value.length === 0;
    const missingDrive = storageItems.some((item) => item.product.storageInterface == null);

    let unsupportedInterface: string | undefined;
    if (!missingMobo && motherboard.storageInterfaces != null) {
      for (const item of storageItems) {
        const driveIf = item.product.storageInterface;
        if (
          driveIf != null &&
          !motherboard.storageInterfaces.value.includes(driveIf.value)
        ) {
          unsupportedInterface = driveIf.value;
          break;
        }
      }
    }

    const parsed = hasParsedSource([
      motherboard.storageInterfaces?.source,
      ...storageItems.map((item) => item.product.storageInterface?.source),
    ]);
    const confidence: AttributeConfidence = parsed ? "medium" : "high";
    const suffix = parsed ? DETECTED_SUFFIX : "";

    // Priority: error > unknown > ok
    if (unsupportedInterface != null) {
      addCheck(
        "storage_interface",
        "error",
        `Storage interface ${unsupportedInterface} is not supported by motherboard${suffix}`,
        confidence,
      );
    } else if (missingMobo || missingDrive) {
      addCheck(
        "storage_interface",
        "unknown",
        "Missing motherboard or storage drive interface data",
        "low",
      );
    } else {
      addCheck(
        "storage_interface",
        "ok",
        `All storage interfaces are supported by the motherboard${suffix}`,
        confidence,
      );
    }
  }

  return {
    checks,
    errorCount,
    warningCount,
    unverifiedCount,
  };
}
