import { checkBuildCompatibility } from "./check-build-compatibility.ts";
import type {
  CatalogProduct,
  EvaluatePcBuildInput,
  EvaluatePcBuildResult,
} from "./types.ts";

export function evaluatePcBuild(input: EvaluatePcBuildInput): EvaluatePcBuildResult {
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
    extras = [],
    ignoreCompatibility = false,
    verifiedRules = [],
  } = input;

  let totalPrice = 0;
  let itemCount = 0;
  const excludedItemIds: string[] = [];

  const priceItem = (product: CatalogProduct | undefined, quantity: number): void => {
    if (product == null) {
      return;
    }
    itemCount += quantity;
    if (product.availability === "out_of_stock" || product.price == null) {
      excludedItemIds.push(product.id);
    } else {
      const unit =
        product.salePrice != null && product.salePrice < product.price
          ? product.salePrice
          : product.price;
      totalPrice += unit * quantity;
    }
  };

  priceItem(cpu, 1);
  priceItem(motherboard, 1);
  priceItem(ram, ramQuantity);
  priceItem(gpu, 1);
  priceItem(psu, 1);
  priceItem(pcCase, 1);
  priceItem(cooler, 1);

  for (const item of storageItems) {
    priceItem(item.product, item.quantity ?? 1);
  }
  for (const item of extras) {
    priceItem(item.product, item.quantity ?? 1);
  }

  if (ignoreCompatibility) {
    return {
      totalPrice,
      itemCount,
      excludedItemIds,
      checks: [],
      errorCount: 0,
      warningCount: 0,
      unverifiedCount: 0,
    };
  }

  const compat = checkBuildCompatibility({
    cpu,
    motherboard,
    ram,
    ramQuantity,
    gpu,
    psu,
    pcCase,
    cooler,
    storageItems,
    verifiedRules,
  });

  return {
    totalPrice,
    itemCount,
    excludedItemIds,
    checks: compat.checks,
    errorCount: compat.errorCount,
    warningCount: compat.warningCount,
    unverifiedCount: compat.unverifiedCount,
  };
}
