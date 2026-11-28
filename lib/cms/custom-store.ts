import { RAW_MOCK_CATEGORIES, RAW_MOCK_PRODUCTS } from "./adapters/mock.ts";
import { buildMissingComponentSeedCategories } from "./component-categories.ts";
import { normalizeAvailability, slugify } from "./field-map.ts";
import type {
  Availability,
  CmsProductStatus,
  CustomCmsCategoryInput,
  CustomCmsMediaInput,
  CustomCmsMediaMetadata,
  CustomCmsMediaRecord,
  CustomCmsProductInput,
  CustomCmsProductRecord,
  CustomCmsSnapshot,
  CustomCmsStorageDriver,
  KeyValuePair,
  KvNamespaceLike,
  ProductImage,
  RawAdapterProduct,
  RawCmsCategoryInput,
} from "./types.ts";

const CATALOG_KEY = "custom-cms:catalog";
const MEDIA_INDEX_KEY = "custom-cms:media-index";
const MEDIA_ITEM_PREFIX = "custom-cms:media:";

interface CatalogPayload {
  version: 1;
  seededAt: string;
  updatedAt: string;
  categories: RawCmsCategoryInput[];
  products: CustomCmsProductRecord[];
}

interface DiskStoreFileShape {
  version: 1;
  seededAt?: string;
  updatedAt?: string;
  catalog?: CatalogPayload;
  mediaIndex?: CustomCmsMediaMetadata[];
  media?: Record<string, CustomCmsMediaRecord>;
}

let storeMutationEpoch = 0;
const cacheInvalidationListeners = new Set<() => void>();

export function getCustomStoreMutationEpoch(): number {
  return storeMutationEpoch;
}

export function onCustomStoreMutation(listener: () => void): () => void {
  cacheInvalidationListeners.add(listener);
  return () => {
    cacheInvalidationListeners.delete(listener);
  };
}

function notifyCustomStoreMutation(): void {
  storeMutationEpoch += 1;
  for (const listener of cacheInvalidationListeners) {
    try {
      listener();
    } catch {
      // Listeners must never break store mutations
    }
  }
}

let writeQueue: Promise<void> = Promise.resolve();

function withStoreLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function createMemoryStorageDriver(
  initialData: Record<string, string> = {}
): CustomCmsStorageDriver {
  const store = new Map<string, string>(Object.entries(initialData));
  return {
    kind: "memory",
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

export function createKvStorageDriver(
  kv: KvNamespaceLike
): CustomCmsStorageDriver {
  return {
    kind: "cloudflare-kv",
    async get(key: string): Promise<string | null> {
      return kv.get(key, "text");
    },
    async put(key: string, value: string): Promise<void> {
      await kv.put(key, value);
    },
    async delete(key: string): Promise<void> {
      await kv.delete(key);
    },
  };
}

interface NodeFsModule {
  mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void>;
}

interface NodePathModule {
  dirname(path: string): string;
  join(...paths: string[]): string;
}

async function loadNodeFsModules(): Promise<{
  fs: NodeFsModule;
  path: NodePathModule;
} | null> {
  try {
    const fsSpec = "node:fs/promises";
    const pathSpec = "node:path";
    const [fsMod, pathMod] = await Promise.all([
      import(/* webpackIgnore: true */ /* @vite-ignore */ fsSpec),
      import(/* webpackIgnore: true */ /* @vite-ignore */ pathSpec),
    ]);
    if (
      fsMod &&
      typeof fsMod.readFile === "function" &&
      typeof fsMod.writeFile === "function" &&
      pathMod &&
      typeof pathMod.join === "function"
    ) {
      return {
        fs: fsMod as NodeFsModule,
        path: pathMod as NodePathModule,
      };
    }
  } catch {
    // Node fs modules unavailable
  }
  return null;
}

export function createNodeFsStorageDriver(
  customFilePath?: string
): CustomCmsStorageDriver {
  const memoryFallback = new Map<string, string>();
  let diskCache: DiskStoreFileShape | null = null;

  async function resolveTargetFile(): Promise<{
    fs: NodeFsModule;
    filePath: string;
  } | null> {
    const mods = await loadNodeFsModules();
    if (!mods) {
      return null;
    }
    const configured =
      customFilePath ??
      process.env.CUSTOM_CMS_DATA_FILE ??
      mods.path.join(process.cwd(), ".data", "custom-cms.json");
    return { fs: mods.fs, filePath: configured };
  }

  async function readDiskShape(): Promise<DiskStoreFileShape | null> {
    const target = await resolveTargetFile();
    if (!target) {
      return diskCache;
    }
    try {
      const raw = await target.fs.readFile(target.filePath, "utf8");
      const parsed = JSON.parse(raw) as DiskStoreFileShape;
      if (parsed && typeof parsed === "object") {
        diskCache = parsed;
        return parsed;
      }
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";
      if (code === "ENOENT") {
        // File does not exist yet (or was deleted); treat store as uninitialized unless in-memory fallback wrote something
        return diskCache;
      }
    }
    return diskCache;
  }

  async function writeDiskShape(shape: DiskStoreFileShape): Promise<void> {
    diskCache = shape;
    const target = await resolveTargetFile();
    if (!target) {
      return;
    }
    try {
      const mods = await loadNodeFsModules();
      if (!mods) {
        return;
      }
      await target.fs.mkdir(mods.path.dirname(target.filePath), {
        recursive: true,
      });
      await target.fs.writeFile(
        target.filePath,
        JSON.stringify(shape, null, 2),
        "utf8"
      );
    } catch {
      // Read-only filesystem fallback: memory cache remains valid
    }
  }

  return {
    kind: "node-fs",
    async get(key: string): Promise<string | null> {
      const shape = await readDiskShape();
      if (shape) {
        if (key === CATALOG_KEY && shape.catalog) {
          return JSON.stringify(shape.catalog);
        }
        if (key === MEDIA_INDEX_KEY && shape.mediaIndex) {
          return JSON.stringify(shape.mediaIndex);
        }
        if (key.startsWith(MEDIA_ITEM_PREFIX)) {
          const id = key.slice(MEDIA_ITEM_PREFIX.length);
          const mediaRecord = shape.media?.[id];
          if (mediaRecord) {
            return JSON.stringify(mediaRecord);
          }
        }
      }
      return memoryFallback.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      memoryFallback.set(key, value);
      const existing = (await readDiskShape()) ?? { version: 1 };
      const next: DiskStoreFileShape = {
        version: 1,
        seededAt: existing.seededAt,
        updatedAt: new Date().toISOString(),
        catalog: existing.catalog,
        mediaIndex: existing.mediaIndex ?? [],
        media: { ...(existing.media ?? {}) },
      };

      const parsed: unknown = JSON.parse(value);
      if (key === CATALOG_KEY) {
        const cat = parsed as CatalogPayload;
        next.catalog = cat;
        next.seededAt = cat.seededAt;
        next.updatedAt = cat.updatedAt;
      } else if (key === MEDIA_INDEX_KEY) {
        next.mediaIndex = parsed as CustomCmsMediaMetadata[];
      } else if (key.startsWith(MEDIA_ITEM_PREFIX)) {
        const id = key.slice(MEDIA_ITEM_PREFIX.length);
        if (!next.media) {
          next.media = {};
        }
        next.media[id] = parsed as CustomCmsMediaRecord;
      }

      await writeDiskShape(next);
    },
    async delete(key: string): Promise<void> {
      memoryFallback.delete(key);
      const existing = await readDiskShape();
      if (!existing) {
        return;
      }
      const next: DiskStoreFileShape = {
        version: 1,
        seededAt: existing.seededAt,
        updatedAt: new Date().toISOString(),
        catalog: existing.catalog,
        mediaIndex: existing.mediaIndex ?? [],
        media: { ...(existing.media ?? {}) },
      };
      if (key === CATALOG_KEY) {
        delete next.catalog;
      } else if (key === MEDIA_INDEX_KEY) {
        next.mediaIndex = [];
      } else if (key.startsWith(MEDIA_ITEM_PREFIX)) {
        const id = key.slice(MEDIA_ITEM_PREFIX.length);
        if (next.media) {
          delete next.media[id];
        }
      }
      await writeDiskShape(next);
    },
  };
}

let customDriverOverride: CustomCmsStorageDriver | null = null;
let defaultNodeDriver: CustomCmsStorageDriver | null = null;
let defaultNodeDriverFileKey: string | undefined;

export function setCustomStoreDriver(
  driver: CustomCmsStorageDriver | null
): void {
  customDriverOverride = driver;
  notifyCustomStoreMutation();
}

export function resetCustomStoreDriver(): void {
  customDriverOverride = null;
  defaultNodeDriver = null;
  defaultNodeDriverFileKey = undefined;
  notifyCustomStoreMutation();
}

async function resolveCloudflareKvBinding(): Promise<KvNamespaceLike | null> {
  try {
    const cfSpecifier = "cloudflare:workers";
    const cfModule = (await import(
      /* webpackIgnore: true */ /* @vite-ignore */ cfSpecifier
    )) as { env?: Record<string, unknown> };
    const binding = cfModule?.env?.CMS_STORE;
    if (
      binding &&
      typeof binding === "object" &&
      typeof (binding as KvNamespaceLike).get === "function" &&
      typeof (binding as KvNamespaceLike).put === "function" &&
      typeof (binding as KvNamespaceLike).delete === "function"
    ) {
      return binding as KvNamespaceLike;
    }
  } catch {
    // Not in Cloudflare Workers runtime or bindings unavailable during prerender
  }
  return null;
}

export async function getActiveStorageDriver(): Promise<CustomCmsStorageDriver> {
  if (customDriverOverride) {
    return customDriverOverride;
  }

  const kv = await resolveCloudflareKvBinding();
  if (kv) {
    return createKvStorageDriver(kv);
  }

  const fileKey = process.env.CUSTOM_CMS_DATA_FILE;
  if (!defaultNodeDriver || defaultNodeDriverFileKey !== fileKey) {
    defaultNodeDriver = createNodeFsStorageDriver(fileKey);
    defaultNodeDriverFileKey = fileKey;
  }
  return defaultNodeDriver;
}

function cloneImages(images?: ProductImage[]): ProductImage[] {
  if (!Array.isArray(images)) {
    return [];
  }
  return images
    .filter(
      (img): img is ProductImage =>
        Boolean(img) && typeof img.url === "string" && img.url.trim().length > 0
    )
    .map((img) => ({
      url: img.url.trim(),
      alt: typeof img.alt === "string" ? img.alt.trim() : "",
    }));
}

function cloneKeyValuePairs(pairs?: KeyValuePair[]): KeyValuePair[] {
  if (!Array.isArray(pairs)) {
    return [];
  }
  return pairs
    .filter(
      (p): p is KeyValuePair =>
        Boolean(p) &&
        typeof p.key === "string" &&
        p.key.trim().length > 0 &&
        typeof p.value === "string"
    )
    .map((p) => ({
      key: p.key.trim(),
      value: p.value.trim(),
    }));
}

function cloneProductRecord(
  record: CustomCmsProductRecord
): CustomCmsProductRecord {
  return {
    ...record,
    subCategorySlugs: record.subCategorySlugs
      ? [...record.subCategorySlugs]
      : undefined,
    images: cloneImages(record.images),
    explicitAttributes: cloneKeyValuePairs(record.explicitAttributes),
    customFields: record.customFields
      ? cloneKeyValuePairs(record.customFields)
      : undefined,
    descriptionSpecs: record.descriptionSpecs
      ? cloneKeyValuePairs(record.descriptionSpecs)
      : undefined,
  };
}

function cloneCategoryRecord(
  cat: RawCmsCategoryInput
): RawCmsCategoryInput {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    icon: cat.icon,
    image: cat.image,
    parentSlug: cat.parentSlug,
  };
}

function buildSeedCatalog(nowIso: string): CatalogPayload {
  const categories = RAW_MOCK_CATEGORIES.map(cloneCategoryRecord);
  const products: CustomCmsProductRecord[] = RAW_MOCK_PRODUCTS.map((raw) => {
    const slug = raw.slug?.trim() || slugify(`${raw.title}-${raw.sku}`);
    const timestamp = raw.createdAt ?? nowIso;
    return {
      id: raw.id,
      sku: raw.sku,
      title: raw.title,
      slug,
      status: "publish",
      categorySlug: raw.categorySlug,
      categoryName: raw.categoryName,
      subCategorySlugs: raw.subCategorySlugs
        ? [...raw.subCategorySlugs]
        : undefined,
      explicitComponentType: raw.explicitComponentType,
      brandTaxonomy: raw.brandTaxonomy,
      price: raw.price,
      salePrice: raw.salePrice,
      availability: raw.availability,
      stockQuantity: raw.stockQuantity,
      images: cloneImages(raw.images),
      shortDescription: raw.shortDescription,
      descriptionHtml: raw.descriptionHtml,
      explicitAttributes: cloneKeyValuePairs(raw.explicitAttributes),
      customFields:
        raw.customFields.length > 0
          ? cloneKeyValuePairs(raw.customFields)
          : undefined,
      descriptionSpecs: raw.descriptionSpecs
        ? cloneKeyValuePairs(raw.descriptionSpecs)
        : undefined,
      warranty: raw.warranty,
      isFeatured: raw.isFeatured,
      isFlashDeal: raw.isFlashDeal,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  return {
    version: 1,
    seededAt: nowIso,
    updatedAt: nowIso,
    categories,
    products,
  };
}

async function readOrSeedCatalog(
  driver: CustomCmsStorageDriver
): Promise<CatalogPayload> {
  const raw = await driver.get(CATALOG_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<CatalogPayload>;
      if (
        parsed &&
        Array.isArray(parsed.categories) &&
        Array.isArray(parsed.products)
      ) {
        const nowIso = new Date().toISOString();
        const categories = parsed.categories.map(cloneCategoryRecord);
        const existingSlugs = new Set(
          categories.map((c) => c.slug.trim().toLowerCase())
        );
        const missingComponentCategories =
          buildMissingComponentSeedCategories(existingSlugs);
        return {
          version: 1,
          seededAt:
            typeof parsed.seededAt === "string" ? parsed.seededAt : nowIso,
          updatedAt:
            typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso,
          categories:
            missingComponentCategories.length > 0
              ? [...categories, ...missingComponentCategories]
              : categories,
          products: parsed.products.map(cloneProductRecord),
        };
      }
    } catch {
      // Corrupt catalog JSON falls through to seed
    }
  }

  const seeded = buildSeedCatalog(new Date().toISOString());
  await driver.put(CATALOG_KEY, JSON.stringify(seeded));
  return seeded;
}

async function saveCatalog(
  driver: CustomCmsStorageDriver,
  catalog: CatalogPayload
): Promise<CatalogPayload> {
  const next: CatalogPayload = {
    version: 1,
    seededAt: catalog.seededAt,
    updatedAt: new Date().toISOString(),
    categories: catalog.categories.map(cloneCategoryRecord),
    products: catalog.products.map(cloneProductRecord),
  };
  await driver.put(CATALOG_KEY, JSON.stringify(next));
  notifyCustomStoreMutation();
  return next;
}

export async function getCustomCatalogVersion(): Promise<string> {
  const driver = await getActiveStorageDriver();
  const catalog = await readOrSeedCatalog(driver);
  return `${catalog.updatedAt}:${storeMutationEpoch}`;
}

function generateId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function ensureUniqueSlug(
  desiredSlug: string,
  ownId: string,
  products: readonly CustomCmsProductRecord[]
): string {
  const base = slugify(desiredSlug) || `product-${ownId}`;
  const taken = new Set(
    products
      .filter((p) => p.id !== ownId)
      .map((p) => p.slug.trim().toLowerCase())
  );
  if (!taken.has(base)) {
    return base;
  }
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) {
    counter += 1;
  }
  return `${base}-${counter}`;
}

function sanitizeOptionalPositiveNumber(
  incoming: number | null | undefined,
  existingValue: number | undefined
): number | undefined {
  if (incoming === null) {
    return undefined;
  }
  if (incoming === undefined) {
    return existingValue;
  }
  return typeof incoming === "number" &&
    Number.isFinite(incoming) &&
    incoming > 0
    ? incoming
    : undefined;
}

function sanitizeOptionalNonNegativeInt(
  incoming: number | null | undefined,
  existingValue: number | undefined
): number | undefined {
  if (incoming === null) {
    return undefined;
  }
  if (incoming === undefined) {
    return existingValue;
  }
  if (typeof incoming === "number" && Number.isFinite(incoming)) {
    return Math.max(0, Math.round(incoming));
  }
  return undefined;
}

function sanitizeOptionalString(
  incoming: string | null | undefined,
  existingValue: string | undefined
): string | undefined {
  if (incoming === null) {
    return undefined;
  }
  if (incoming === undefined) {
    return existingValue;
  }
  const trimmed = incoming.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStatus(
  incoming: CmsProductStatus | undefined,
  existing: CmsProductStatus | undefined
): CmsProductStatus {
  if (incoming === "publish" || incoming === "draft") {
    return incoming;
  }
  return existing ?? "draft";
}

function resolveCategoryDetails(
  categorySlugInput: string | undefined,
  categoryNameInput: string | undefined,
  existing: CustomCmsProductRecord | undefined,
  categories: readonly RawCmsCategoryInput[]
): { categorySlug: string; categoryName: string } {
  const slugCandidate =
    categorySlugInput !== undefined
      ? slugify(categorySlugInput) || categorySlugInput.trim().toLowerCase()
      : existing?.categorySlug ?? "other";

  const matchedCat = categories.find(
    (c) => c.slug.trim().toLowerCase() === slugCandidate.toLowerCase()
  );

  const categoryName =
    categoryNameInput !== undefined && categoryNameInput.trim().length > 0
      ? categoryNameInput.trim()
      : matchedCat?.name ??
        existing?.categoryName ??
        (slugCandidate || "Other");

  return {
    categorySlug: slugCandidate || "other",
    categoryName,
  };
}

export async function listCustomProducts(
  opts: { includeDrafts?: boolean } = {}
): Promise<CustomCmsProductRecord[]> {
  const driver = await getActiveStorageDriver();
  const catalog = await readOrSeedCatalog(driver);
  const includeDrafts = Boolean(opts.includeDrafts);
  const filtered = includeDrafts
    ? catalog.products
    : catalog.products.filter((p) => p.status === "publish");
  return filtered.map(cloneProductRecord);
}

export async function getCustomProductById(
  id: string
): Promise<CustomCmsProductRecord | null> {
  const driver = await getActiveStorageDriver();
  const catalog = await readOrSeedCatalog(driver);
  const found = catalog.products.find((p) => p.id === id);
  return found ? cloneProductRecord(found) : null;
}

export async function getCustomProductBySlug(
  slug: string,
  includeDrafts = false
): Promise<CustomCmsProductRecord | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }
  const driver = await getActiveStorageDriver();
  const catalog = await readOrSeedCatalog(driver);
  const found = catalog.products.find(
    (p) => p.slug.trim().toLowerCase() === normalizedSlug
  );
  if (!found) {
    return null;
  }
  if (!includeDrafts && found.status !== "publish") {
    return null;
  }
  return cloneProductRecord(found);
}

export async function upsertCustomProduct(
  input: CustomCmsProductInput
): Promise<CustomCmsProductRecord> {
  return withStoreLock(async () => {
    const driver = await getActiveStorageDriver();
    const catalog = await readOrSeedCatalog(driver);
    const nowIso = new Date().toISOString();

    const trimmedId = input.id?.trim();
    const existingIndex = trimmedId
      ? catalog.products.findIndex((p) => p.id === trimmedId)
      : -1;
    const existing =
      existingIndex >= 0 ? catalog.products[existingIndex] : undefined;

    const id = trimmedId || existing?.id || generateId("prod");
    const title =
      input.title !== undefined
        ? input.title.trim()
        : existing?.title ?? "";

    if (!title) {
      throw new Error("Product title is required.");
    }

    const sku =
      input.sku !== undefined && input.sku.trim().length > 0
        ? input.sku.trim()
        : existing?.sku || `SKU-${id.toUpperCase()}`;

    const rawDesiredSlug =
      input.slug === null
        ? slugify(title)
        : input.slug !== undefined
          ? input.slug.trim() || slugify(title)
          : existing?.slug ?? slugify(title);

    const slug = ensureUniqueSlug(rawDesiredSlug, id, catalog.products);

    const { categorySlug, categoryName } = resolveCategoryDetails(
      input.categorySlug,
      input.categoryName,
      existing,
      catalog.categories
    );

    const stockQuantity = sanitizeOptionalNonNegativeInt(
      input.stockQuantity,
      existing?.stockQuantity
    );

    const availability: Availability =
      input.availability !== undefined
        ? normalizeAvailability(input.availability, stockQuantity)
        : existing?.availability ??
          normalizeAvailability(undefined, stockQuantity);

    const price = sanitizeOptionalPositiveNumber(input.price, existing?.price);
    const salePrice = sanitizeOptionalPositiveNumber(
      input.salePrice,
      existing?.salePrice
    );

    const images =
      input.images !== undefined
        ? cloneImages(input.images).map((img) => ({
            url: img.url,
            alt: img.alt || title,
          }))
        : cloneImages(existing?.images);

    const explicitAttributes =
      input.explicitAttributes !== undefined
        ? cloneKeyValuePairs(input.explicitAttributes)
        : cloneKeyValuePairs(existing?.explicitAttributes);

    const subCategorySlugs =
      input.subCategorySlugs === null
        ? undefined
        : input.subCategorySlugs !== undefined
          ? input.subCategorySlugs
              .map((s) => s.trim())
              .filter(Boolean)
          : existing?.subCategorySlugs
            ? [...existing.subCategorySlugs]
            : undefined;

    const record: CustomCmsProductRecord = {
      id,
      sku,
      title,
      slug,
      status: normalizeStatus(input.status, existing?.status),
      categorySlug,
      categoryName,
      subCategorySlugs:
        subCategorySlugs && subCategorySlugs.length > 0
          ? subCategorySlugs
          : undefined,
      explicitComponentType: sanitizeOptionalString(
        input.explicitComponentType,
        existing?.explicitComponentType
      ),
      brandTaxonomy: sanitizeOptionalString(
        input.brandTaxonomy,
        existing?.brandTaxonomy
      ),
      price,
      salePrice,
      availability,
      stockQuantity,
      images,
      shortDescription: sanitizeOptionalString(
        input.shortDescription,
        existing?.shortDescription
      ),
      descriptionHtml: sanitizeOptionalString(
        input.descriptionHtml,
        existing?.descriptionHtml
      ),
      explicitAttributes,
      customFields:
        input.customFields !== undefined
          ? cloneKeyValuePairs(input.customFields)
          : existing?.customFields
            ? cloneKeyValuePairs(existing.customFields)
            : undefined,
      descriptionSpecs:
        input.descriptionSpecs !== undefined
          ? cloneKeyValuePairs(input.descriptionSpecs)
          : existing?.descriptionSpecs
            ? cloneKeyValuePairs(existing.descriptionSpecs)
            : undefined,
      warranty: sanitizeOptionalString(input.warranty, existing?.warranty),
      isFeatured:
        input.isFeatured !== undefined
          ? Boolean(input.isFeatured)
          : existing?.isFeatured,
      isFlashDeal:
        input.isFlashDeal !== undefined
          ? Boolean(input.isFlashDeal)
          : existing?.isFlashDeal,
      createdAt: input.createdAt ?? existing?.createdAt ?? nowIso,
      updatedAt: input.updatedAt ?? nowIso,
    };

    const nextProducts = [...catalog.products];
    if (existingIndex >= 0) {
      nextProducts[existingIndex] = record;
    } else {
      nextProducts.unshift(record);
    }

    await saveCatalog(driver, {
      ...catalog,
      products: nextProducts,
    });

    return cloneProductRecord(record);
  });
}

export async function patchCustomProduct(
  id: string,
  patch: Omit<CustomCmsProductInput, "id">
): Promise<CustomCmsProductRecord | null> {
  const existing = await getCustomProductById(id);
  if (!existing) {
    return null;
  }
  return upsertCustomProduct({
    ...patch,
    id: existing.id,
  });
}

export async function deleteCustomProduct(id: string): Promise<boolean> {
  return withStoreLock(async () => {
    const driver = await getActiveStorageDriver();
    const catalog = await readOrSeedCatalog(driver);
    const nextProducts = catalog.products.filter((p) => p.id !== id);
    if (nextProducts.length === catalog.products.length) {
      return false;
    }
    await saveCatalog(driver, {
      ...catalog,
      products: nextProducts,
    });
    return true;
  });
}

export async function duplicateCustomProduct(
  id: string
): Promise<CustomCmsProductRecord | null> {
  return withStoreLock(async () => {
    const driver = await getActiveStorageDriver();
    const catalog = await readOrSeedCatalog(driver);
    const existing = catalog.products.find((p) => p.id === id);
    if (!existing) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const newId = generateId("prod");
    const newTitle = `${existing.title} (Copy)`;
    const newSlug = ensureUniqueSlug(
      `${existing.slug}-copy`,
      newId,
      catalog.products
    );

    const existingSkus = new Set(
      catalog.products.map((p) => p.sku.trim().toUpperCase())
    );
    let newSku = `${existing.sku}-COPY`;
    let skuCounter = 2;
    while (existingSkus.has(newSku.toUpperCase())) {
      newSku = `${existing.sku}-COPY-${skuCounter}`;
      skuCounter += 1;
    }

    const clone: CustomCmsProductRecord = {
      ...cloneProductRecord(existing),
      id: newId,
      sku: newSku,
      title: newTitle,
      slug: newSlug,
      status: "draft",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextProducts = [clone, ...catalog.products];
    await saveCatalog(driver, {
      ...catalog,
      products: nextProducts,
    });

    return cloneProductRecord(clone);
  });
}

export async function listCustomCategories(): Promise<RawCmsCategoryInput[]> {
  const driver = await getActiveStorageDriver();
  const catalog = await readOrSeedCatalog(driver);
  return catalog.categories.map(cloneCategoryRecord);
}

export async function upsertCustomCategory(
  input: CustomCmsCategoryInput
): Promise<RawCmsCategoryInput> {
  return withStoreLock(async () => {
    const driver = await getActiveStorageDriver();
    const catalog = await readOrSeedCatalog(driver);

    const name = input.name.trim();
    if (!name) {
      throw new Error("Category name is required.");
    }

    const slug = slugify(input.slug?.trim() || name);
    if (!slug) {
      throw new Error("Category slug is required.");
    }

    const existingIndex = catalog.categories.findIndex(
      (c) =>
        (input.id && c.id === input.id.trim()) ||
        c.slug.trim().toLowerCase() === slug.toLowerCase()
    );
    const existing =
      existingIndex >= 0 ? catalog.categories[existingIndex] : undefined;

    const record: RawCmsCategoryInput = {
      id: input.id?.trim() || existing?.id || `cat-${slug}`,
      name,
      slug,
      description: sanitizeOptionalString(
        input.description,
        existing?.description
      ),
      icon: sanitizeOptionalString(input.icon, existing?.icon),
      image: sanitizeOptionalString(input.image, existing?.image),
      parentSlug: sanitizeOptionalString(
        input.parentSlug,
        existing?.parentSlug
      ),
    };

    const nextCategories = [...catalog.categories];
    if (existingIndex >= 0) {
      nextCategories[existingIndex] = record;
    } else {
      nextCategories.push(record);
    }

    await saveCatalog(driver, {
      ...catalog,
      categories: nextCategories,
    });

    return cloneCategoryRecord(record);
  });
}

export async function deleteCustomCategory(slug: string): Promise<boolean> {
  return withStoreLock(async () => {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      return false;
    }
    const driver = await getActiveStorageDriver();
    const catalog = await readOrSeedCatalog(driver);
    const nextCategories = catalog.categories.filter(
      (c) => c.slug.trim().toLowerCase() !== normalizedSlug
    );
    if (nextCategories.length === catalog.categories.length) {
      return false;
    }
    await saveCatalog(driver, {
      ...catalog,
      categories: nextCategories,
    });
    return true;
  });
}

function stripBase64Prefix(raw: string): string {
  const commaIdx = raw.indexOf(",");
  if (raw.startsWith("data:") && commaIdx >= 0) {
    return raw.slice(commaIdx + 1).trim();
  }
  return raw.trim();
}

function computeBase64ByteLength(cleanBase64: string): number {
  const stripped = cleanBase64.replace(/\s+/g, "");
  if (!stripped) {
    return 0;
  }
  let padding = 0;
  if (stripped.endsWith("==")) {
    padding = 2;
  } else if (stripped.endsWith("=")) {
    padding = 1;
  }
  return Math.max(0, Math.floor((stripped.length * 3) / 4) - padding);
}

async function readMediaIndex(
  driver: CustomCmsStorageDriver
): Promise<CustomCmsMediaMetadata[]> {
  const raw = await driver.get(MEDIA_INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is CustomCmsMediaMetadata =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as CustomCmsMediaMetadata).id === "string"
    );
  } catch {
    return [];
  }
}

export async function saveCustomMedia(
  input: CustomCmsMediaInput
): Promise<CustomCmsMediaMetadata> {
  return withStoreLock(async () => {
    const driver = await getActiveStorageDriver();
    const id = (input.id?.trim() || generateId("media")).replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    );
    const filename = input.filename.trim() || `${id}.bin`;
    const mimeType = input.mimeType.trim() || "application/octet-stream";
    const bytesBase64 = stripBase64Prefix(input.bytesBase64);
    const sizeBytes =
      typeof input.sizeBytes === "number" &&
      Number.isFinite(input.sizeBytes) &&
      input.sizeBytes >= 0
        ? input.sizeBytes
        : computeBase64ByteLength(bytesBase64);
    const createdAt = new Date().toISOString();
    const url = `/api/cms/media/${id}`;

    const metadata: CustomCmsMediaMetadata = {
      id,
      filename,
      mimeType,
      sizeBytes,
      url,
      createdAt,
    };

    const fullRecord: CustomCmsMediaRecord = {
      ...metadata,
      bytesBase64,
    };

    await driver.put(`${MEDIA_ITEM_PREFIX}${id}`, JSON.stringify(fullRecord));
    const currentIndex = await readMediaIndex(driver);
    const nextIndex = [
      metadata,
      ...currentIndex.filter((item) => item.id !== id),
    ];
    await driver.put(MEDIA_INDEX_KEY, JSON.stringify(nextIndex));

    return { ...metadata };
  });
}

export async function getCustomMedia(
  id: string
): Promise<CustomCmsMediaRecord | null> {
  const cleanId = id.trim();
  if (!cleanId) {
    return null;
  }
  const driver = await getActiveStorageDriver();
  const raw = await driver.get(`${MEDIA_ITEM_PREFIX}${cleanId}`);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CustomCmsMediaRecord;
    return parsed && typeof parsed.bytesBase64 === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function listCustomMedia(): Promise<CustomCmsMediaMetadata[]> {
  const driver = await getActiveStorageDriver();
  const items = await readMediaIndex(driver);
  return items
    .map((item) => ({
      id: item.id,
      filename: item.filename,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      url: item.url || `/api/cms/media/${item.id}`,
      createdAt: item.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteCustomMedia(id: string): Promise<boolean> {
  return withStoreLock(async () => {
    const cleanId = id.trim();
    if (!cleanId) {
      return false;
    }
    const driver = await getActiveStorageDriver();
    const currentIndex = await readMediaIndex(driver);
    const existedInIndex = currentIndex.some((item) => item.id === cleanId);
    const existedBlob = (await driver.get(`${MEDIA_ITEM_PREFIX}${cleanId}`)) !== null;
    if (!existedInIndex && !existedBlob) {
      return false;
    }

    await driver.delete(`${MEDIA_ITEM_PREFIX}${cleanId}`);
    const nextIndex = currentIndex.filter((item) => item.id !== cleanId);
    await driver.put(MEDIA_INDEX_KEY, JSON.stringify(nextIndex));
    return true;
  });
}

export async function resetCustomStoreToSeed(): Promise<CustomCmsSnapshot> {
  return withStoreLock(async () => {
    const driver = await getActiveStorageDriver();
    const existingIndex = await readMediaIndex(driver);
    for (const item of existingIndex) {
      await driver.delete(`${MEDIA_ITEM_PREFIX}${item.id}`);
    }
    await driver.put(MEDIA_INDEX_KEY, JSON.stringify([]));

    const nowIso = new Date().toISOString();
    const seeded = buildSeedCatalog(nowIso);
    await driver.put(CATALOG_KEY, JSON.stringify(seeded));
    notifyCustomStoreMutation();

    return {
      version: 1,
      seededAt: seeded.seededAt,
      updatedAt: seeded.updatedAt,
      categories: seeded.categories.map(cloneCategoryRecord),
      products: seeded.products.map(cloneProductRecord),
      media: [],
    };
  });
}

export async function exportCustomStoreSnapshot(): Promise<CustomCmsSnapshot> {
  const driver = await getActiveStorageDriver();
  const catalog = await readOrSeedCatalog(driver);
  const index = await readMediaIndex(driver);
  const media: CustomCmsMediaRecord[] = [];
  for (const item of index) {
    const raw = await driver.get(`${MEDIA_ITEM_PREFIX}${item.id}`);
    if (raw) {
      try {
        const rec = JSON.parse(raw) as CustomCmsMediaRecord;
        if (rec && typeof rec.bytesBase64 === "string") {
          media.push(rec);
        }
      } catch {
        // Skip corrupt media entry
      }
    }
  }
  return {
    version: 1,
    seededAt: catalog.seededAt,
    updatedAt: catalog.updatedAt,
    categories: catalog.categories.map(cloneCategoryRecord),
    products: catalog.products.map(cloneProductRecord),
    media,
  };
}

export async function importCustomStoreSnapshot(
  snapshot: CustomCmsSnapshot
): Promise<CustomCmsSnapshot> {
  return withStoreLock(async () => {
    if (
      !snapshot ||
      typeof snapshot !== "object" ||
      !Array.isArray(snapshot.categories) ||
      !Array.isArray(snapshot.products)
    ) {
      throw new Error(
        "Invalid custom CMS snapshot: expected categories and products arrays."
      );
    }

    const driver = await getActiveStorageDriver();
    const existingIndex = await readMediaIndex(driver);
    for (const item of existingIndex) {
      await driver.delete(`${MEDIA_ITEM_PREFIX}${item.id}`);
    }

    const nowIso = new Date().toISOString();
    const categories = snapshot.categories.map(cloneCategoryRecord);
    const products = snapshot.products.map((prod) =>
      cloneProductRecord({
        ...prod,
        status: prod.status === "draft" ? "draft" : "publish",
        createdAt: prod.createdAt || nowIso,
        updatedAt: prod.updatedAt || nowIso,
      })
    );

    const mediaRecords: CustomCmsMediaRecord[] = [];
    const mediaIndex: CustomCmsMediaMetadata[] = [];
    if (Array.isArray(snapshot.media)) {
      for (const item of snapshot.media) {
        if (!item || typeof item.id !== "string" || typeof item.bytesBase64 !== "string") {
          continue;
        }
        const meta: CustomCmsMediaMetadata = {
          id: item.id,
          filename: item.filename || `${item.id}.bin`,
          mimeType: item.mimeType || "application/octet-stream",
          sizeBytes:
            typeof item.sizeBytes === "number"
              ? item.sizeBytes
              : computeBase64ByteLength(item.bytesBase64),
          url: item.url || `/api/cms/media/${item.id}`,
          createdAt: item.createdAt || nowIso,
        };
        const full: CustomCmsMediaRecord = {
          ...meta,
          bytesBase64: stripBase64Prefix(item.bytesBase64),
        };
        await driver.put(`${MEDIA_ITEM_PREFIX}${meta.id}`, JSON.stringify(full));
        mediaRecords.push(full);
        mediaIndex.push(meta);
      }
    }
    await driver.put(MEDIA_INDEX_KEY, JSON.stringify(mediaIndex));

    const catalog: CatalogPayload = {
      version: 1,
      seededAt: snapshot.seededAt || nowIso,
      updatedAt: nowIso,
      categories,
      products,
    };
    await driver.put(CATALOG_KEY, JSON.stringify(catalog));
    notifyCustomStoreMutation();

    return {
      version: 1,
      seededAt: catalog.seededAt,
      updatedAt: catalog.updatedAt,
      categories: categories.map(cloneCategoryRecord),
      products: products.map(cloneProductRecord),
      media: mediaRecords,
    };
  });
}

export function customRecordToRawAdapterProduct(
  record: CustomCmsProductRecord
): RawAdapterProduct {
  return {
    id: record.id,
    sku: record.sku,
    title: record.title,
    slug: record.slug,
    categorySlug: record.categorySlug,
    categoryName: record.categoryName,
    subCategorySlugs: record.subCategorySlugs
      ? [...record.subCategorySlugs]
      : undefined,
    explicitComponentType: record.explicitComponentType,
    brandTaxonomy: record.brandTaxonomy,
    price: record.price,
    salePrice: record.salePrice,
    availability: record.availability,
    stockQuantity: record.stockQuantity,
    images: cloneImages(record.images),
    shortDescription: record.shortDescription,
    descriptionHtml: record.descriptionHtml,
    explicitAttributes: cloneKeyValuePairs(record.explicitAttributes),
    customFields: record.customFields
      ? cloneKeyValuePairs(record.customFields)
      : [],
    descriptionSpecs: record.descriptionSpecs
      ? cloneKeyValuePairs(record.descriptionSpecs)
      : undefined,
    warranty: record.warranty,
    isFeatured: record.isFeatured,
    isFlashDeal: record.isFlashDeal,
    createdAt: record.createdAt,
  };
}
