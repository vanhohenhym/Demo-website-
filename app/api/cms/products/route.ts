import { z } from "zod";
import { revalidateCmsStorefront } from "../_revalidate.ts";
import {
  cmsUnauthorizedResponse,
  isAdminRequest,
} from "../../../../lib/cms/admin-auth.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../../../../lib/cms/config-loader.ts";
import {
  customRecordToRawAdapterProduct,
  listCustomProducts,
  upsertCustomProduct,
} from "../../../../lib/cms/custom-store.ts";
import { normalizeRawProduct } from "../../../../lib/cms/normalize/pipeline.ts";
import { matchesCategorySlug } from "../../../../lib/cms/query-engine.ts";
import type { CustomCmsProductRecord, Product } from "../../../../lib/cms/types.ts";

const availabilitySchema = z.enum([
  "in_stock",
  "out_of_stock",
  "preorder",
  "upcoming",
]);

const statusSchema = z.enum(["publish", "draft"]);

const imageSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required."),
  alt: z.string().trim().optional().default(""),
});

const keyValueSchema = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim(),
});

const createProductSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().optional(),
  title: z.string().trim().min(1, "Product title is required."),
  slug: z.string().trim().nullable().optional(),
  status: statusSchema.optional(),
  categorySlug: z.string().trim().min(1).optional(),
  categoryName: z.string().trim().optional(),
  subCategorySlugs: z.array(z.string().trim()).nullable().optional(),
  explicitComponentType: z.string().trim().nullable().optional(),
  brandTaxonomy: z.string().trim().nullable().optional(),
  price: z.number().finite().positive().nullable().optional(),
  salePrice: z.number().finite().positive().nullable().optional(),
  availability: availabilitySchema.optional(),
  stockQuantity: z.number().finite().min(0).nullable().optional(),
  images: z.array(imageSchema).optional(),
  shortDescription: z.string().nullable().optional(),
  descriptionHtml: z.string().nullable().optional(),
  explicitAttributes: z.array(keyValueSchema).optional(),
  warranty: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isFlashDeal: z.boolean().optional(),
});

function normalizeRecord(record: CustomCmsProductRecord): Product {
  return normalizeRawProduct(customRecordToRawAdapterProduct(record), {
    brandConfigs: loadBrandConfigs(),
    overridesMap: loadSkuOverrides(),
    logUnmapped: false,
  });
}

export async function GET(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const url = new URL(req.url);
  const statusParam = (url.searchParams.get("status") ?? "all").trim().toLowerCase();
  const qParam = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const categoryParam = (url.searchParams.get("category") ?? "").trim().toLowerCase();

  const records = await listCustomProducts({ includeDrafts: true });
  const items = records
    .map((record) => ({
      ...record,
      normalized: normalizeRecord(record),
    }))
    .filter((entry) => {
      if (statusParam === "publish" || statusParam === "draft") {
        if (entry.status !== statusParam) {
          return false;
        }
      }
      if (categoryParam && categoryParam !== "all") {
        if (!matchesCategorySlug(entry.normalized, categoryParam)) {
          return false;
        }
      }
      if (qParam) {
        const haystack = [
          entry.title,
          entry.sku,
          entry.slug,
          entry.brandTaxonomy ?? "",
          entry.normalized.brand,
          entry.categoryName,
          entry.categorySlug,
          entry.shortDescription ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(qParam)) {
          return false;
        }
      }
      return true;
    });

  return Response.json(
    {
      products: items,
      total: items.length,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const parsed = createProductSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid product payload.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  try {
    const product = await upsertCustomProduct(parsed.data);
    const normalized = normalizeRecord(product);
    await revalidateCmsStorefront({
      slug: product.slug,
      categorySlug: product.categorySlug,
      subCategorySlugs: product.subCategorySlugs,
    });
    return Response.json(
      { product, normalized },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save product.";
    return Response.json({ error: message }, { status: 400 });
  }
}
