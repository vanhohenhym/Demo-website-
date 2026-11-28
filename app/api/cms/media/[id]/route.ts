import {
  cmsUnauthorizedResponse,
  isAdminRequest,
} from "../../../../../lib/cms/admin-auth.ts";
import {
  deleteCustomMedia,
  getCustomMedia,
} from "../../../../../lib/cms/custom-store.ts";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Public image endpoint so storefront `<img>` / `<SafeProductImage />` can render uploaded CMS media.
 */
export async function GET(
  _req: Request,
  context: RouteContext
): Promise<Response> {
  const { id } = await context.params;
  const record = await getCustomMedia(id);
  if (!record) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

  const buffer = Buffer.from(record.bytesBase64, "base64");
  const bytes = new Uint8Array(buffer);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": record.mimeType || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(
  req: Request,
  context: RouteContext
): Promise<Response> {
  if (!(await isAdminRequest(req))) {
    return cmsUnauthorizedResponse();
  }

  const { id } = await context.params;
  const deleted = await deleteCustomMedia(id);
  if (!deleted) {
    return Response.json({ error: "Media not found." }, { status: 404 });
  }

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
