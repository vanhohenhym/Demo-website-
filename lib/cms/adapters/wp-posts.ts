import type { ICMSAdapter } from "../adapter.ts";
import { loadBrandConfigs, loadSkuOverrides } from "../config-loader.ts";
import {
  BRAND_TAXONOMY_KEYS,
  COMPONENT_TYPE_SLUG_MAP,
  normalizeAvailability,
  parseDescriptionSpecs,
  parsePriceValue,
} from "../field-map.ts";
import { getCategoryBrands } from "../normalize/brands.ts";
import {
  buildCategoriesWithCounts,
  normalizeRawProducts,
} from "../normalize/pipeline.ts";
import {
  getEffectivePrice,
  queryProducts,
  summarizeUnmappedAttributes,
} from "../query-engine.ts";
import type {
  Brand,
  CatalogQueryParams,
  CatalogQueryResult,
  Category,
  KeyValuePair,
  Product,
  ProductImage,
  RawAdapterProduct,
  RawCmsCategoryInput,
  UnmappedAttributeSummary,
} from "../types.ts";

export interface WpRenderedField {
  rendered?: string;
}

export interface WpCategoryPayload {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent?: number;
  count?: number;
}

export interface WpEmbeddedTerm {
  id?: number;
  name?: string;
  slug?: string;
  taxonomy?: string;
  parent?: number;
}

export interface WpMediaPayload {
  id?: number;
  source_url?: string;
  alt_text?: string;
  title?: WpRenderedField;
}

export interface WpPostPayload {
  id: number | string;
  slug?: string;
  status?: string;
  date?: string;
  date_gmt?: string;
  sticky?: boolean;
  title?: WpRenderedField | string;
  excerpt?: WpRenderedField | string;
  content?: WpRenderedField | string;
  categories?: number[];
  tags?: number[];
  meta?: Record<string, unknown>;
  _embedded?: {
    "wp:term"?: WpEmbeddedTerm[][];
    "wp:featuredmedia"?: WpMediaPayload[];
  };
}

export interface WpPostsAdapterConfig {
  endpoint?: string;
  apiKey?: string;
  apiSecret?: string;
  fetchFn?: typeof fetch;
  logUnmapped?: boolean;
  logger?: (message: string) => void;
  cacheTtlMs?: number;
  timeoutMs?: number;
}

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_WP_PAGES = 10;

const COMMERCIAL_PRICE_KEYS = new Set([
  "price",
  "regular price",
  "regular_price",
  "mrp",
  "list price",
  "list_price",
]);
const COMMERCIAL_SALE_PRICE_KEYS = new Set([
  "sale price",
  "sale_price",
  "discount price",
  "discount_price",
  "offer price",
  "offer_price",
  "flash price",
  "flash_price",
]);
const COMMERCIAL_SKU_KEYS = new Set([
  "sku",
  "part number",
  "part_number",
  "model code",
  "model_code",
]);
const COMMERCIAL_AVAILABILITY_KEYS = new Set([
  "availability",
  "stock",
  "stock status",
  "stock_status",
]);
const COMMERCIAL_QTY_KEYS = new Set([
  "stock quantity",
  "stock_quantity",
  "qty",
  "quantity",
]);
const COMMERCIAL_WARRANTY_KEYS = new Set(["warranty"]);
const COMMERCIAL_FEATURED_KEYS = new Set([
  "featured",
  "is featured",
  "is_featured",
]);
const COMMERCIAL_FLASH_KEYS = new Set([
  "flash deal",
  "flash_deal",
  "is flash deal",
  "is_flash_deal",
  "deal",
]);

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
    })
    .replace(/&#([0-9]+);/g, (_match, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _match;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, "-");
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getRenderedText(field?: WpRenderedField | string): string {
  if (!field) {
    return "";
  }
  if (typeof field === "string") {
    return field;
  }
  return field.rendered ?? "";
}

function isBrandKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return BRAND_TAXONOMY_KEYS.includes(normalized) || normalized === "manufacturer";
}

function isIgnoredWpMetaKey(key: string): boolean {
  const lower = key.trim().toLowerCase();
  return (
    !lower ||
    lower.startsWith("_") ||
    lower.startsWith("jetpack_") ||
    lower.startsWith("wp_") ||
    lower === "footnotes" ||
    lower === "amp_status" ||
    lower === "spay_email" ||
    lower === "wordads_ufa"
  );
}
function isBooleanTruthy(value: string): boolean {
  const norm = value.trim().toLowerCase();
  return norm === "true" || norm === "1" || norm === "yes" || norm === "on";
}

function normalizeSpecKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Extracts `Key: Value` pairs from WordPress block HTML (<p>, <br>, <div>, <li>, <table>)
 * without duplicating entries already parsed by `parseDescriptionSpecs()`.
 */
function extractWpContentPairs(html: string): KeyValuePair[] {
  const tableAndListPairs = parseDescriptionSpecs(html);
  const seen = new Set(
    tableAndListPairs.map(
      (p) => `${p.key.trim().toLowerCase()}::${p.value.trim().toLowerCase()}`
    )
  );
  const combined: KeyValuePair[] = [...tableAndListPairs];

  const blockLines = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, "\n")
    .split(/\r?\n/);

  for (const rawLine of blockLines) {
    const line = stripHtml(rawLine);
    const colonIdx = line.indexOf(":");
    if (colonIdx < 2 || colonIdx > 45) {
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    const lowerKey = key.toLowerCase();
    if (!key || !value) {
      continue;
    }
    if (
      lowerKey === "http" ||
      lowerKey === "https" ||
      lowerKey.startsWith("note")
    ) {
      continue;
    }

    const sig = `${lowerKey}::${value.toLowerCase()}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      combined.push({ key, value });
    }
  }

  return combined;
}

function extractInlineContentImages(
  html: string,
  fallbackAlt: string,
  existingUrls: Set<string>
): ProductImage[] {
  const images: ProductImage[] = [];
  const imgRegex = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null = imgRegex.exec(html);

  while (match !== null) {
    const tag = match[0];
    const src = decodeHtmlEntities(match[1].trim());
    if (src && !existingUrls.has(src)) {
      existingUrls.add(src);
      const altMatch = /\balt\s*=\s*["']([^"']*)["']/i.exec(tag);
      images.push({
        url: src,
        alt: altMatch?.[1] ? decodeHtmlEntities(altMatch[1].trim()) : fallbackAlt,
      });
    }
    match = imgRegex.exec(html);
  }

  return images;
}

function resolvePostCategories(
  post: WpPostPayload,
  categoryById?: ReadonlyMap<number, WpCategoryPayload>
): WpCategoryPayload[] {
  const embeddedGroups = post._embedded?.["wp:term"] ?? [];
  const embeddedCats: WpCategoryPayload[] = [];
  for (const group of embeddedGroups) {
    for (const term of group) {
      if (
        term.taxonomy === "category" &&
        typeof term.slug === "string" &&
        term.slug.trim()
      ) {
        embeddedCats.push({
          id: term.id ?? 0,
          name: decodeHtmlEntities(term.name ?? term.slug),
          slug: term.slug.trim(),
          parent: term.parent,
        });
      }
    }
  }

  if (embeddedCats.length > 0) {
    return embeddedCats;
  }

  const resolved: WpCategoryPayload[] = [];
  for (const catId of post.categories ?? []) {
    const found = categoryById?.get(catId);
    if (found) {
      resolved.push({
        ...found,
        name: decodeHtmlEntities(found.name),
      });
    }
  }
  return resolved;
}

function resolvePostTags(post: WpPostPayload): WpEmbeddedTerm[] {
  const embeddedGroups = post._embedded?.["wp:term"] ?? [];
  const tags: WpEmbeddedTerm[] = [];
  for (const group of embeddedGroups) {
    for (const term of group) {
      if (term.taxonomy === "post_tag") {
        tags.push(term);
      }
    }
  }
  return tags;
}

function selectLeafWpCategory(
  categories: readonly WpCategoryPayload[]
): WpCategoryPayload | undefined {
  for (let i = categories.length - 1; i >= 0; i -= 1) {
    const candidate = categories[i];
    const normalizedSlug = candidate.slug.trim().toLowerCase();
    if (
      normalizedSlug &&
      Object.prototype.hasOwnProperty.call(
        COMPONENT_TYPE_SLUG_MAP,
        normalizedSlug
      )
    ) {
      return candidate;
    }
  }

  for (let i = categories.length - 1; i >= 0; i -= 1) {
    if (categories[i].slug.trim().toLowerCase() !== "uncategorized") {
      return categories[i];
    }
  }

  return categories[categories.length - 1] ?? categories[0];
}

function isPlaceholderHelloWorld(
  post: WpPostPayload,
  categories: readonly WpCategoryPayload[],
  hasCommercialData: boolean
): boolean {
  if (hasCommercialData) {
    return false;
  }
  const slug = (post.slug ?? "").trim().toLowerCase();
  if (slug !== "hello-world") {
    return false;
  }
  return (
    categories.length === 0 ||
    categories.every((cat) => cat.slug.trim().toLowerCase() === "uncategorized")
  );
}

/**
 * Maps a WordPress REST v2 Post payload (with optional `_embedded` terms/media
 * and pre-loaded category lookup map) into the shared `RawAdapterProduct` contract.
 */
export function mapWpPostToRaw(
  post: WpPostPayload,
  categoryById?: ReadonlyMap<number, WpCategoryPayload>
): RawAdapterProduct {
  const title = stripHtml(getRenderedText(post.title)) || `Product #${post.id}`;
  const descriptionHtml = getRenderedText(post.content);
  const shortDescription = stripHtml(getRenderedText(post.excerpt)) || undefined;

  const categories = resolvePostCategories(post, categoryById);
  const primaryCategory = selectLeafWpCategory(categories);
  const categorySlug = primaryCategory?.slug || "uncategorized";
  const categoryName = primaryCategory?.name || "Uncategorized";
  const subCategorySlugs = categories.map((c) => c.slug).filter(Boolean);

  const rawPairs = extractWpContentPairs(descriptionHtml);
  if (post.meta) {
    for (const [key, val] of Object.entries(post.meta)) {
      if (
        !isIgnoredWpMetaKey(key) &&
        (typeof val === "string" ||
          typeof val === "number" ||
          typeof val === "boolean")
      ) {
        const valStr = String(val).trim();
        if (valStr) {
          rawPairs.push({ key, value: valStr });
        }
      }
    }
  }

  const tags = resolvePostTags(post);
  let tagFeatured = false;
  let tagFlashDeal = false;
  let tagAvailabilityRaw: string | undefined;

  for (const tag of tags) {
    const tagName = decodeHtmlEntities(tag.name ?? "").trim();
    const tagSlug = (tag.slug ?? tagName).trim().toLowerCase();
    if (!tagSlug) {
      continue;
    }

    if (tagSlug === "featured") {
      tagFeatured = true;
      continue;
    }
    if (tagSlug === "flash-deal" || tagSlug === "flash_deal" || tagSlug === "deal") {
      tagFlashDeal = true;
      continue;
    }
    if (
      tagSlug === "out-of-stock" ||
      tagSlug === "in-stock" ||
      tagSlug === "preorder" ||
      tagSlug === "upcoming"
    ) {
      tagAvailabilityRaw = tagSlug;
      continue;
    }

    const colonIdx = tagName.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30) {
      rawPairs.push({
        key: tagName.slice(0, colonIdx).trim(),
        value: tagName.slice(colonIdx + 1).trim(),
      });
    }
  }

  let price: number | undefined;
  let salePrice: number | undefined;
  let sku = "";
  let brandTaxonomy: string | undefined;
  let availabilityRaw: string | undefined = tagAvailabilityRaw;
  let stockQuantity: number | undefined;
  let warranty: string | undefined;
  let isFeatured = Boolean(post.sticky) || tagFeatured;
  let isFlashDeal = tagFlashDeal;

  const hardwarePairs: KeyValuePair[] = [];

  for (const pair of rawPairs) {
    const normKey = normalizeSpecKey(pair.key);
    if (COMMERCIAL_PRICE_KEYS.has(normKey)) {
      price ??= parsePriceValue(pair.value);
      continue;
    }
    if (COMMERCIAL_SALE_PRICE_KEYS.has(normKey)) {
      salePrice ??= parsePriceValue(pair.value);
      continue;
    }
    if (COMMERCIAL_SKU_KEYS.has(normKey)) {
      if (!sku) {
        sku = pair.value.trim();
      }
      continue;
    }
    if (COMMERCIAL_AVAILABILITY_KEYS.has(normKey)) {
      availabilityRaw = pair.value;
      continue;
    }
    if (COMMERCIAL_QTY_KEYS.has(normKey)) {
      const parsedQty = Number.parseInt(pair.value.replace(/[^0-9-]/g, ""), 10);
      if (Number.isFinite(parsedQty)) {
        stockQuantity = parsedQty;
      }
      continue;
    }
    if (COMMERCIAL_WARRANTY_KEYS.has(normKey)) {
      warranty ??= pair.value.trim();
      continue;
    }
    if (COMMERCIAL_FEATURED_KEYS.has(normKey)) {
      isFeatured = isFeatured || isBooleanTruthy(pair.value);
      continue;
    }
    if (COMMERCIAL_FLASH_KEYS.has(normKey)) {
      isFlashDeal = isFlashDeal || isBooleanTruthy(pair.value);
      continue;
    }

    if (!brandTaxonomy && isBrandKey(normKey)) {
      brandTaxonomy = pair.value.trim();
    }

    hardwarePairs.push(pair);
  }

  if (price === undefined && salePrice !== undefined) {
    price = salePrice;
    salePrice = undefined;
  }
  if (
    price !== undefined &&
    salePrice !== undefined &&
    salePrice > 0 &&
    salePrice < price
  ) {
    isFlashDeal = true;
  }

  const images: ProductImage[] = [];
  const seenUrls = new Set<string>();
  for (const media of post._embedded?.["wp:featuredmedia"] ?? []) {
    const url = media.source_url?.trim();
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({
        url,
        alt: decodeHtmlEntities(media.alt_text?.trim() || title),
      });
    }
  }
  images.push(...extractInlineContentImages(descriptionHtml, title, seenUrls));

  return {
    id: String(post.id),
    sku: sku || `WP-${String(post.id)}`,
    title,
    slug: post.slug?.trim() || undefined,
    categorySlug,
    categoryName,
    subCategorySlugs,
    brandTaxonomy,
    price,
    salePrice,
    availability: normalizeAvailability(availabilityRaw, stockQuantity),
    stockQuantity,
    images,
    shortDescription,
    descriptionHtml,
    explicitAttributes: hardwarePairs,
    customFields: [],
    descriptionSpecs: hardwarePairs,
    warranty,
    isFeatured,
    isFlashDeal,
    createdAt: post.date_gmt ?? post.date,
  };
}

function buildWpAuthHeaders(
  apiKey: string,
  apiSecret: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey && apiSecret) {
    const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export class WpPostsCmsAdapter implements ICMSAdapter {
  readonly providerName = "wp-posts" as const;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly fetchFn: typeof fetch;
  private readonly logUnmapped?: boolean;
  private readonly logger?: (message: string) => void;
  private readonly cacheTtlMs: number;
  private readonly timeoutMs: number;
  private cachedProducts: { data: Product[]; expiresAt: number } | null = null;
  private inflightProducts: Promise<Product[]> | null = null;
  private cacheEpoch = 0;

  constructor(config: WpPostsAdapterConfig = {}) {
    this.endpoint = (config.endpoint ?? process.env.CMS_ENDPOINT ?? "").replace(
      /\/+$/,
      ""
    );
    this.apiKey = config.apiKey ?? process.env.CMS_KEY ?? "";
    this.apiSecret = config.apiSecret ?? process.env.CMS_SECRET ?? "";
    this.fetchFn = config.fetchFn ?? fetch;
    this.logUnmapped = config.logUnmapped;
    this.logger = config.logger;
    this.cacheTtlMs =
      config.cacheTtlMs !== undefined && Number.isFinite(config.cacheTtlMs)
        ? Math.max(0, config.cacheTtlMs)
        : DEFAULT_CACHE_TTL_MS;
    this.timeoutMs =
      config.timeoutMs !== undefined &&
      Number.isFinite(config.timeoutMs) &&
      config.timeoutMs > 0
        ? config.timeoutMs
        : DEFAULT_TIMEOUT_MS;
  }

  clearCache(): void {
    this.cacheEpoch += 1;
    this.cachedProducts = null;
    this.inflightProducts = null;
  }

  private async requestJsonWithHeaders<T>(
    resourcePath: string,
    query: Record<string, string> = {}
  ): Promise<{ data: T; totalPages: number }> {
    if (!this.endpoint) {
      throw new Error(
        "WordPress Posts adapter requires CMS_ENDPOINT to be configured (e.g. https://public-api.wordpress.com/wp/v2/sites/your-site.wordpress.com)."
      );
    }

    const url = new URL(`${this.endpoint}/${resourcePath.replace(/^\/+/, "")}`);
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }

    const response = await this.fetchFn(url.toString(), {
      headers: buildWpAuthHeaders(this.apiKey, this.apiSecret),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `WordPress REST API error (${response.status} ${response.statusText}) for ${resourcePath}`
      );
    }

    const totalPagesHeader = response.headers.get("X-WP-TotalPages");
    const parsedPages = totalPagesHeader
      ? Number.parseInt(totalPagesHeader, 10)
      : 1;
    const totalPages =
      Number.isFinite(parsedPages) && parsedPages >= 1
        ? Math.min(parsedPages, MAX_WP_PAGES)
        : 1;

    const data = (await response.json()) as T;
    return { data, totalPages };
  }

  private async fetchAllPaginated<T>(
    resourcePath: string,
    baseQuery: Record<string, string>
  ): Promise<T[]> {
    const first = await this.requestJsonWithHeaders<T[]>(resourcePath, {
      ...baseQuery,
      per_page: baseQuery.per_page ?? "100",
      page: "1",
    });

    const items = Array.isArray(first.data) ? [...first.data] : [];
    for (let page = 2; page <= first.totalPages; page += 1) {
      const next = await this.requestJsonWithHeaders<T[]>(resourcePath, {
        ...baseQuery,
        per_page: baseQuery.per_page ?? "100",
        page: String(page),
      });
      if (Array.isArray(next.data)) {
        items.push(...next.data);
      }
    }

    return items;
  }

  async getAllProducts(): Promise<Product[]> {
    if (
      this.cacheTtlMs > 0 &&
      this.cachedProducts &&
      Date.now() < this.cachedProducts.expiresAt
    ) {
      return [...this.cachedProducts.data];
    }

    if (this.inflightProducts) {
      return (await this.inflightProducts).slice();
    }

    const requestEpoch = this.cacheEpoch;
    const promise = Promise.all([
      this.fetchAllPaginated<WpPostPayload>("posts", {
        _embed: "true",
        status: "publish",
      }),
      this.fetchAllPaginated<WpCategoryPayload>("categories", {}).catch(
        () => [] as WpCategoryPayload[]
      ),
    ])
      .then(([rawPosts, rawCategories]) => {
        const categoryById = new Map<number, WpCategoryPayload>();
        for (const cat of rawCategories) {
          categoryById.set(cat.id, cat);
        }

        const rawProducts: RawAdapterProduct[] = [];
        for (const post of rawPosts) {
          const cats = resolvePostCategories(post, categoryById);
          const mapped = mapWpPostToRaw(post, categoryById);
          const hasCommercial =
            mapped.price !== undefined ||
            mapped.salePrice !== undefined ||
            !mapped.sku.startsWith("WP-") ||
            mapped.explicitAttributes.length > 0;
          if (isPlaceholderHelloWorld(post, cats, hasCommercial)) {
            continue;
          }
          rawProducts.push(mapped);
        }

        const normalized = normalizeRawProducts(rawProducts, {
          brandConfigs: loadBrandConfigs(),
          overridesMap: loadSkuOverrides(),
          logUnmapped: this.logUnmapped,
          logger: this.logger,
        });

        if (this.cacheTtlMs > 0 && this.cacheEpoch === requestEpoch) {
          this.cachedProducts = {
            data: normalized,
            expiresAt: Date.now() + this.cacheTtlMs,
          };
        }

        return normalized;
      })
      .finally(() => {
        if (this.inflightProducts === promise) {
          this.inflightProducts = null;
        }
      });

    this.inflightProducts = promise;
    return (await promise).slice();
  }

  async getCategories(): Promise<Category[]> {
    const [rawCategories, products] = await Promise.all([
      this.fetchAllPaginated<WpCategoryPayload>("categories", {}),
      this.getAllProducts(),
    ]);

    const categoryById = new Map<number, WpCategoryPayload>();
    for (const cat of rawCategories) {
      categoryById.set(cat.id, cat);
    }

    const hasUncategorizedProduct = products.some(
      (p) => p.categorySlug.toLowerCase() === "uncategorized"
    );

    const mapped: RawCmsCategoryInput[] = rawCategories
      .filter(
        (cat) =>
          cat.slug.toLowerCase() !== "uncategorized" || hasUncategorizedProduct
      )
      .map((cat) => ({
        id: String(cat.id),
        name: decodeHtmlEntities(cat.name),
        slug: cat.slug,
        description: cat.description ? stripHtml(cat.description) : undefined,
        parentSlug:
          cat.parent && cat.parent > 0
            ? categoryById.get(cat.parent)?.slug
            : undefined,
      }));

    return buildCategoriesWithCounts(mapped, products);
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.slug === slug) ?? null;
  }

  async getProducts(query: CatalogQueryParams): Promise<CatalogQueryResult> {
    const products = await this.getAllProducts();
    return queryProducts(products, query);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return null;
    }

    const allProducts = await this.getAllProducts();
    const fromCache = allProducts.find((p) => p.slug === normalizedSlug);
    if (fromCache) {
      return fromCache;
    }

    const res = await this.requestJsonWithHeaders<WpPostPayload[]>("posts", {
      slug: normalizedSlug,
      _embed: "true",
      status: "publish",
    });
    if (!Array.isArray(res.data) || res.data.length === 0) {
      return null;
    }

    const normalized = normalizeRawProducts([mapWpPostToRaw(res.data[0])], {
      brandConfigs: loadBrandConfigs(),
      overridesMap: loadSkuOverrides(),
      logUnmapped: this.logUnmapped,
      logger: this.logger,
    });
    return normalized[0] ?? null;
  }

  async getBrandsByCategory(categorySlug: string): Promise<Brand[]> {
    const products = await this.getAllProducts();
    return getCategoryBrands(categorySlug, products, {
      brandConfigs: loadBrandConfigs(),
    });
  }

  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter((p) => p.isFeatured).slice(0, Math.max(0, limit));
  }

  async getFlashDeals(): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter((p) => {
      const effective = getEffectivePrice(p);
      return (
        Boolean(p.isFlashDeal) ||
        (p.price !== undefined &&
          effective !== undefined &&
          effective < p.price)
      );
    });
  }

  async getUnmappedAttributes(): Promise<UnmappedAttributeSummary[]> {
    const products = await this.getAllProducts();
    return summarizeUnmappedAttributes(products);
  }
}
