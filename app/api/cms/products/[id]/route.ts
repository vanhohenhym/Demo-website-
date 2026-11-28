import { z } from "zod";
import { revalidateCmsStorefront } from "../../_revalidate.ts";
import {
  cmsUnauthorizedResponse,
  isAdminRequest,
} from "../../../../../lib/cms/admin-auth.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../../../../../lib/cms/config-loader.ts";
import {
  customRecordToRawAdapterProduct,
  deleteCustomProduct,
  duplicateCustomProduct,
  getCustomProductById,
  patchCustomProduct,
} from "../../../../../lib/cms/custom-store.ts";
import { normalizeRawProduct } from "../../../../../lib/cms/normalize/pipeline.ts";
import type { CustomCmsProductRecord, Product } from "../../../../../lib/cms/types.ts";

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

const patchProductSchema = z.object({
  sku: z.string().trim().optional(),
  title: z.string().trim().min(1, "Product title cannot be empty.").optional(),
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

const actionSchema = z.object({
  action: z.literal("duplicate"),
});

function normalizeRecord(record: CustomCmsProductRecord): Product {
  return normalizeRawProduct(customRecordToRawAdapterProduct(record), {
    brandConfigs: loadBrandConfigs(),
    overridesMap: loadSkuOverrides(),
    logUnmapped: false,
  });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: Request,
  context: RouteContext
): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const { id } = await context.params;
  const product = await getCustomProductById(id);
  if (!product) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  return Response.json(
    {
      product,
      normalized: normalizeRecord(product),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(
  req: Request,
  context: RouteContext
): Promise<Response> {
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

  const parsed = patchProductSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid product update payload.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  try {
    const product = await patchCustomProduct(id, parsed.data);
    if (!product) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }
    await revalidateCmsStorefront({
      slug: product.slug,
      categorySlug: product.categorySlug,
      subCategorySlugs: product.subCategorySlugs,
    });
    return Response.json(
      {
        product,
        normalized: normalizeRecord(product),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update product.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  context: RouteContext
): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const { id } = await context.params;
  const existing = await getCustomProductById(id);
  const deleted = await deleteCustomProduct(id);
  if (!deleted) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }
  await revalidateCmsStorefront({
    slug: existing?.slug,
    categorySlug: existing?.categorySlug,
    subCategorySlugs: existing?.subCategorySlugs,
  });

  return Response.json(
    { deleted: true, id },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(
  req: Request,
  context: RouteContext
): Promise<Response> {
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

  const parsed = actionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: 'Expected { "action": "duplicate" }.' },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const duplicated = await duplicateCustomProduct(id);
  if (!duplicated) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }
  await revalidateCmsStorefront({
    slug: duplicated.slug,
    categorySlug: duplicated.categorySlug,
    subCategorySlugs: duplicated.subCategorySlugs,
  });

  return Response.json(
    {
      product: duplicated,
      normalized: normalizeRecord(duplicated),
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
