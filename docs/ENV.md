# Environment Variables Specification

| Variable Name | Required | Default Value | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` | Canonical site base URL used for sitemaps, OpenGraph metadata, and canonical links (trailing slashes are stripped by `normalizeBaseUrl()`). |
| `CMS_PROVIDER` | No | `mock` | Selected CMS adapter. Options: `mock`, `custom`, `wp-posts` (aliases: `wordpress`, `wp`, `wp-rest`), `woocommerce`, `generic-rest`. Configured as `custom` in `.env.local` and `cloudflare.config.ts`. |
| `CMS_ENDPOINT` | If WP/WC/REST | `""` | Base API URL of external CMS (e.g. `https://public-api.wordpress.com/wp/v2/sites/your-site.wordpress.com` for `wp-posts`, or `https://my-store.com/wp-json/wc/v3` for `woocommerce`). Unused when `CMS_PROVIDER=custom`. |
| `CMS_KEY` | If WC (Optional WP/REST) | `""` | WooCommerce Consumer Key, `wp-posts` Username/Bearer Token, or `generic-rest` Bearer Token. |
| `CMS_SECRET` | If WC (Optional WP) | `""` | WooCommerce Consumer Secret or WordPress Application Password (paired with `CMS_KEY` for HTTP Basic auth). |
| `CMS_ADMIN_TOKEN` | Yes (in production if `/admin` enabled) | Falls back to `DATA_HEALTH_TOKEN` (`demo-health-token-secret` non-prod only) | Secret authorization token required to sign into `/admin` and call `/api/cms/*` mutations/reads. In `NODE_ENV === "production"`, an explicit `CMS_ADMIN_TOKEN` (or `DATA_HEALTH_TOKEN`) must be set (no demo fallback). |
| `DATA_HEALTH_TOKEN` | Yes (in production) | `demo-health-token-secret` (non-production only) | Secret authorization token required to access `/data-health?token=...`. When `NODE_ENV === "production"`, `DATA_HEALTH_TOKEN` must be explicitly configured (no demo fallback; requests are denied if unset). |
| `NEXT_PUBLIC_GA_ID` | No | `""` | Google Analytics 4 Measurement ID (e.g. `G-XXXXXXXXXX`; validated with `^G-[A-Z0-9]{4,20}$/i`). GA4 scripts load only after explicit Cookie Consent opt-in (`pc_cookie_consent`). |
| `NEXT_PUBLIC_GSC_VERIFICATION` | No | `""` | Google Search Console verification token injected dynamically into `metadata.verification.google` (`google-site-verification`). |
| `RESEND_API_KEY` | If Contact Resend | `""` | Resend API key for HTTPS email delivery (`https://api.resend.com/emails`). Highest contact transport priority when non-empty. |
| `SMTP_HOST` | If Contact SMTP | `""` | Outgoing SMTP server host for contact form inquiries (used when `RESEND_API_KEY` is unset). |
| `SMTP_PORT` | If Contact SMTP | `587` | Outgoing SMTP server port (`587` for `STARTTLS`, `465` for implicit TLS). |
| `SMTP_SECURE` | No | `false` | Set `"true"` for implicit TLS (`tls.connect`); automatically `true` when `SMTP_PORT=465`. When `false`, upgrades via `STARTTLS` if advertised. |
| `SMTP_USER` | If Contact SMTP Auth | `""` | Outgoing SMTP account username for `AUTH LOGIN` (also serves as `From` fallback if `CONTACT_FROM_EMAIL` is unset). |
| `SMTP_PASS` | If Contact SMTP Auth | `""` | Outgoing SMTP account password for `AUTH LOGIN`. |
| `CONTACT_FROM_EMAIL` | No | `""` (fallback: `SMTP_USER` -> `no-reply@example.com`) | Sender `From` header/envelope address for outgoing contact emails (`Name <addr@domain>` or `addr@domain`). |
| `CONTACT_RECEIVER_EMAIL` | No | `support@example.com` | Destination inbox address for contact form submissions. |

## Security, Storage, Transport & Analytics Precedence

1. **Custom CMS Admin Authorization (`lib/cms/admin-auth.ts`)**:
   - Resolves secret from `CMS_ADMIN_TOKEN || DATA_HEALTH_TOKEN` (reading Cloudflare Workers `env` bindings via dynamic `cloudflare:workers` import when available, then `process.env`).
   - In production (`NODE_ENV === "production"`), an explicit token is **required** with zero demo fallback; in non-production environments, unset tokens fall back to `demo-health-token-secret`.
   - Authenticates `/admin` (`POST /api/cms/auth`) via an `HttpOnly`, `SameSite=Lax` HMAC-SHA256 cookie (`pc_cms_admin`), and supports `Authorization: Bearer <token>` or `?token=<token>` on `/api/cms/*` API routes.
2. **Custom CMS Storage Binding (`cloudflare.config.ts`, `lib/cms/custom-store.ts`)**:
   - In Cloudflare Workers (`cf deploy --provision`), `CMS_STORE` (`bindings.kv()`) stores catalog products, categories, and media binaries persistently in Cloudflare KV.
   - In local Node.js development and `node --test`, data persists in `.data/custom-cms.json` (git-ignored) with an automatic in-memory fallback.
3. **Data Health Authorization (`app/data-health/page.tsx`)**:
   - In production (`NODE_ENV === "production"`), `DATA_HEALTH_TOKEN` is **required** with no demo fallback; requests without a matching `?token=<DATA_HEALTH_TOKEN>` (or when the env var is unset) are denied.
   - In non-production environments, an unset `DATA_HEALTH_TOKEN` falls back to `demo-health-token-secret` (and local `development` permits access when unset).
4. **Contact Email Transport (`resolveEmailTransportConfig` in `lib/contact/mailer.ts`)**:
   - `RESEND_API_KEY` set -> sends via Resend REST API (`POST https://api.resend.com/emails`).
   - Else `SMTP_HOST` set -> sends via native `node:net`/`node:tls` SMTP (`tls.connect` when `SMTP_SECURE=true` or `SMTP_PORT=465`; otherwise TCP with `STARTTLS` upgrade when advertised and optional `AUTH LOGIN`).
   - Else unconfigured -> safe `demo` fallback (`delivered: false`, HTTP `200` `deliveryMode: "demo"` so inquiries succeed cleanly without external credentials).
5. **Consent-Gated GA4 (`components/analytics/GoogleAnalytics.tsx`)**:
   - Reads `NEXT_PUBLIC_GA_ID` in `app/layout.tsx`; does **not** inject GA4 `<Script>` tags until `pc_cookie_consent` in `localStorage` has `analytics: true`, and disables tracking via `window["ga-disable-<id>"] = true` + `gtag("consent", "update", { analytics_storage: "denied" })` on revocation.
