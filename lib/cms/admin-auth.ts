import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const CMS_ADMIN_COOKIE_NAME = "pc_cms_admin";
export const CMS_ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const DEFAULT_DEV_ADMIN_TOKEN = "demo-health-token-secret";

interface CloudflareWorkersModule {
  env?: Record<string, unknown>;
}

interface AdminTokenConfig {
  expectedToken: string;
  isProduction: boolean;
  isConfigured: boolean;
}

async function readCloudflareEnvString(key: string): Promise<string> {
  try {
    const cfSpecifier = "cloudflare:workers";
    const mod = (await import(
      /* webpackIgnore: true */ /* @vite-ignore */ cfSpecifier
    )) as CloudflareWorkersModule;
    const raw = mod?.env?.[key];
    return typeof raw === "string" ? raw.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Resolves the active CMS admin token from environment variables or Cloudflare Worker bindings.
 * In production, explicit configuration is mandatory (never falls back to demo token).
 */
export async function resolveAdminTokenConfig(): Promise<AdminTokenConfig> {
  const processToken =
    process.env.CMS_ADMIN_TOKEN?.trim() ||
    process.env.DATA_HEALTH_TOKEN?.trim() ||
    "";

  const cfToken =
    processToken ||
    (await readCloudflareEnvString("CMS_ADMIN_TOKEN")) ||
    (await readCloudflareEnvString("DATA_HEALTH_TOKEN"));

  const isProduction = process.env.NODE_ENV === "production";
  const expectedToken = isProduction
    ? cfToken
    : cfToken || DEFAULT_DEV_ADMIN_TOKEN;

  return {
    expectedToken,
    isProduction,
    isConfigured: Boolean(expectedToken),
  };
}

function sha256Digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function constantTimeEquals(a: string, b: string): boolean {
  if (!a || !b) return false;
  return timingSafeEqual(sha256Digest(a), sha256Digest(b));
}

function deriveSigningKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("pc_cms_admin_cookie_v1").digest();
}

function signCookiePayload(payload: string, secret: string): string {
  return createHmac("sha256", deriveSigningKey(secret))
    .update(payload)
    .digest("hex");
}

/**
 * Verifies a plaintext admin token against the configured CMS/Data Health token.
 */
export async function verifyAdminToken(token: string): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed) return false;
  const { expectedToken } = await resolveAdminTokenConfig();
  if (!expectedToken) return false;
  return constantTimeEquals(trimmed, expectedToken);
}

/**
 * Creates a signed HMAC-SHA256 session token for the httpOnly `pc_cms_admin` cookie.
 */
export async function createAdminCookieValue(
  nowMs: number = Date.now()
): Promise<string | null> {
  const { expectedToken } = await resolveAdminTokenConfig();
  if (!expectedToken) return null;

  const issuedAt = Math.floor(nowMs);
  const expiresAt = issuedAt + CMS_ADMIN_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${issuedAt}.${expiresAt}`;
  const signature = signCookiePayload(payload, expectedToken);
  return `${payload}.${signature}`;
}

/**
 * Verifies the signed `pc_cms_admin` cookie value.
 */
export async function verifyAdminCookieValue(
  cookieValue: string | undefined,
  nowMs: number = Date.now()
): Promise<boolean> {
  if (!cookieValue) return false;
  const { expectedToken } = await resolveAdminTokenConfig();
  if (!expectedToken) return false;

  const parts = cookieValue.trim().split(".");
  if (parts.length !== 4) return false;

  const [version, issuedRaw, expiresRaw, signature] = parts;
  if (version !== "v1" || !issuedRaw || !expiresRaw || !signature) {
    return false;
  }

  const issuedAt = Number(issuedRaw);
  const expiresAt = Number(expiresRaw);
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= issuedAt ||
    nowMs >= expiresAt
  ) {
    return false;
  }

  const payload = `${version}.${issuedRaw}.${expiresRaw}`;
  const expectedSig = signCookiePayload(payload, expectedToken);

  const actualBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(actualBuf, expectedBuf);
}

function parseCookieHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  const segments = header.split(";");
  for (const segment of segments) {
    const eqIndex = segment.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = segment.slice(0, eqIndex).trim();
    if (key !== name) continue;
    const rawValue = segment.slice(eqIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return undefined;
}

function extractBearerToken(header: string | null): string {
  if (!header) return "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function extractQueryToken(reqUrl: string): string {
  try {
    const parsed = new URL(reqUrl);
    return parsed.searchParams.get("token")?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Checks whether an incoming Request is authenticated as a CMS admin via:
 * 1. `Authorization: Bearer <token>`
 * 2. `?token=<token>` query parameter
 * 3. Signed httpOnly cookie `pc_cms_admin`
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const bearer = extractBearerToken(req.headers.get("authorization"));
  if (bearer && (await verifyAdminToken(bearer))) {
    return true;
  }

  const queryToken = extractQueryToken(req.url);
  if (queryToken && (await verifyAdminToken(queryToken))) {
    return true;
  }

  const cookieValue = parseCookieHeader(
    req.headers.get("cookie"),
    CMS_ADMIN_COOKIE_NAME
  );
  if (cookieValue && (await verifyAdminCookieValue(cookieValue))) {
    return true;
  }

  return false;
}

/**
 * Server Component helper checking the `pc_cms_admin` httpOnly cookie via `next/headers`.
 */
export async function isAdminCookieAuthenticated(): Promise<boolean> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const value = cookieStore.get(CMS_ADMIN_COOKIE_NAME)?.value;
    return await verifyAdminCookieValue(value);
  } catch {
    return false;
  }
}

/** Alias for Server Components checking admin authentication. */
export const isAdminAuthenticated = isAdminCookieAuthenticated;

export function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim().toLowerCase() === "https";
  }
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function formatAdminSetCookieHeader(
  cookieValue: string,
  secure: boolean
): string {
  const parts = [
    `${CMS_ADMIN_COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${CMS_ADMIN_COOKIE_MAX_AGE_SECONDS}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function formatAdminClearCookieHeader(secure: boolean): string {
  const parts = [
    `${CMS_ADMIN_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function cmsUnauthorizedResponse(): Response {
  return Response.json(
    { error: "Unauthorized. Valid CMS admin credentials required." },
    { status: 401 }
  );
}
