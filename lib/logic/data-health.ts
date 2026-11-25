import { roundHalfAwayFromZero } from "./round.ts";
import type {
  AttributeCoverage,
  CatalogDataHealthReportResult,
  CatalogProduct,
  EvaluateCategoryHealthResult,
  HealthStatus,
} from "./types.ts";

type RequiredAttrKey =
  | "socket"
  | "ramType"
  | "formFactor"
  | "storageInterfaces"
  | "tdp"
  | "lengthMm"
  | "maxGpuLengthMm"
  | "wattage"
  | "coolerSockets"
  | "storageInterface";

interface CategoryHealthSpec {
  componentType: string;
  requiredAttributes: readonly RequiredAttrKey[];
}

export const AUDITED_HEALTH_CATEGORY_SLUGS: readonly string[] = [
  "motherboard",
  "cpu",
  "gpu",
  "psu",
  "case",
  "cooler",
  "storage",
];

function getCategoryHealthSpec(categorySlug: string): CategoryHealthSpec {
  if (categorySlug === "motherboard") {
    return {
      componentType: "Motherboard",
      requiredAttributes: ["socket", "ramType", "formFactor", "storageInterfaces"],
    };
  } else if (categorySlug === "cpu") {
    return {
      componentType: "CPU",
      requiredAttributes: ["socket", "tdp"],
    };
  } else if (categorySlug === "gpu") {
    return {
      componentType: "GPU",
      requiredAttributes: ["lengthMm", "tdp"],
    };
  } else if (categorySlug === "case") {
    return {
      componentType: "Case",
      requiredAttributes: ["formFactor", "maxGpuLengthMm"],
    };
  } else if (categorySlug === "psu") {
    return {
      componentType: "PSU",
      requiredAttributes: ["wattage"],
    };
  } else if (categorySlug === "cooler") {
    return {
      componentType: "CPU Cooler",
      requiredAttributes: ["coolerSockets"],
    };
  } else if (categorySlug === "storage") {
    return {
      componentType: "Storage",
      requiredAttributes: ["storageInterface"],
    };
  } else if (categorySlug === "ram") {
    return { componentType: "RAM", requiredAttributes: [] };
  } else if (categorySlug === "monitor") {
    return { componentType: "Monitor", requiredAttributes: [] };
  } else if (categorySlug === "keyboard") {
    return { componentType: "Keyboard", requiredAttributes: [] };
  } else if (categorySlug === "mouse") {
    return { componentType: "Mouse", requiredAttributes: [] };
  } else {
    return { componentType: "Other", requiredAttributes: [] };
  }
}

function hasAnyParsedAttribute(product: CatalogProduct): boolean {
  const attrs = [
    product.socket,
    product.ramType,
    product.formFactor,
    product.wattage,
    product.tdp,
    product.lengthMm,
    product.maxGpuLengthMm,
    product.coolerSockets,
    product.storageInterface,
    product.storageInterfaces,
  ];
  for (const attr of attrs) {
    if (attr != null && attr.source === "parsed") {
      return true;
    }
  }
  return false;
}

function isRequiredAttributePresent(
  product: CatalogProduct,
  attrName: RequiredAttrKey,
): boolean {
  if (attrName === "coolerSockets") {
    return product.coolerSockets != null && product.coolerSockets.value.length > 0;
  } else if (attrName === "storageInterfaces") {
    return (
      product.storageInterfaces != null &&
      product.storageInterfaces.value.length > 0
    );
  }
  return product[attrName] != null;
}

export function evaluateCategoryHealth(
  categorySlug: string,
  products: readonly CatalogProduct[],
): EvaluateCategoryHealthResult {
  const spec = getCategoryHealthSpec(categorySlug);
  const matching = products.filter((item) => item.categorySlug === categorySlug);
  const productCount = matching.length;

  let otherBrandCount = 0;
  let parsedProductCount = 0;

  for (const item of matching) {
    if (item.brandSlug === "other") {
      otherBrandCount += 1;
    }
    if (hasAnyParsedAttribute(item)) {
      parsedProductCount += 1;
    }
  }

  const attributeCoverages: AttributeCoverage[] = [];
  let filledSlots = 0;

  for (const attrName of spec.requiredAttributes) {
    let presentCount = 0;
    for (const item of matching) {
      if (isRequiredAttributePresent(item, attrName)) {
        presentCount += 1;
      }
    }
    filledSlots += presentCount;
    attributeCoverages.push({
      attributeName: attrName,
      presentCount,
      totalCount: productCount,
      coveragePercent:
        productCount === 0
          ? 0
          : roundHalfAwayFromZero((presentCount / productCount) * 100),
    });
  }

  const totalSlots = productCount * spec.requiredAttributes.length;
  let coveragePercent: number;
  let status: HealthStatus;

  if (productCount === 0) {
    coveragePercent = 0;
    status = "no-data";
  } else if (totalSlots > 0) {
    const rawPercent = (filledSlots / totalSlots) * 100;
    coveragePercent = roundHalfAwayFromZero(rawPercent);
    // DEVIATION D6: compare thresholds on UNROUNDED percentage
    if (rawPercent >= 90) {
      status = "green";
    } else if (rawPercent >= 60) {
      status = "amber";
    } else {
      status = "red";
    }
  } else {
    coveragePercent = 100;
    status = "green";
  }

  return {
    health: {
      categorySlug,
      componentType: spec.componentType,
      productCount,
      coveragePercent,
      status,
      attributeCoverages,
    },
    otherBrandCount,
    parsedProductCount,
  };
}

export function catalogDataHealthReport(
  products: readonly CatalogProduct[],
): CatalogDataHealthReportResult {
  const categoryHealths = [];
  let otherBrandCount = 0;
  let parsedProductCount = 0;

  for (const slug of AUDITED_HEALTH_CATEGORY_SLUGS) {
    const res = evaluateCategoryHealth(slug, products);
    categoryHealths.push(res.health);
    otherBrandCount += res.otherBrandCount;
    parsedProductCount += res.parsedProductCount;
  }

  // DEVIATION D7: if every audited category is no-data, overallStatus = "no-data"
  let overallStatus: HealthStatus;
  if (categoryHealths.every((c) => c.status === "no-data")) {
    overallStatus = "no-data";
  } else if (categoryHealths.some((c) => c.status === "red")) {
    overallStatus = "red";
  } else if (categoryHealths.some((c) => c.status === "amber")) {
    overallStatus = "amber";
  } else {
    overallStatus = "green";
  }

  return {
    categoryHealths,
    otherBrandCount,
    parsedProductCount,
    overallStatus,
  };
}
