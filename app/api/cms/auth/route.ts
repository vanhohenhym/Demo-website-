import { z } from "zod";
import {
  createAdminCookieValue,
  formatAdminClearCookieHeader,
  formatAdminSetCookieHeader,
  isAdminRequest,
  isSecureRequest,
  resolveAdminTokenConfig,
  verifyAdminToken,
} from "../../../../lib/cms/admin-auth.ts";

const loginSchema = z.object({
  token: z.string().trim().min(1, "Admin token is required."),
});

export async function GET(req: Request): Promise<Response> {
  const [authenticated, config] = await Promise.all([
    isAdminRequest(req),
    resolveAdminTokenConfig(),
  ]);

  return Response.json(
    {
      authenticated,
      configured: config.isConfigured,
      isProduction: config.isProduction,
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
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body.", authenticated: false },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Admin token is required.",
        authenticated: false,
      },
      { status: 400 }
    );
  }

  const valid = await verifyAdminToken(parsed.data.token);
  if (!valid) {
    return Response.json(
      { error: "Invalid CMS admin token.", authenticated: false },
      { status: 401 }
    );
  }

  const cookieValue = await createAdminCookieValue();
  if (!cookieValue) {
    return Response.json(
      {
        error: "CMS admin authentication is not configured.",
        authenticated: false,
      },
      { status: 401 }
    );
  }

  const secure = isSecureRequest(req);
  return Response.json(
    { authenticated: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": formatAdminSetCookieHeader(cookieValue, secure),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function DELETE(req: Request): Promise<Response> {
  const secure = isSecureRequest(req);
  return Response.json(
    { authenticated: false },
    {
      status: 200,
      headers: {
        "Set-Cookie": formatAdminClearCookieHeader(secure),
        "Cache-Control": "no-store",
      },
    }
  );
}
