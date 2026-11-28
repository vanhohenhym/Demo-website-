import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

export default defineConfig({
  accountId: "fadcaab79d1f63a8c0686b33d8a092a4",
  worker: defineWorker({
    ...cache,
    name: "demo-website",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-25",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      // Custom built-in CMS backed by Cloudflare KV (auto-provisioned via `cf deploy --provision`)
      CMS_STORE: bindings.kv({ id: "fd8943544c89459abb4180af1d255659" }),
      CMS_PROVIDER: bindings.text("custom"),
      NEXT_PUBLIC_SITE_URL: bindings.text(
        "https://demo-website.shahriarrahmannadim.workers.dev"
      ),
      // Fallback external CMS endpoint if switching CMS_PROVIDER back to wp-posts / woocommerce / generic-rest
      CMS_ENDPOINT: bindings.text(
        "https://public-api.wordpress.com/wp/v2/sites/shahriarnadimcom.wordpress.com"
      ),
    },
  }),
});
