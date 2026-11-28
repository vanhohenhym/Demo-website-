/**
 * Best-effort Next.js cache revalidation helper for CMS mutations.
 * Wrapped in dynamic import + try/catch so unit tests running under `node --test`
 * (without Next.js request/cache runtime) never fail.
 */
export async function revalidateCmsStorefront(options?: {
  slug?: string;
  categorySlug?: string;
  subCategorySlugs?: string[];
}): Promise<void> {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/pc-builder");
    revalidatePath("/compare");
    revalidatePath("/category/[category]", "page");
    revalidatePath("/category/[category]/[brand]", "page");
    revalidatePath("/product/[slug]", "page");

    if (options?.slug) {
      revalidatePath(`/product/${options.slug}`);
    }
    if (options?.categorySlug) {
      revalidatePath(`/category/${options.categorySlug}`);
    }
    if (options?.subCategorySlugs) {
      for (const sub of options.subCategorySlugs) {
        if (sub.trim()) {
          revalidatePath(`/category/${sub.trim()}`);
        }
      }
    }
  } catch {
    // No-op outside Next.js server/request context (e.g., node --test)
  }
}
