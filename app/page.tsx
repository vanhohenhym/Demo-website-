import React from "react";
import { getCmsAdapter } from "@/lib/cms";
import { HeroSection } from "@/components/home/HeroSection";
import { AnnouncementBar } from "@/components/home/AnnouncementBar";
import { QuickServiceBar } from "@/components/home/QuickServiceBar";
import { FeaturedCategories } from "@/components/home/FeaturedCategories";
import { StoreLocatorBanner } from "@/components/home/StoreLocatorBanner";
import { FlashSaleSection } from "@/components/home/FlashSaleSection";
import { MegaDealSection } from "@/components/home/MegaDealSection";
import { EditorialSeoSection } from "@/components/home/EditorialSeoSection";

const DEFAULT_MEGA_DEAL_END_ISO = "2026-12-15T23:59:59+06:00";

export const revalidate = 3600;

export default async function HomePage() {
  const megaDealTargetIso =
    process.env.NEXT_PUBLIC_MEGA_DEAL_END_ISO?.trim() ||
    DEFAULT_MEGA_DEAL_END_ISO;
  const adapter = getCmsAdapter();
  const [flashDeals, allProducts] = await Promise.all([
    adapter.getFlashDeals(),
    adapter.getAllProducts(),
  ]);

  let featuredFallback: Awaited<ReturnType<typeof adapter.getFeaturedProducts>> | null = null;
  const getFeaturedFallback = async () => {
    if (featuredFallback === null) {
      featuredFallback = await adapter.getFeaturedProducts(8);
    }
    return featuredFallback;
  };

  let primaryFlashProducts = flashDeals.slice(0, 4);
  if (primaryFlashProducts.length < 4) {
    const featured = await getFeaturedFallback();
    const seenPrimary = new Set(primaryFlashProducts.map((item) => item.id));
    for (const item of featured) {
      if (!seenPrimary.has(item.id) && primaryFlashProducts.length < 4) {
        primaryFlashProducts = [...primaryFlashProducts, item];
        seenPrimary.add(item.id);
      }
    }
  }

  const primaryIds = new Set(primaryFlashProducts.map((item) => item.id));
  let secondaryFlashProducts = flashDeals
    .slice(4)
    .filter((item) => !primaryIds.has(item.id))
    .slice(0, 4);
  if (secondaryFlashProducts.length < 4) {
    const featured = await getFeaturedFallback();
    const seenSecondary = new Set([
      ...primaryIds,
      ...secondaryFlashProducts.map((item) => item.id),
    ]);
    for (const item of featured) {
      if (!seenSecondary.has(item.id) && secondaryFlashProducts.length < 4) {
        secondaryFlashProducts = [...secondaryFlashProducts, item];
        seenSecondary.add(item.id);
      }
    }
  }

  // Mini-Phase 6 (Image 6): 15 live CMS products (3 full 5-col rows) for Mega Deal,
  // prioritizing remaining flash deals then other catalog items not shown in Bands 1–2.
  const usedInFlashBands = new Set([
    ...primaryIds,
    ...secondaryFlashProducts.map((item) => item.id),
  ]);
  const unusedMegaPool = [
    ...flashDeals.filter((item) => !usedInFlashBands.has(item.id)),
    ...allProducts.filter((item) => !usedInFlashBands.has(item.id)),
  ];
  const megaDealPool = unusedMegaPool.length > 0 ? unusedMegaPool : allProducts;
  const seenMega = new Set<string>();
  const megaDealProducts: typeof allProducts = [];
  for (const item of megaDealPool) {
    if (!seenMega.has(item.id) && megaDealProducts.length < 15) {
      megaDealProducts.push(item);
      seenMega.add(item.id);
    }
  }

  return (
    <div className="space-y-9">
      {/* Exactly ONE h1 on the page */}
      <h1 className="sr-only">
        Star Tech - Leading Computer, Laptop &amp; Electronics Retail &amp; Online Shop in Bangladesh
      </h1>

      {/* Phase 3 — Mini-Phase 1 (Image 1): Hero Grid, Announcement Bar & Quick Service Cards */}
      <div className="space-y-5">
        <HeroSection />
        <AnnouncementBar />
        <QuickServiceBar />
      </div>

      {/* Phase 3 — Mini-Phase 2 (Image 2): Featured Category Grid & 20+ Physical Stores Banner */}
      <div className="space-y-8">
        <FeaturedCategories />
        <StoreLocatorBanner />
      </div>

      {/* Phase 3 — Mini-Phase 3 (Image 3): Primary 11.11 Flash Sale Band */}
      <FlashSaleSection
        title="11.11 | Flash Sale"
        subtitle="Enjoy Discount on Top PC Components & Hardware!"
        showAllHref="/category/motherboard"
        products={primaryFlashProducts}
        posterVariant="blue"
        posterTitle="Best Flash Deals"
        posterSubtitle="Limited-Time 11.11 Discounts on Genuine Tech"
        posterBadge="11.11 | FLASH SALE"
      />

      {/* Phase 3 — Mini-Phase 4 (Image 4): Secondary 11.11 Flash Sale Band */}
      <FlashSaleSection
        title="11.11 | Peripherals & Upgrade Flash Sale"
        subtitle="Enjoy Discount on Power, Cooling, Storage & Gaming Gear!"
        showAllHref="/category/monitor"
        products={secondaryFlashProducts}
        posterVariant="orange"
        posterTitle="Gaming & Tech Deals"
        posterSubtitle="Save Big on Everyday PC & Lifestyle Upgrades"
        posterBadge="11.11 | FLASH SALE"
      />

      {/* Phase 3 — Mini-Phases 5–7 (Images 5–7): 11.11 Mega Deal Header, Ribbon, 3×5 Grid & Show All CTA */}
      <MegaDealSection
        products={megaDealProducts}
        targetDateIso={megaDealTargetIso}
        showAllHref="/category/component"
        showAllLabel="Show all"
      />

      {/* Phase 3 — Mini-Phases 7–9 (Images 7–9): Full Editorial SEO Intro, Body & Closing Sections */}
      <EditorialSeoSection includeMiddleSections includeClosingSection />
    </div>
  );
}
