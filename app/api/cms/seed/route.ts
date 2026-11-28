import { z } from "zod";
import { revalidateCmsStorefront } from "../_revalidate.ts";
import {
  cmsUnauthorizedResponse,
  isAdminRequest,
} from "../../../../lib/cms/admin-auth.ts";
import {
  exportCustomStoreSnapshot,
  importCustomStoreSnapshot,
  resetCustomStoreToSeed,
} from "../../../../lib/cms/custom-store.ts";
import type { CustomCmsSnapshot } from "../../../../lib/cms/types.ts";

const categorySnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  parentSlug: z.string().optional(),
});

const productSnapshotSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(["publish", "draft"]).default("publish"),
  categorySlug: z.string().min(1),
  categoryName: z.string().min(1),
  subCategorySlugs: z.array(z.string()).optional(),
  explicitComponentType: z.string().optional(),
  brandTaxonomy: z.string().optional(),
  price: z.number().optional(),
  salePrice: z.number().optional(),
  availability: z.enum(["in_stock", "out_of_stock", "preorder", "upcoming"]),
  stockQuantity: z.number().optional(),
  images: z.array(
    z.object({
      url: z.string().min(1),
      alt: z.string().default(""),
    })
  ),
  shortDescription: z.string().optional(),
  descriptionHtml: z.string().optional(),
  explicitAttributes: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    })
  ),
  customFields: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .optional(),
  descriptionSpecs: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .optional(),
  warranty: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isFlashDeal: z.boolean().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

const mediaSnapshotSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative(),
  url: z.string().min(1),
  createdAt: z.string(),
  bytesBase64: z.string(),
});

const snapshotSchema = z.object({
  version: z.literal(1).optional().default(1),
  seededAt: z.string().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().optional().default(() => new Date().toISOString()),
  categories: z.array(categorySnapshotSchema),
  products: z.array(productSnapshotSchema),
  media: z.array(mediaSnapshotSchema).optional().default([]),
});

const seedActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reset"),
  }),
  z.object({
    action: z.literal("import"),
    snapshot: snapshotSchema,
  }),
]);

export async function GET(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const snapshot = await exportCustomStoreSnapshot();
  return Response.json(snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
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

  const parsed = seedActionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid seed action payload.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  if (parsed.data.action === "reset") {
    const snapshot = await resetCustomStoreToSeed();
    await revalidateCmsStorefront();
    return Response.json(
      {
        ok: true,
        action: "reset",
        snapshot,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const snapshotInput: CustomCmsSnapshot = parsed.data.snapshot;
  const imported = await importCustomStoreSnapshot(snapshotInput);
  await revalidateCmsStorefront();
  return Response.json(
    {
      ok: true,
      action: "import",
      snapshot: imported,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
