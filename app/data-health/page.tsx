import React from "react";
import type { Metadata } from "next";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Database,
  Tags,
  Sparkles,
  FileWarning,
} from "lucide-react";
import { constructMetadata } from "@/lib/seo/metadata";
import {
  getCmsAdapter,
  toCatalogProduct,
  type HealthStatus,
  type Product,
} from "@/lib/cms";
import { catalogDataHealthReport } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = constructMetadata({
  title: "Catalog Data Health Audit",
  description:
    "Internal diagnostic dashboard tracking catalog attribute quality, coverage thresholds, brand resolution, and unmapped CMS attributes.",
  path: "/data-health",
  noIndex: true,
  noFollow: true,
});

interface DataHealthPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type CanonicalAttrKey =
  | "socket"
  | "ramType"
  | "formFactor"
  | "tdp"
  | "lengthMm"
  | "wattage"
  | "maxGpuLengthMm"
  | "coolerSockets"
  | "storageInterface"
  | "storageInterfaces";

const CANONICAL_ATTR_KEYS: readonly CanonicalAttrKey[] = [
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

function isRequiredAttributePresent(
  product: Product,
  attributeName: string
): boolean {
  const attr = product.attributes[attributeName];
  if (attr == null) {
    return false;
  }
  if (
    attributeName === "coolerSockets" ||
    attributeName === "storageInterfaces"
  ) {
    return Array.isArray(attr.value) && attr.value.length > 0;
  }
  return true;
}

/**
 * Computes HealthStatus using unrounded percentage thresholds per DEVIATION D6:
 * green >= 90, amber >= 60, red < 60, no-data when totalCount === 0.
 */
function getUnroundedAttributeStatus(
  presentCount: number,
  totalCount: number
): HealthStatus {
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

function getStatusBadgeClasses(status: HealthStatus): string {
  switch (status) {
    case "green":
      return "bg-emerald-100 text-emerald-900 border border-emerald-300";
    case "amber":
      return "bg-amber-100 text-amber-900 border border-amber-300";
    case "red":
      return "bg-rose-100 text-rose-900 border border-rose-300";
    case "no-data":
    default:
      return "bg-slate-100 text-slate-800 border border-slate-300";
  }
}

function getStatusLabel(status: HealthStatus): string {
  switch (status) {
    case "green":
      return "Healthy";
    case "amber":
      return "Warning";
    case "red":
      return "Critical";
    case "no-data":
    default:
      return "No Data";
  }
}

function formatAttributeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value ?? "");
}

export default async function DataHealthPage({
  searchParams,
}: DataHealthPageProps) {
  const sParams = await searchParams;
  const token = typeof sParams.token === "string" ? sParams.token : "";
  const configuredToken = process.env.DATA_HEALTH_TOKEN?.trim() || "";
  const isProduction = process.env.NODE_ENV === "production";
  const expectedToken = isProduction
    ? configuredToken
    : configuredToken || "demo-health-token-secret";

  const isAuthorized = isProduction
    ? Boolean(configuredToken) && token === configuredToken
    : token === expectedToken ||
      (process.env.NODE_ENV === "development" && !configuredToken);

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-20 bg-white p-8 rounded-lg border border-rose-200 text-center space-y-4">
        <div className="h-14 w-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Access Restricted</h1>
        <p className="text-sm text-gray-700">
          The Data Health Audit dashboard is private. Provide a valid{" "}
          <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
            ?token=DATA_HEALTH_TOKEN
          </code>{" "}
          query parameter.
        </p>
      </div>
    );
  }

  const adapter = getCmsAdapter();
  const [products, unmappedAttributes] = await Promise.all([
    adapter.getAllProducts(),
    adapter.getUnmappedAttributes(),
  ]);

  const catalogProducts = products.map((product) =>
    toCatalogProduct(product, true)
  );
  const report = catalogDataHealthReport(catalogProducts);

  const auditedSlugSet = new Set(
    report.categoryHealths.map((item) => item.categorySlug)
  );
  const auditedProductCount = products.filter((p) =>
    auditedSlugSet.has(p.componentType)
  ).length;

  const categoryRows = report.categoryHealths.map((health) => {
    const categoryProducts = products.filter(
      (p) => p.componentType === health.categorySlug
    );
    const attributes = health.attributeCoverages.map((cov) => {
      const status = getUnroundedAttributeStatus(
        cov.presentCount,
        cov.totalCount
      );
      const missingProducts = categoryProducts.filter(
        (p) => !isRequiredAttributePresent(p, cov.attributeName)
      );
      return {
        ...cov,
        status,
        missingProducts,
      };
    });

    const preFilterEnabled =
      health.status === "green" || health.status === "amber";

    return {
      health,
      attributes,
      preFilterEnabled,
    };
  });

  const missingAttributeRows = categoryRows.flatMap((row) =>
    row.attributes
      .filter((attr) => attr.missingProducts.length > 0)
      .map((attr) => ({
        componentType: row.health.componentType,
        categorySlug: row.health.categorySlug,
        attributeName: attr.attributeName,
        coveragePercent: attr.coveragePercent,
        status: attr.status,
        missingProducts: attr.missingProducts,
      }))
  );

  const otherBrandProducts = products.filter((p) => p.brandSlug === "other");

  const parsedProducts = products
    .map((product) => {
      const parsedAttributes: Array<{
        key: CanonicalAttrKey;
        value: string;
        confidence: string;
      }> = [];
      for (const key of CANONICAL_ATTR_KEYS) {
        const attr = product.attributes[key];
        if (attr && attr.source === "parsed") {
          parsedAttributes.push({
            key,
            value: formatAttributeValue(attr.value),
            confidence: attr.confidence,
          });
        }
      }
      return { product, parsedAttributes };
    })
    .filter((entry) => entry.parsedAttributes.length > 0);

  const unrecognizedAttributes = products.flatMap((product) =>
    (product.audit?.unrecognizedAttributes ?? []).map((item) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      attributeName: item.attributeName,
      rawValue: item.rawValue,
      reason: item.reason,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Page Header — exactly ONE h1 */}
      <header className="bg-white p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-textMain flex items-center gap-2">
            <ShieldCheck
              className="h-6 w-6 text-emerald-700 shrink-0"
              aria-hidden="true"
            />
            <span>Catalog Data Health Audit</span>
          </h1>
          <p className="text-sm text-brand-textMuted mt-1">
            Live CMS attribute coverage, brand resolution, parsed fallback usage,
            and unmapped field diagnostics. Provider:{" "}
            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
              {adapter.providerName}
            </code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getStatusBadgeClasses(report.overallStatus)}`}
          >
            Overall Status: {getStatusLabel(report.overallStatus)} (
            {report.overallStatus})
          </span>
        </div>
      </header>

      {/* Summary KPIs */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Catalog Audit Summary Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Catalog Products</span>
              <Database className="h-4 w-4 text-brand-blue" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
              {products.length}
            </p>
            <p className="text-xs text-gray-600 mt-1 tabular-nums">
              {auditedProductCount} across 7 audited PC categories
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Brand &ldquo;Other&rdquo;</span>
              <Tags className="h-4 w-4 text-amber-700" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
              {otherBrandProducts.length}
            </p>
            <p className="text-xs text-gray-600 mt-1 tabular-nums">
              {report.otherBrandCount} in audited PC categories
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Parsed Fallbacks</span>
              <Sparkles
                className="h-4 w-4 text-indigo-700"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
              {parsedProducts.length}
            </p>
            <p className="text-xs text-gray-600 mt-1 tabular-nums">
              {report.parsedProductCount} in audited PC categories
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Unmapped CMS Keys</span>
              <FileWarning
                className="h-4 w-4 text-rose-700"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
              {unmappedAttributes.length}
            </p>
            <p className="text-xs text-gray-600 mt-1 tabular-nums">
              {unrecognizedAttributes.length} rejected attribute values
            </p>
          </div>
        </div>
      </section>

      {/* Thresholds Legend */}
      <section aria-labelledby="thresholds-heading">
        <h2 id="thresholds-heading" className="sr-only">
          Coverage Threshold Definitions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md flex items-center gap-2 text-emerald-950">
            <ShieldCheck
              className="h-4 w-4 text-emerald-700 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong>Healthy (Green):</strong> &gt;= 90% coverage
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-center gap-2 text-amber-950">
            <AlertTriangle
              className="h-4 w-4 text-amber-700 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong>Warning (Amber):</strong> 60% – 89.9% (unrounded)
            </span>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-md flex items-center gap-2 text-rose-950">
            <AlertCircle
              className="h-4 w-4 text-rose-700 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong>Critical (Red):</strong> &lt; 60% (pre-filter off)
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-md flex items-center gap-2 text-slate-900">
            <Info
              className="h-4 w-4 text-slate-600 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong>No Data:</strong> 0 products in component type
            </span>
          </div>
        </div>
      </section>

      {/* 1. Per-Category Required Attribute Coverage */}
      <section className="space-y-2" aria-labelledby="category-coverage-heading">
        <h2
          id="category-coverage-heading"
          className="text-lg font-bold text-gray-900"
        >
          Category Coverage &amp; Required Attributes
        </h2>
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="category-coverage-caption"
          className="bg-white rounded-lg border border-gray-200 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
        >
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <caption
              id="category-coverage-caption"
              className="sr-only"
            >
              Per-category required attribute coverage and PC Builder pre-filter
              readiness
            </caption>
            <thead className="bg-gray-50 sticky top-0 z-10 text-gray-800 font-semibold">
              <tr>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                >
                  Component Category
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                >
                  Products
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-gray-200"
                >
                  Required Attribute Coverage
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                >
                  Category %
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                >
                  PC Builder Pre-Filter
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categoryRows.map(({ health, attributes, preFilterEnabled }) => (
                <tr key={health.categorySlug} className="hover:bg-gray-50/70">
                  <th
                    scope="row"
                    className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap bg-white sticky left-0"
                  >
                    <span>{health.componentType}</span>
                    <span className="block font-mono text-[11px] font-normal text-gray-500">
                      {health.categorySlug}
                    </span>
                  </th>
                  <td className="py-3 px-4 text-gray-800 font-medium tabular-nums">
                    {health.productCount}
                  </td>
                  <td className="py-3 px-4">
                    <ul className="flex flex-wrap gap-2">
                      {attributes.map((attr) => (
                        <li
                          key={attr.attributeName}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] tabular-nums ${getStatusBadgeClasses(attr.status)}`}
                        >
                          <span>{attr.attributeName}:</span>
                          <strong>{attr.coveragePercent}%</strong>
                          <span className="opacity-80">
                            ({attr.presentCount}/{attr.totalCount})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900 tabular-nums">
                    {health.coveragePercent}%
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusBadgeClasses(health.status)}`}
                    >
                      {getStatusLabel(health.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {preFilterEnabled ? (
                      <span className="text-emerald-800 font-semibold">
                        Enabled (&gt;= 60%)
                      </span>
                    ) : (
                      <span className="text-rose-800 font-semibold">
                        Disabled (&lt; 60%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Products Missing Required Attributes */}
      <section className="space-y-2" aria-labelledby="missing-attrs-heading">
        <h2
          id="missing-attrs-heading"
          className="text-lg font-bold text-gray-900"
        >
          Products Missing Required Attributes
        </h2>
        {missingAttributeRows.length === 0 ? (
          <p className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900">
            Every product in the 7 audited PC component categories has all
            required attributes populated.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="missing-attrs-caption"
            className="bg-white rounded-lg border border-gray-200 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <caption id="missing-attrs-caption" className="sr-only">
                Products missing required PC Builder attributes grouped by
                component category
              </caption>
              <thead className="bg-gray-50 sticky top-0 z-10 text-gray-800 font-semibold">
                <tr>
                  <th
                    scope="col"
                    className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                  >
                    Component
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                  >
                    Missing Attribute
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 border-b border-gray-200 whitespace-nowrap"
                  >
                    Coverage
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 border-b border-gray-200"
                  >
                    Affected Products
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {missingAttributeRows.map((row) => (
                  <tr
                    key={`${row.categorySlug}-${row.attributeName}`}
                    className="hover:bg-gray-50/70"
                  >
                    <th
                      scope="row"
                      className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap"
                    >
                      {row.componentType}
                    </th>
                    <td className="py-3 px-4 font-mono text-gray-800 whitespace-nowrap">
                      {row.attributeName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums ${getStatusBadgeClasses(row.status)}`}
                      >
                        {row.coveragePercent}% ({getStatusLabel(row.status)})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ul className="space-y-1">
                        {row.missingProducts.map((p) => (
                          <li key={p.id} className="text-gray-800">
                            <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[11px]">
                              {p.id}
                            </code>{" "}
                            <span className="font-mono text-gray-600">
                              [{p.sku}]
                            </span>{" "}
                            <span>{p.name}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Products with Brand "Other" */}
      <section className="space-y-2" aria-labelledby="other-brand-heading">
        <h2
          id="other-brand-heading"
          className="text-lg font-bold text-gray-900"
        >
          Products Resolved to Brand &ldquo;Other&rdquo; (
          {otherBrandProducts.length})
        </h2>
        {otherBrandProducts.length === 0 ? (
          <p className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900">
            All catalog products resolved to a recognized brand.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="other-brand-caption"
            className="bg-white rounded-lg border border-gray-200 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <caption id="other-brand-caption" className="sr-only">
                Products assigned to the fallback Other brand
              </caption>
              <thead className="bg-gray-50 sticky top-0 z-10 text-gray-800 font-semibold">
                <tr>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Product ID
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    SKU
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Product Name
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Category / Component
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Raw CMS Brand
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {otherBrandProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <th
                      scope="row"
                      className="py-3 px-4 font-mono font-semibold text-gray-900 whitespace-nowrap"
                    >
                      {p.id}
                    </th>
                    <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                      {p.categorySlug} / {p.componentType}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {p.audit?.rawBrandInput || "(none)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Products Relying on Parsed Values */}
      <section className="space-y-2" aria-labelledby="parsed-values-heading">
        <h2
          id="parsed-values-heading"
          className="text-lg font-bold text-gray-900"
        >
          Products Relying on Parsed Values ({parsedProducts.length})
        </h2>
        {parsedProducts.length === 0 ? (
          <p className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900">
            All populated attributes come from explicit CMS fields or SKU
            overrides.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="parsed-values-caption"
            className="bg-white rounded-lg border border-gray-200 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <caption id="parsed-values-caption" className="sr-only">
                Products with one or more attributes extracted from descriptions
                or titles instead of explicit CMS fields
              </caption>
              <thead className="bg-gray-50 sticky top-0 z-10 text-gray-800 font-semibold">
                <tr>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Product ID
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    SKU
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Product Name
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Component
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Parsed Attributes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedProducts.map(({ product, parsedAttributes }) => (
                  <tr key={product.id} className="hover:bg-gray-50/70">
                    <th
                      scope="row"
                      className="py-3 px-4 font-mono font-semibold text-gray-900 whitespace-nowrap"
                    >
                      {product.id}
                    </th>
                    <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                      {product.sku}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{product.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-700 whitespace-nowrap">
                      {product.componentType}
                    </td>
                    <td className="py-3 px-4">
                      <ul className="flex flex-wrap gap-1.5">
                        {parsedAttributes.map((item) => (
                          <li
                            key={item.key}
                            className="font-mono text-[11px] bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded"
                          >
                            {item.key}={item.value} ({item.confidence})
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Unmapped CMS Attribute Names */}
      <section className="space-y-2" aria-labelledby="unmapped-attrs-heading">
        <h2
          id="unmapped-attrs-heading"
          className="text-lg font-bold text-gray-900"
        >
          Unmapped CMS Attribute Names ({unmappedAttributes.length})
        </h2>
        {unmappedAttributes.length === 0 ? (
          <p className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-900">
            Zero unmapped CMS attribute keys detected.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="unmapped-attrs-caption"
            className="bg-white rounded-lg border border-gray-200 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <caption id="unmapped-attrs-caption" className="sr-only">
                Raw CMS attribute names that did not match any canonical field
              </caption>
              <thead className="bg-gray-50 sticky top-0 z-10 text-gray-800 font-semibold">
                <tr>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Raw Attribute Name
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Occurrences
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Sample Product IDs
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Sample Values
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {unmappedAttributes.map((item) => (
                  <tr key={item.attributeName} className="hover:bg-gray-50/70">
                    <th
                      scope="row"
                      className="py-3 px-4 font-mono font-semibold text-gray-900 whitespace-nowrap"
                    >
                      {item.attributeName}
                    </th>
                    <td className="py-3 px-4 text-gray-800 tabular-nums">
                      {item.count}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">
                      {item.sampleProductIds.join(", ")}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {item.sampleValues.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 6. Unrecognized / Rejected Attribute Values */}
      {unrecognizedAttributes.length > 0 && (
        <section
          className="space-y-2"
          aria-labelledby="rejected-values-heading"
        >
          <h2
            id="rejected-values-heading"
            className="text-lg font-bold text-gray-900"
          >
            Rejected / Unrecognized Attribute Values (
            {unrecognizedAttributes.length})
          </h2>
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="rejected-values-caption"
            className="bg-white rounded-lg border border-gray-200 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            <table className="w-full text-left text-xs border-separate border-spacing-0">
              <caption id="rejected-values-caption" className="sr-only">
                Mapped attributes whose raw values failed canonical validation
              </caption>
              <thead className="bg-gray-50 sticky top-0 z-10 text-gray-800 font-semibold">
                <tr>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Product
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Attribute
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Raw Value
                  </th>
                  <th scope="col" className="py-3 px-4 border-b border-gray-200">
                    Rejection Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {unrecognizedAttributes.map((entry, idx) => (
                  <tr
                    key={`${entry.productId}-${entry.attributeName}-${idx}`}
                    className="hover:bg-gray-50/70"
                  >
                    <th
                      scope="row"
                      className="py-3 px-4 font-mono text-gray-900 whitespace-nowrap"
                    >
                      {entry.productId} ({entry.sku})
                    </th>
                    <td className="py-3 px-4 font-mono text-gray-800 whitespace-nowrap">
                      {entry.attributeName}
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-800">
                      {entry.rawValue}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
