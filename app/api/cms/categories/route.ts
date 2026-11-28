import { z } from "zod";
import { revalidateCmsStorefront } from "../_revalidate.ts";
import {
  cmsUnauthorizedResponse,
  isAdminRequest,
} from "../../../../lib/cms/admin-auth.ts";
import {
  deleteCustomCategory,
  listCustomCategories,
  listCustomProducts,
  upsertCustomCategory,
} from "../../../../lib/cms/custom-store.ts";

const categorySchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, "Category name is required."),
  slug: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  parentSlug: z.string().nullable().optional(),
});

export async function GET(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const [rawCategories, allProducts] = await Promise.all([
    listCustomCategories(),
    listCustomProducts({ includeDrafts: true }),
  ]);

  const categories = rawCategories.map((cat) => {
    const slugLower = cat.slug.trim().toLowerCase();
    let productCount = 0;
    let publishedCount = 0;
    for (const product of allProducts) {
      const matchesPrimary =
        product.categorySlug.trim().toLowerCase() === slugLower;
      const matchesSub = (product.subCategorySlugs ?? []).some(
        (sub) => sub.trim().toLowerCase() === slugLower
      );
      if (matchesPrimary || matchesSub) {
        productCount += 1;
        if (product.status === "publish") {
          publishedCount += 1;
        }
      }
    }
    return {
      ...cat,
      productCount,
      publishedCount,
    };
  });

  return Response.json(
    { categories },
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

  const parsed = categorySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid category payload.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  try {
    const existing = await listCustomCategories();
    const candidateSlug = (parsed.data.slug || parsed.data.name)
      .trim()
      .toLowerCase();
    const isUpdate = existing.some(
      (c) =>
        (parsed.data.id && c.id === parsed.data.id) ||
        c.slug.trim().toLowerCase() === candidateSlug
    );
    const category = await upsertCustomCategory(parsed.data);
    await revalidateCmsStorefront({ categorySlug: category.slug });
    return Response.json(
      { category },
      {
        status: isUpdate ? 200 : 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save category.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const slug = new URL(req.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return Response.json(
      { error: "Query parameter ?slug= is required." },
      { status: 400 }
    );
  }

  const deleted = await deleteCustomCategory(slug);
  if (!deleted) {
    return Response.json(
      { error: "Category not found." },
      { status: 404 }
    );
  }
  await revalidateCmsStorefront({ categorySlug: slug });

  return Response.json(
    { deleted: true, slug },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
