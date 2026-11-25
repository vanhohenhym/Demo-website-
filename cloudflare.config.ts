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
      CMS_PROVIDER: bindings.text("wp-posts"),
      CMS_ENDPOINT: bindings.text(
        "https://public-api.wordpress.com/wp/v2/sites/shahriarnadimcom.wordpress.com"
      ),
    },
  }),
});
