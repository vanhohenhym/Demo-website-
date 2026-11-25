import React from "react";
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";
import { getCmsAdapter } from "@/lib/cms";
import { toCatalogProduct, type Product } from "@/lib/cms/types";
import {
  AUDITED_HEALTH_CATEGORY_SLUGS,
  evaluateCategoryHealth,
} from "@/lib/logic";
import {
  BUILDER_SLOTS,
  PREFILTER_MIN_COVERAGE_PERCENT,
  decodeShareState,
  isBuilderSlotId,
  setBuilderItem,
  createEmptyBuilderState,
  type BuilderSlotId,
  type PcBuilderState,
} from "@/lib/pc-builder/builder";
import { PcBuilderClient } from "@/components/pc-builder/PcBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = constructMetadata({
  title: "PC Builder - Build Your Own Custom Computer",
  description:
    "Build your custom desktop PC with automated compatibility checks, wattage calculator, and real-time pricing from Star Tech.",
  path: "/pc-builder",
  canonicalPath: "/pc-builder",
});

interface PCBuilderPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const val = params[key];
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(val) && typeof val[0] === "string") {
    const trimmed = val[0].trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

export default async function PCBuilderPage({ searchParams }: PCBuilderPageProps) {
  const rawParams = await searchParams;
  const adapter = getCmsAdapter();

  const addSlug = readSingleParam(rawParams, "add");
  const slotParam = readSingleParam(rawParams, "slot");
  const shareParam = readSingleParam(rawParams, "share");

  const allProducts = await adapter.getAllProducts();
  const catalogProducts = allProducts.map((p) => toCatalogProduct(p, true));

  const slotCoverages: Partial<Record<BuilderSlotId, number>> = {};
  for (const slotDef of BUILDER_SLOTS) {
    if (AUDITED_HEALTH_CATEGORY_SLUGS.includes(slotDef.componentType)) {
      const { health } = evaluateCategoryHealth(
        slotDef.componentType,
        catalogProducts
      );
      slotCoverages[slotDef.id] =
        health.status === "red" || health.status === "no-data"
          ? Math.min(health.coveragePercent, PREFILTER_MIN_COVERAGE_PERCENT - 1)
          : health.coveragePercent;
    } else {
      slotCoverages[slotDef.id] = 100;
    }
  }

  let pendingAdd: { slotId: BuilderSlotId; product: Product } | undefined;
  if (addSlug && slotParam && isBuilderSlotId(slotParam)) {
    const product = await adapter.getProductBySlug(addSlug);
    if (product) {
      pendingAdd = { slotId: slotParam, product };
    }
  }

  let sharedBuild: PcBuilderState | undefined;
  if (shareParam) {
    const decoded = decodeShareState(shareParam);
    if (decoded) {
      let nextState: PcBuilderState = {
        ...createEmptyBuilderState(),
        verifiedRules: decoded.verifiedRules,
        ignoreCompatibility: decoded.ignoreCompatibility,
      };
      const entries = Object.entries(decoded.slots) as Array<
        [BuilderSlotId, { slug: string; quantity: number }]
      >;
      const resolvedProducts = await Promise.all(
        entries.map(async ([slotId, entry]) => ({
          slotId,
          quantity: entry.quantity,
          product: await adapter.getProductBySlug(entry.slug),
        }))
      );
      for (const item of resolvedProducts) {
        if (item.product) {
          nextState = setBuilderItem(
            nextState,
            item.slotId,
            item.product,
            item.quantity
          );
        }
      }
      sharedBuild = nextState;
    }
  }

  return (
    <PcBuilderClient
      slotCoverages={slotCoverages}
      pendingAdd={pendingAdd}
      sharedBuild={sharedBuild}
    />
  );
}
