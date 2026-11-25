#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getCmsAdapter, toCatalogProduct } from "../lib/cms/index.ts";
import { catalogDataHealthReport } from "../lib/logic/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "..");

const CANONICAL_ATTR_KEYS = [
  "socket",
  "ramType",
  "formFactor",
  "tdp",
  "lengthMm",
  "wattage",
  "maxGpuLengthMm",
  "coolerSockets",
  "storageInterface",
  "storageInterfaces",
];

function isRequiredAttrPresent(product, attrName) {
  const attr = product.attributes?.[attrName];
  if (attr == null) {
    return false;
  }
  if (attrName === "coolerSockets" || attrName === "storageInterfaces") {
    return Array.isArray(attr.value) && attr.value.length > 0;
  }
  return true;
}

/**
 * Unrounded threshold check per DEVIATION D6:
 * green >= 90, amber >= 60, red < 60, no-data if totalCount === 0.
 */
function getAttributeStatus(presentCount, totalCount) {
  if (totalCount === 0) {
    return "no-data";
  }
  const rawPercent = (presentCount / totalCount) * 100;
  if (rawPercent >= 90) {
    return "green";
  }
  if (rawPercent >= 60) {
    return "amber";
  }
  return "red";
}

function formatStatusLabel(status) {
  switch (status) {
    case "green":
      return "Green (Healthy)";
    case "amber":
      return "Amber (Warning)";
    case "red":
      return "Red (Critical)";
    default:
      return "No Data";
  }
}

function escapeCsvCell(value) {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeMdCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatAttrValue(val) {
  if (Array.isArray(val)) {
    return val.join(", ");
  }
  return String(val);
}

async function runDataAudit() {
  const adapter = getCmsAdapter();
  const products = await adapter.getAllProducts();
  const unmappedAttributes = await adapter.getUnmappedAttributes();

  const catalogProducts = products.map((product) =>
    toCatalogProduct(product, true)
  );
  const report = catalogDataHealthReport(catalogProducts);

  const auditedSlugs = new Set(
    report.categoryHealths.map((item) => item.categorySlug)
  );
  const auditedProducts = products.filter((p) =>
    auditedSlugs.has(p.componentType)
  );

  // Per-category missing attribute diagnostics
  const categoryDetails = report.categoryHealths.map((health) => {
    const catProducts = products.filter(
      (p) => p.componentType === health.categorySlug
    );
    const attributes = health.attributeCoverages.map((cov) => {
      const missingProducts = catProducts.filter(
        (p) => !isRequiredAttrPresent(p, cov.attributeName)
      );
      const attrStatus = getAttributeStatus(cov.presentCount, cov.totalCount);
      return {
        ...cov,
        status: attrStatus,
        pcBuilderPreFilter: attrStatus === "green" || attrStatus === "amber",
        missingProducts,
      };
    });

    const missingSlots = attributes.reduce(
      (sum, item) => sum + item.missingProducts.length,
      0
    );

    return {
      health,
      pcBuilderPreFilter:
        health.status === "green" || health.status === "amber",
      missingSlots,
      attributes,
    };
  });

  // Products with Brand "Other" across entire catalog
  const otherBrandProducts = products.filter((p) => p.brandSlug === "other");

  // Products relying on parsed attributes across entire catalog
  const parsedProducts = products
    .map((p) => {
      const parsedKeys = CANONICAL_ATTR_KEYS.filter(
        (key) => p.attributes[key]?.source === "parsed"
      ).map((key) => ({
        key,
        value: formatAttrValue(p.attributes[key].value),
        confidence: p.attributes[key].confidence,
      }));
      return { product: p, parsedKeys };
    })
    .filter((entry) => entry.parsedKeys.length > 0);

  // Unrecognized / rejected attribute values across catalog
  const unrecognizedEntries = [];
  for (const product of products) {
    const list = product.audit?.unrecognizedAttributes ?? [];
    for (const item of list) {
      unrecognizedEntries.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        attributeName: item.attributeName,
        rawValue: item.rawValue,
        reason: item.reason,
      });
    }
  }

  // Brand resolution & normalization provenance stats
  const distinctBrands = new Set(
    products.filter((p) => p.brandSlug !== "other").map((p) => p.brandSlug)
  );
  let aliasesMergedCount = 0;
  for (const p of products) {
    const raw = p.audit?.rawBrandInput?.trim();
    if (raw && p.brandSlug !== "other" && raw !== p.brand) {
      aliasesMergedCount += 1;
    }
  }

  let explicitAttrCount = 0;
  let parsedAttrCount = 0;
  let overrideAttrCount = 0;
  let highConfCount = 0;
  let mediumConfCount = 0;
  let lowConfCount = 0;
  const overrideSkus = new Set();

  for (const product of products) {
    for (const key of CANONICAL_ATTR_KEYS) {
      const attr = product.attributes[key];
      if (!attr) continue;
      if (attr.source === "explicit") explicitAttrCount += 1;
      else if (attr.source === "parsed") parsedAttrCount += 1;
      else if (attr.source === "override") {
        overrideAttrCount += 1;
        overrideSkus.add(product.sku);
      }

      if (attr.confidence === "high") highConfCount += 1;
      else if (attr.confidence === "medium") mediumConfCount += 1;
      else if (attr.confidence === "low") lowConfCount += 1;
    }
  }

  const auditTimestamp = new Date().toISOString();

  // 1. Build CSV report (reports/data-health.csv)
  const csvHeaders = [
    "component_type",
    "category_slug",
    "attribute_name",
    "present_count",
    "total_products",
    "coverage_percent",
    "attribute_status",
    "category_coverage_percent",
    "category_status",
    "pc_builder_prefilter",
    "missing_product_ids",
    "missing_skus",
  ];

  const csvRows = [csvHeaders.join(",")];
  for (const detail of categoryDetails) {
    for (const attr of detail.attributes) {
      const row = [
        detail.health.componentType,
        detail.health.categorySlug,
        attr.attributeName,
        attr.presentCount,
        attr.totalCount,
        attr.coveragePercent,
        attr.status,
        detail.health.coveragePercent,
        detail.health.status,
        attr.pcBuilderPreFilter ? "enabled" : "disabled",
        attr.missingProducts.map((p) => p.id).join(";"),
        attr.missingProducts.map((p) => p.sku).join(";"),
      ];
      csvRows.push(row.map(escapeCsvCell).join(","));
    }
  }

  const csvPath = resolve(ROOT_DIR, "reports/data-health.csv");
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, `${csvRows.join("\n")}\n`, "utf8");

  // 2. Build Markdown report (docs/DATA_HEALTH.md)
  const mdLines = [
    "# Catalog Data Health Audit Report",
    "",
    "*Generated by `npm run data:audit` (`scripts/data-audit.mjs`)*  ",
    `*Last Audit Run: ${auditTimestamp}*  `,
    `*CMS Provider: \`${adapter.providerName}\` | Total Products: ${products.length} | Audited PC Component Products: ${auditedProducts.length}*`,
    "",
    "---",
    "",
    "## 1. Quality Thresholds & Status Definitions",
    "- **Green (Healthy)**: Coverage `>= 90%` (compared on unrounded percentage per DEVIATION D6)",
    "- **Amber (Warning)**: Coverage `60% - 89.9%` (unrounded)",
    "- **Red (Critical)**: Coverage `< 60%` (unrounded)",
    "- **No Data**: `0` products in component category",
    "- **PC Builder Pre-Filtering**: Enabled automatically only when relevant attribute coverage is `>= 60%`",
    "",
    `**Overall Catalog Health Status**: \`${report.overallStatus}\` (${formatStatusLabel(report.overallStatus)})`,
    "",
    "---",
    "",
    "## 2. Category Coverage Summary",
    "",
    "| Category / Component | Products | Required Attributes | Coverage % | Status | PC Builder Pre-Filter | Missing Slots |",
    "|---|---|---|---|---|---|---|",
  ];

  for (const detail of categoryDetails) {
    const reqList = detail.attributes.map((a) => a.attributeName).join(", ");
    mdLines.push(
      `| ${escapeMdCell(detail.health.componentType)} (\`${detail.health.categorySlug}\`) | ${detail.health.productCount} | ${escapeMdCell(reqList)} | ${detail.health.coveragePercent}% | ${formatStatusLabel(detail.health.status)} | ${detail.pcBuilderPreFilter ? "Enabled" : "Disabled"} | ${detail.missingSlots} |`
    );
  }

  mdLines.push(
    "",
    "---",
    "",
    "## 3. Required Attribute Coverage & Missing Products",
    "",
    "| Component | Required Attribute | Present / Total | Coverage % | Status | Missing Products (`id` / `sku`) |",
    "|---|---|---|---|---|---|"
  );

  for (const detail of categoryDetails) {
    for (const attr of detail.attributes) {
      const missingStr =
        attr.missingProducts.length === 0
          ? "None"
          : attr.missingProducts
              .map((p) => `\`${p.id}\` (${p.sku})`)
              .join(", ");
      mdLines.push(
        `| ${escapeMdCell(detail.health.componentType)} | \`${attr.attributeName}\` | ${attr.presentCount} / ${attr.totalCount} | ${attr.coveragePercent}% | ${formatStatusLabel(attr.status)} | ${escapeMdCell(missingStr)} |`
      );
    }
  }

  mdLines.push(
    "",
    "---",
    "",
    "## 4. Brand Resolution Health",
    `- Distinct Named Brands Resolved: **${distinctBrands.size}**`,
    `- Brand Aliases Merged to Canonical Name: **${aliasesMergedCount}**`,
    `- Products Assigned to \`"Other"\` (Audited Categories): **${report.otherBrandCount}**`,
    `- Products Assigned to \`"Other"\` (Full Catalog): **${otherBrandProducts.length}**`,
    ""
  );

  if (otherBrandProducts.length > 0) {
    mdLines.push(
      "| Product ID | SKU | Product Name | Category | Component Type | Raw Brand Input |",
      "|---|---|---|---|---|---|"
    );
    for (const p of otherBrandProducts) {
      mdLines.push(
        `| \`${escapeMdCell(p.id)}\` | \`${escapeMdCell(p.sku)}\` | ${escapeMdCell(p.name)} | \`${escapeMdCell(p.categorySlug)}\` | \`${escapeMdCell(p.componentType)}\` | ${escapeMdCell(p.audit?.rawBrandInput ?? "(none)")} |`
      );
    }
  } else {
    mdLines.push("_No products are currently assigned to brand `\"Other\"`._");
  }

  mdLines.push(
    "",
    "---",
    "",
    "## 5. Normalization Provenance & Products Relying on Parsed Values",
    `- Explicit CMS Attributes (\`source: "explicit"\`): **${explicitAttrCount}**`,
    `- Parsed Attributes (\`source: "parsed"\`): **${parsedAttrCount}**`,
    `- Manual SKU Overrides (\`source: "override"\`, \`data/overrides.json\`): **${overrideAttrCount}** across **${overrideSkus.size}** SKU(s)`,
    `- Confidence Breakdown: **${highConfCount}** high, **${mediumConfCount}** medium, **${lowConfCount}** low`,
    `- Products Relying on Parsed Values (Audited Categories): **${report.parsedProductCount}**`,
    `- Products Relying on Parsed Values (Full Catalog): **${parsedProducts.length}**`,
    ""
  );

  if (parsedProducts.length > 0) {
    mdLines.push(
      "| Product ID | SKU | Product Name | Component Type | Parsed Attributes |",
      "|---|---|---|---|---|"
    );
    for (const entry of parsedProducts) {
      const attrsSummary = entry.parsedKeys
        .map((k) => `\`${k.key}=${k.value}\` (${k.confidence})`)
        .join(", ");
      mdLines.push(
        `| \`${escapeMdCell(entry.product.id)}\` | \`${escapeMdCell(entry.product.sku)}\` | ${escapeMdCell(entry.product.name)} | \`${escapeMdCell(entry.product.componentType)}\` | ${escapeMdCell(attrsSummary)} |`
      );
    }
  } else {
    mdLines.push("_No products rely on parsed attributes._");
  }

  mdLines.push(
    "",
    "---",
    "",
    "## 6. Unmapped CMS Attribute Names",
    `- Unique Unmapped Attribute Keys Discovered: **${unmappedAttributes.length}**`,
    ""
  );

  if (unmappedAttributes.length > 0) {
    mdLines.push(
      "| Raw CMS Attribute Name | Occurrences | Sample Product IDs | Sample Values |",
      "|---|---|---|---|"
    );
    for (const item of unmappedAttributes) {
      mdLines.push(
        `| \`${escapeMdCell(item.attributeName)}\` | ${item.count} | ${escapeMdCell(item.sampleProductIds.join(", "))} | ${escapeMdCell(item.sampleValues.join("; "))} |`
      );
    }
  } else {
    mdLines.push("_All CMS attribute keys mapped cleanly._");
  }

  if (unrecognizedEntries.length > 0) {
    mdLines.push(
      "",
      "### Unrecognized / Rejected Attribute Values",
      "",
      "| Product ID | SKU | Attribute Name | Raw Value | Rejection Reason |",
      "|---|---|---|---|---|"
    );
    for (const entry of unrecognizedEntries) {
      mdLines.push(
        `| \`${escapeMdCell(entry.productId)}\` | \`${escapeMdCell(entry.sku)}\` | \`${escapeMdCell(entry.attributeName)}\` | \`${escapeMdCell(entry.rawValue)}\` | ${escapeMdCell(entry.reason)} |`
      );
    }
  }

  const mdPath = resolve(ROOT_DIR, "docs/DATA_HEALTH.md");
  writeFileSync(mdPath, `${mdLines.join("\n")}\n`, "utf8");

  console.log("=== Catalog Data Health Auditor ===");
  console.log(`CMS Provider: ${adapter.providerName}`);
  console.log(
    `Products Scanned: ${products.length} (${auditedProducts.length} in audited PC component categories)`
  );
  console.log(
    `Overall Status: ${report.overallStatus.toUpperCase()} | Brand "Other": ${otherBrandProducts.length} (${report.otherBrandCount} audited) | Parsed Products: ${parsedProducts.length} (${report.parsedProductCount} audited) | Unmapped Keys: ${unmappedAttributes.length}`
  );
  for (const detail of categoryDetails) {
    console.log(
      `  - ${detail.health.componentType.padEnd(11)} ${String(detail.health.productCount).padStart(2)} items | ${String(detail.health.coveragePercent).padStart(3)}% | ${detail.health.status}`
    );
  }
  console.log("Wrote docs/DATA_HEALTH.md and reports/data-health.csv.");
}

runDataAudit().catch((error) => {
  console.error("[data:audit] Audit failed:", error);
  process.exitCode = 1;
});
