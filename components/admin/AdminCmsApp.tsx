"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FolderTree,
  Images,
  Layers,
  Loader2,
  LogOut,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import type { Availability } from "@/lib/cms/types";
import { SafeProductImage } from "@/components/catalog/SafeProductImage";
import { AdminLoginCard } from "./AdminLoginCard";
import { CategoryManager } from "./CategoryManager";
import { MediaLibraryPanel } from "./MediaLibraryModal";
import { ProductEditor } from "./ProductEditor";
import {
  createEmptyProductForm,
  parseOptionalNumber,
  parseOptionalPositivePrice,
  productRecordToFormState,
  slugifyClient,
  type AdminCategoryRecord,
  type AdminMediaRecord,
  type AdminProductRecord,
  type CmsProductStatus,
  type ProductFormState,
} from "./types";

export interface AdminCmsAppProps {
  initialAuthenticated: boolean;
  showDevHint: boolean;
}

type AdminView = "products" | "media" | "categories" | "tools";

interface ToastMessage {
  id: number;
  message: string;
  variant: "success" | "error";
}

interface QuickEditDraft {
  id: string;
  title: string;
  sku: string;
  priceInput: string;
  salePriceInput: string;
  stockQuantityInput: string;
  availability: Availability;
  status: CmsProductStatus;
  isFeatured: boolean;
  isFlashDeal: boolean;
}

function formatBdt(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")}৳`;
}

function renderAvailabilityBadge(availability: Availability) {
  switch (availability) {
    case "in_stock":
      return (
        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
          In Stock
        </span>
      );
    case "preorder":
      return (
        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
          Pre-Order
        </span>
      );
    case "upcoming":
      return (
        <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
          Upcoming
        </span>
      );
    case "out_of_stock":
    default:
      return (
        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
          Out of Stock
        </span>
      );
  }
}

export function AdminCmsApp({
  initialAuthenticated,
  showDevHint,
}: AdminCmsAppProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [activeView, setActiveView] = useState<AdminView>("products");
  const [editingForm, setEditingForm] = useState<ProductFormState | null>(null);

  const [products, setProducts] = useState<AdminProductRecord[]>([]);
  const [categories, setCategories] = useState<AdminCategoryRecord[]>([]);
  const [media, setMedia] = useState<AdminMediaRecord[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CmsProductStatus>("all");

  const [quickEdit, setQuickEdit] = useState<QuickEditDraft | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [toolsBusy, setToolsBusy] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      const id = Date.now();
      setToast({ id, message, variant });
      toastTimerRef.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 4500);
    },
    []
  );

  const handleUnauthorized = useCallback(() => {
    setAuthenticated(false);
    setEditingForm(null);
    setQuickEdit(null);
    notify("Session expired. Please sign in again.", "error");
  }, [notify]);

  const fetchProductsAndCategories = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/cms/products?status=all", { cache: "no-store" }),
        fetch("/api/cms/categories", { cache: "no-store" }),
      ]);

      if (prodRes.status === 401 || catRes.status === 401) {
        handleUnauthorized();
        return;
      }

      if (prodRes.ok) {
        const prodJson = (await prodRes.json()) as {
          products?: AdminProductRecord[];
        };
        if (Array.isArray(prodJson.products)) {
          setProducts(prodJson.products);
        }
      } else {
        notify("Failed to load products from CMS API.", "error");
      }

      if (catRes.ok) {
        const catJson = (await catRes.json()) as {
          categories?: AdminCategoryRecord[];
        };
        if (Array.isArray(catJson.categories)) {
          setCategories(catJson.categories);
        }
      } else {
        notify("Failed to load categories from CMS API.", "error");
      }
    } catch {
      notify("Network error loading catalog data.", "error");
    } finally {
      setLoadingCatalog(false);
    }
  }, [handleUnauthorized, notify]);

  const fetchMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/cms/media", { cache: "no-store" });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as { media?: AdminMediaRecord[] };
        if (Array.isArray(json.media)) {
          setMedia(json.media);
        }
      }
    } catch {
      notify("Network error loading media library.", "error");
    } finally {
      setLoadingMedia(false);
    }
  }, [handleUnauthorized, notify]);

  useEffect(() => {
    if (!authenticated) return;
    void fetchProductsAndCategories();
    void fetchMedia();
  }, [authenticated, fetchProductsAndCategories, fetchMedia]);

  const handleLogout = async () => {
    try {
      await fetch("/api/cms/auth", { method: "DELETE" });
    } finally {
      setAuthenticated(false);
      setEditingForm(null);
      setQuickEdit(null);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (
        categoryFilter !== "all" &&
        item.categorySlug !== categoryFilter &&
        !(item.subCategorySlugs ?? []).includes(categoryFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        (item.brandTaxonomy ?? "").toLowerCase().includes(q) ||
        (item.normalized?.brand ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    let published = 0;
    let drafts = 0;
    let flashDeals = 0;
    for (const p of products) {
      if (p.status === "publish") published += 1;
      else drafts += 1;
      if (p.isFlashDeal) flashDeals += 1;
    }
    return {
      total: products.length,
      published,
      drafts,
      flashDeals,
    };
  }, [products]);

  const handleSaveProduct = async (
    form: ProductFormState,
    targetStatus: CmsProductStatus
  ): Promise<ProductFormState | null> => {
    const regularPrice = parseOptionalPositivePrice(form.priceInput);
    const salePrice = parseOptionalPositivePrice(form.salePriceInput);
    const stockQuantity = parseOptionalNumber(form.stockQuantityInput);

    const payload = {
      ...(form.id ? {} : {}),
      sku: form.sku.trim(),
      title: form.title.trim(),
      slug:
        form.slug.trim() ||
        slugifyClient(`${form.title.trim()}-${form.sku.trim()}`),
      status: targetStatus,
      categorySlug: form.categorySlug,
      categoryName: form.categoryName,
      subCategorySlugs:
        form.subCategorySlugs.length > 0 ? form.subCategorySlugs : null,
      brandTaxonomy: form.brandTaxonomy.trim() || null,
      price: regularPrice ?? null,
      salePrice: salePrice ?? null,
      availability: form.availability,
      stockQuantity: stockQuantity ?? null,
      images: form.images.filter((img) => img.url.trim().length > 0),
      shortDescription: form.shortDescription.trim() || null,
      descriptionHtml: form.descriptionHtml.trim() || null,
      explicitAttributes: form.explicitAttributes
        .filter((pair) => pair.key.trim() && pair.value.trim())
        .map((pair) => ({ key: pair.key.trim(), value: pair.value.trim() })),
      warranty: form.warranty.trim() || null,
      isFeatured: form.isFeatured,
      isFlashDeal: form.isFlashDeal,
      explicitComponentType: form.explicitComponentType.trim() || null,
    };

    try {
      const endpoint = form.id
        ? `/api/cms/products/${encodeURIComponent(form.id)}`
        : "/api/cms/products";
      const method = form.id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return null;
      }

      const data = (await response.json().catch(() => ({}))) as {
        product?: AdminProductRecord;
        normalized?: AdminProductRecord["normalized"];
        error?: string;
      };

      if (!response.ok || !data.product) {
        notify(data.error || "Failed to save product.", "error");
        return null;
      }

      const savedRecord: AdminProductRecord = {
        ...data.product,
        normalized: data.normalized ?? data.product.normalized,
      };

      setProducts((prev) => {
        const exists = prev.some((p) => p.id === savedRecord.id);
        if (exists) {
          return prev.map((p) => (p.id === savedRecord.id ? savedRecord : p));
        }
        return [savedRecord, ...prev];
      });

      notify(
        targetStatus === "publish"
          ? `Published "${savedRecord.title}" to storefront.`
          : `Saved draft "${savedRecord.title}".`,
        "success"
      );

      return productRecordToFormState(savedRecord);
    } catch {
      notify("Network error saving product.", "error");
      return null;
    }
  };

  const handleQuickEditSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quickEdit) return;

    const regularPrice = parseOptionalPositivePrice(quickEdit.priceInput);
    const salePrice = parseOptionalPositivePrice(quickEdit.salePriceInput);
    if (regularPrice != null && salePrice != null && salePrice >= regularPrice) {
      notify("Sale price must be strictly lower than regular price.", "error");
      return;
    }

    setQuickSaving(true);
    try {
      const response = await fetch(
        `/api/cms/products/${encodeURIComponent(quickEdit.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: quickEdit.title.trim(),
            sku: quickEdit.sku.trim(),
            price: regularPrice ?? null,
            salePrice: salePrice ?? null,
            stockQuantity: parseOptionalNumber(quickEdit.stockQuantityInput) ?? null,
            availability: quickEdit.availability,
            status: quickEdit.status,
            isFeatured: quickEdit.isFeatured,
            isFlashDeal: quickEdit.isFlashDeal,
          }),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        product?: AdminProductRecord;
        normalized?: AdminProductRecord["normalized"];
        error?: string;
      };

      if (!response.ok || !data.product) {
        notify(data.error || "Quick edit update failed.", "error");
        return;
      }

      const updated: AdminProductRecord = {
        ...data.product,
        normalized: data.normalized ?? data.product.normalized,
      };
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setQuickEdit(null);
      notify(`Updated "${updated.title}".`, "success");
    } catch {
      notify("Network error saving quick edit.", "error");
    } finally {
      setQuickSaving(false);
    }
  };

  const handleDuplicate = async (product: AdminProductRecord) => {
    setBusyProductId(product.id);
    try {
      const response = await fetch(
        `/api/cms/products/${encodeURIComponent(product.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "duplicate" }),
        }
      );
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        product?: AdminProductRecord;
        normalized?: AdminProductRecord["normalized"];
        error?: string;
      };
      if (!response.ok || !data.product) {
        notify(data.error || "Failed to duplicate product.", "error");
        return;
      }
      const cloned: AdminProductRecord = {
        ...data.product,
        normalized: data.normalized ?? data.product.normalized,
      };
      setProducts((prev) => [cloned, ...prev]);
      notify(`Duplicated as draft "${cloned.title}".`, "success");
    } catch {
      notify("Network error duplicating product.", "error");
    } finally {
      setBusyProductId(null);
    }
  };

  const handleDeleteProduct = async (product: AdminProductRecord) => {
    if (
      !window.confirm(
        `Delete "${product.title}" (SKU: ${product.sku}) permanently?`
      )
    ) {
      return;
    }
    setBusyProductId(product.id);
    try {
      const response = await fetch(
        `/api/cms/products/${encodeURIComponent(product.id)}`,
        { method: "DELETE" }
      );
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        notify(data.error || "Failed to delete product.", "error");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      if (quickEdit?.id === product.id) setQuickEdit(null);
      notify(`Deleted "${product.title}".`, "success");
    } catch {
      notify("Network error deleting product.", "error");
    } finally {
      setBusyProductId(null);
    }
  };

  const handleExportBackup = async () => {
    setToolsBusy(true);
    try {
      const response = await fetch("/api/cms/seed", { cache: "no-store" });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        notify("Failed to export CMS backup.", "error");
        return;
      }
      const json = (await response.json()) as unknown;
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `custom-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify("Downloaded JSON CMS backup.", "success");
    } catch {
      notify("Network error exporting backup.", "error");
    } finally {
      setToolsBusy(false);
    }
  };

  const handleImportSnapshot = async (rawText: string) => {
    if (!rawText.trim()) {
      notify("Paste or select a JSON snapshot first.", "error");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      notify("Invalid JSON syntax in backup file.", "error");
      return;
    }

    const snapshotPayload =
      typeof parsed === "object" &&
      parsed !== null &&
      "snapshot" in parsed &&
      typeof (parsed as { snapshot?: unknown }).snapshot === "object"
        ? (parsed as { snapshot: unknown }).snapshot
        : parsed;

    setToolsBusy(true);
    try {
      const response = await fetch("/api/cms/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          snapshot: snapshotPayload,
        }),
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        notify(data.error || "Failed to import snapshot.", "error");
        return;
      }
      await Promise.all([fetchProductsAndCategories(), fetchMedia()]);
      setImportJsonText("");
      notify("Imported CMS snapshot successfully.", "success");
    } catch {
      notify("Network error importing snapshot.", "error");
    } finally {
      setToolsBusy(false);
    }
  };

  const handleResetDemoCatalog = async () => {
    if (
      !window.confirm(
        "Reset the Custom CMS catalog & categories back to the default Star Tech demo seed? Custom edits and drafts will be overwritten."
      )
    ) {
      return;
    }

    setToolsBusy(true);
    try {
      const response = await fetch("/api/cms/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        notify(data.error || "Failed to reset demo catalog.", "error");
        return;
      }
      await Promise.all([fetchProductsAndCategories(), fetchMedia()]);
      notify("Reset catalog to default demo seed.", "success");
    } catch {
      notify("Network error resetting demo catalog.", "error");
    } finally {
      setToolsBusy(false);
    }
  };

  if (!authenticated) {
    return (
      <AdminLoginCard
        showDevHint={showDevHint}
        onAuthenticated={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top WordPress-Style Admin Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand-navy px-4 py-3 text-white shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-control bg-brand-orange text-white">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight sm:text-lg">
              Custom CMS Admin &amp; Live Studio
            </h1>
            <p className="text-[11px] text-slate-300">
              Manage products, hardware specs, categories &amp; storefront previews
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView("products");
              setEditingForm(createEmptyProductForm(categories[0]));
            }}
            className="inline-flex items-center gap-1.5 rounded-control bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-orangeHover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>+ Add Product</span>
          </button>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-control border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Storefront</span>
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-1 rounded-control border border-white/20 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast ? (
        <div
          role={toast.variant === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`flex items-center justify-between gap-3 rounded-card border px-4 py-2.5 text-xs font-semibold shadow-sm ${
            toast.variant === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="rounded p-0.5 hover:bg-black/5"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* Main Shell: Sidebar Nav + Content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <nav
          aria-label="CMS Admin navigation"
          className="lg:col-span-2"
        >
          <div className="flex flex-row gap-1.5 overflow-x-auto rounded-card border border-brand-border bg-white p-2 shadow-card lg:flex-col">
            {(
              [
                {
                  id: "products",
                  label: "Products",
                  count: products.length,
                  icon: Package,
                },
                {
                  id: "media",
                  label: "Media Library",
                  count: media.length,
                  icon: Images,
                },
                {
                  id: "categories",
                  label: "Categories",
                  count: categories.length,
                  icon: FolderTree,
                },
                {
                  id: "tools",
                  label: "Tools / Backup",
                  icon: Wrench,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id && editingForm === null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    setEditingForm(null);
                  }}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-control px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-blue text-white"
                      : "text-brand-textMain hover:bg-brand-grayBg"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                  {"count" in item ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-brand-grayBg text-brand-textMuted"
                      }`}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="lg:col-span-10">
          {editingForm ? (
            <ProductEditor
              key={editingForm.id ?? "new-product"}
              initialForm={editingForm}
              categories={categories}
              media={media}
              mediaLoading={loadingMedia}
              onMediaUploaded={(item) =>
                setMedia((prev) => [item, ...prev.filter((m) => m.id !== item.id)])
              }
              onMediaDeleted={(id) =>
                setMedia((prev) => prev.filter((m) => m.id !== id))
              }
              onSaveProduct={handleSaveProduct}
              onCancel={() => setEditingForm(null)}
              onNotify={notify}
            />
          ) : activeView === "products" ? (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-card border border-brand-border bg-white px-4 py-3 shadow-card">
                  <p className="text-[11px] font-medium text-brand-textMuted">
                    Total Products
                  </p>
                  <p className="mt-1 text-xl font-bold text-brand-textMain tabular-nums">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-card border border-brand-border bg-white px-4 py-3 shadow-card">
                  <p className="text-[11px] font-medium text-brand-textMuted">
                    Published
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
                    {stats.published}
                  </p>
                </div>
                <div className="rounded-card border border-brand-border bg-white px-4 py-3 shadow-card">
                  <p className="text-[11px] font-medium text-brand-textMuted">
                    Drafts
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-700 tabular-nums">
                    {stats.drafts}
                  </p>
                </div>
                <div className="rounded-card border border-brand-border bg-white px-4 py-3 shadow-card">
                  <p className="text-[11px] font-medium text-brand-textMuted">
                    Flash Deals
                  </p>
                  <p className="mt-1 text-xl font-bold text-brand-orange tabular-nums">
                    {stats.flashDeals}
                  </p>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-border bg-white p-3.5 shadow-card">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: `All (${stats.total})` },
                      { id: "publish", label: `Published (${stats.published})` },
                      { id: "draft", label: `Drafts (${stats.drafts})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`rounded-control px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        statusFilter === tab.id
                          ? "bg-brand-blue text-white"
                          : "bg-brand-grayBg text-brand-textMain hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                  <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                    <Search
                      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-textMuted"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title, SKU, brand..."
                      aria-label="Search products"
                      className="w-full rounded-control border border-brand-border py-1.5 pl-8 pr-3 text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                    />
                  </div>

                  <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-control border border-brand-border bg-white px-2.5 py-1.5 text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingForm(createEmptyProductForm(categories[0]))
                    }
                    className="inline-flex items-center gap-1 rounded-control bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blueDark"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>+ Add Product</span>
                  </button>
                </div>
              </div>

              {/* WordPress Posts-Style Product Table */}
              <div className="overflow-hidden rounded-card border border-brand-border bg-white shadow-card">
                {loadingCatalog ? (
                  <div className="flex items-center justify-center gap-2 p-12 text-xs text-brand-textMuted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Loading catalog products...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-brand-grayBg text-brand-textMain">
                        <tr>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            Product
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            SKU
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            Price / Sale
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            Category
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            Brand
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            Stock
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 font-semibold">
                            Status
                          </th>
                          <th scope="col" className="border-b border-brand-border px-3 py-2.5 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border bg-white">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-4 py-10 text-center text-brand-textMuted"
                            >
                              No products match your search or filters.
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((product) => {
                            const thumb = product.images[0];
                            const resolvedBrand =
                              product.normalized?.brand ||
                              product.brandTaxonomy ||
                              "—";
                            const hasPrice =
                              product.price != null &&
                              Number.isFinite(product.price);
                            const hasSale =
                              hasPrice &&
                              product.salePrice != null &&
                              Number.isFinite(product.salePrice) &&
                              product.salePrice < (product.price as number);
                            const isQuickEditing = quickEdit?.id === product.id;

                            return (
                              <React.Fragment key={product.id}>
                                <tr className="hover:bg-brand-grayBg/40">
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded border border-brand-border bg-slate-50">
                                        <SafeProductImage
                                          src={thumb?.url}
                                          alt={thumb?.alt || product.title}
                                          sizes="44px"
                                          className="object-contain p-1"
                                          fallback={
                                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                                              <Package
                                                className="h-5 w-5"
                                                aria-hidden="true"
                                              />
                                            </div>
                                          }
                                        />
                                      </div>
                                      <div className="min-w-0 max-w-[260px]">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingForm(
                                              productRecordToFormState(product)
                                            )
                                          }
                                          className="block truncate text-left font-semibold text-brand-textMain hover:text-brand-orange"
                                        >
                                          {product.title}
                                        </button>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-brand-textMuted">
                                          <span className="truncate font-mono">
                                            /{product.slug}
                                          </span>
                                          {product.isFeatured ? (
                                            <span className="rounded bg-blue-50 px-1 font-semibold text-brand-blue">
                                              Featured
                                            </span>
                                          ) : null}
                                          {product.isFlashDeal ? (
                                            <span className="rounded bg-orange-50 px-1 font-semibold text-brand-orange">
                                              Flash Deal
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-brand-textMain">
                                    {product.sku}
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                                    {!hasPrice || product.price == null ? (
                                      <span className="font-semibold text-brand-orange">
                                        Call for price
                                      </span>
                                    ) : hasSale && product.salePrice != null ? (
                                      <div className="flex flex-col">
                                        <span className="font-bold text-brand-orange">
                                          {formatBdt(product.salePrice)}
                                        </span>
                                        <del className="text-[10px] text-brand-textMuted">
                                          {formatBdt(product.price)}
                                        </del>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-brand-textMain">
                                        {formatBdt(product.price)}
                                      </span>
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5 text-brand-textMain">
                                    {product.categoryName || product.categorySlug}
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-brand-textMain">
                                    {resolvedBrand}
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5">
                                    <div className="flex flex-col items-start gap-0.5">
                                      {renderAvailabilityBadge(
                                        product.availability
                                      )}
                                      {product.stockQuantity != null ? (
                                        <span className="text-[10px] text-brand-textMuted tabular-nums">
                                          Qty: {product.stockQuantity}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        product.status === "publish"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-slate-200 text-slate-700"
                                      }`}
                                    >
                                      {product.status === "publish"
                                        ? "Published"
                                        : "Draft"}
                                    </span>
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                    <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isQuickEditing) {
                                            setQuickEdit(null);
                                          } else {
                                            setQuickEdit({
                                              id: product.id,
                                              title: product.title,
                                              sku: product.sku,
                                              priceInput:
                                                product.price != null
                                                  ? String(product.price)
                                                  : "",
                                              salePriceInput:
                                                product.salePrice != null
                                                  ? String(product.salePrice)
                                                  : "",
                                              stockQuantityInput:
                                                product.stockQuantity != null
                                                  ? String(product.stockQuantity)
                                                  : "",
                                              availability: product.availability,
                                              status: product.status,
                                              isFeatured: Boolean(
                                                product.isFeatured
                                              ),
                                              isFlashDeal: Boolean(
                                                product.isFlashDeal
                                              ),
                                            });
                                          }
                                        }}
                                        title="Quick Edit"
                                        className="inline-flex items-center gap-1 rounded border border-brand-border bg-white px-2 py-1 text-[11px] font-medium text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                                      >
                                        <SlidersHorizontal
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                        <span>Quick Edit</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingForm(
                                            productRecordToFormState(product)
                                          )
                                        }
                                        className="inline-flex items-center gap-1 rounded border border-brand-blue bg-brand-blue/5 px-2 py-1 text-[11px] font-semibold text-brand-blue hover:bg-brand-blue hover:text-white"
                                      >
                                        <Pencil
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                        <span>Edit</span>
                                      </button>

                                      <a
                                        href={`/product/${encodeURIComponent(product.slug)}?preview=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded border border-brand-border bg-white px-2 py-1 text-[11px] font-medium text-brand-textMain hover:border-brand-orange hover:text-brand-orange"
                                      >
                                        <ExternalLink
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                        <span>Preview</span>
                                      </a>

                                      <button
                                        type="button"
                                        disabled={busyProductId === product.id}
                                        onClick={() =>
                                          void handleDuplicate(product)
                                        }
                                        title="Duplicate product"
                                        className="inline-flex items-center gap-1 rounded border border-brand-border bg-white px-2 py-1 text-[11px] font-medium text-brand-textMain hover:border-brand-blue hover:text-brand-blue disabled:opacity-50"
                                      >
                                        <Copy
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                        <span>Duplicate</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={busyProductId === product.id}
                                        onClick={() =>
                                          void handleDeleteProduct(product)
                                        }
                                        title="Delete product"
                                        aria-label={`Delete ${product.title}`}
                                        className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                      >
                                        <Trash2
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {isQuickEditing && quickEdit ? (
                                  <tr className="bg-slate-50">
                                    <td colSpan={8} className="p-4">
                                      <form
                                        onSubmit={handleQuickEditSave}
                                        className="space-y-3 rounded-control border border-brand-blue/30 bg-white p-4 shadow-sm"
                                      >
                                        <div className="flex items-center justify-between border-b border-brand-border pb-2">
                                          <h3 className="text-xs font-bold uppercase tracking-wide text-brand-blue">
                                            Quick Edit: {product.title}
                                          </h3>
                                          <button
                                            type="button"
                                            onClick={() => setQuickEdit(null)}
                                            className="text-xs text-brand-textMuted hover:text-brand-textMain"
                                          >
                                            Cancel
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                          <label className="space-y-1 sm:col-span-2">
                                            <span className="block text-[11px] font-semibold text-brand-textMain">
                                              Title
                                            </span>
                                            <input
                                              type="text"
                                              required
                                              value={quickEdit.title}
                                              onChange={(e) =>
                                                setQuickEdit((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        title: e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                              className="w-full rounded border border-brand-border px-2.5 py-1.5 text-xs focus:border-brand-blue focus:outline-none"
                                            />
                                          </label>

                                          <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold text-brand-textMain">
                                              SKU
                                            </span>
                                            <input
                                              type="text"
                                              required
                                              value={quickEdit.sku}
                                              onChange={(e) =>
                                                setQuickEdit((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        sku: e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                              className="w-full rounded border border-brand-border px-2.5 py-1.5 font-mono text-xs focus:border-brand-blue focus:outline-none"
                                            />
                                          </label>

                                          <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold text-brand-textMain">
                                              Price (BDT)
                                            </span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={quickEdit.priceInput}
                                              onChange={(e) =>
                                                setQuickEdit((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        priceInput:
                                                          e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                              className="w-full rounded border border-brand-border px-2.5 py-1.5 text-xs tabular-nums focus:border-brand-blue focus:outline-none"
                                            />
                                          </label>

                                          <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold text-brand-textMain">
                                              Sale Price
                                            </span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={quickEdit.salePriceInput}
                                              onChange={(e) =>
                                                setQuickEdit((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        salePriceInput:
                                                          e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                              className="w-full rounded border border-brand-border px-2.5 py-1.5 text-xs tabular-nums focus:border-brand-blue focus:outline-none"
                                            />
                                          </label>

                                          <label className="space-y-1">
                                            <span className="block text-[11px] font-semibold text-brand-textMain">
                                              Stock Qty
                                            </span>
                                            <input
                                              type="number"
                                              min={0}
                                              value={
                                                quickEdit.stockQuantityInput
                                              }
                                              onChange={(e) =>
                                                setQuickEdit((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        stockQuantityInput:
                                                          e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                              className="w-full rounded border border-brand-border px-2.5 py-1.5 text-xs tabular-nums focus:border-brand-blue focus:outline-none"
                                            />
                                          </label>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                          <div className="flex flex-wrap items-center gap-4">
                                            <label className="flex items-center gap-1.5 text-xs">
                                              <span className="font-semibold text-brand-textMain">
                                                Availability:
                                              </span>
                                              <select
                                                value={quickEdit.availability}
                                                onChange={(e) =>
                                                  setQuickEdit((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          availability: e.target
                                                            .value as Availability,
                                                        }
                                                      : null
                                                  )
                                                }
                                                className="rounded border border-brand-border bg-white px-2 py-1 text-xs"
                                              >
                                                <option value="in_stock">
                                                  In Stock
                                                </option>
                                                <option value="out_of_stock">
                                                  Out of Stock
                                                </option>
                                                <option value="preorder">
                                                  Pre-Order
                                                </option>
                                                <option value="upcoming">
                                                  Upcoming
                                                </option>
                                              </select>
                                            </label>

                                            <label className="flex items-center gap-1.5 text-xs">
                                              <span className="font-semibold text-brand-textMain">
                                                Status:
                                              </span>
                                              <select
                                                value={quickEdit.status}
                                                onChange={(e) =>
                                                  setQuickEdit((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          status: e.target
                                                            .value as CmsProductStatus,
                                                        }
                                                      : null
                                                  )
                                                }
                                                className="rounded border border-brand-border bg-white px-2 py-1 text-xs"
                                              >
                                                <option value="publish">
                                                  Published
                                                </option>
                                                <option value="draft">
                                                  Draft
                                                </option>
                                              </select>
                                            </label>

                                            <label className="inline-flex items-center gap-1.5 text-xs font-medium">
                                              <input
                                                type="checkbox"
                                                checked={quickEdit.isFeatured}
                                                onChange={(e) =>
                                                  setQuickEdit((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          isFeatured:
                                                            e.target.checked,
                                                        }
                                                      : null
                                                  )
                                                }
                                              />
                                              <span>Featured</span>
                                            </label>

                                            <label className="inline-flex items-center gap-1.5 text-xs font-medium">
                                              <input
                                                type="checkbox"
                                                checked={quickEdit.isFlashDeal}
                                                onChange={(e) =>
                                                  setQuickEdit((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          isFlashDeal:
                                                            e.target.checked,
                                                        }
                                                      : null
                                                  )
                                                }
                                              />
                                              <span>Flash Deal</span>
                                            </label>
                                          </div>

                                          <button
                                            type="submit"
                                            disabled={quickSaving}
                                            className="inline-flex items-center rounded-control bg-brand-orange px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-orangeHover disabled:opacity-50"
                                          >
                                            {quickSaving
                                              ? "Updating..."
                                              : "Save Quick Edit"}
                                          </button>
                                        </div>
                                      </form>
                                    </td>
                                  </tr>
                                ) : null}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : activeView === "media" ? (
            <div className="rounded-card border border-brand-border bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <h2 className="text-base font-bold text-brand-textMain">
                    Media Library
                  </h2>
                  <p className="text-xs text-brand-textMuted">
                    Upload product photos, copy persistent URLs, or remove unused
                    assets.
                  </p>
                </div>
              </div>
              <MediaLibraryPanel
                media={media}
                loading={loadingMedia}
                onMediaUploaded={(item) =>
                  setMedia((prev) => [item, ...prev.filter((m) => m.id !== item.id)])
                }
                onMediaDeleted={(id) =>
                  setMedia((prev) => prev.filter((m) => m.id !== id))
                }
                onNotify={notify}
              />
            </div>
          ) : activeView === "categories" ? (
            <CategoryManager
              categories={categories}
              onRefresh={fetchProductsAndCategories}
              onNotify={notify}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Export & Reset */}
              <div className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
                <div className="flex items-center gap-2 border-b border-brand-border pb-3">
                  <Database className="h-4 w-4 text-brand-blue" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-brand-textMain">
                    Backup Export &amp; Demo Catalog Reset
                  </h2>
                </div>

                <div className="space-y-2 rounded-control border border-brand-border bg-brand-grayBg/50 p-4">
                  <h3 className="text-xs font-bold text-brand-textMain">
                    Export JSON Backup
                  </h3>
                  <p className="text-xs text-brand-textMuted">
                    Downloads all products, categories, and media metadata as a
                    portable JSON snapshot.
                  </p>
                  <button
                    type="button"
                    disabled={toolsBusy}
                    onClick={() => void handleExportBackup()}
                    className="inline-flex items-center gap-1.5 rounded-control bg-brand-blue px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-blueDark disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Export JSON Backup</span>
                  </button>
                </div>

                <div className="space-y-2 rounded-control border border-rose-200 bg-rose-50/60 p-4">
                  <h3 className="text-xs font-bold text-rose-900">
                    Reset Demo Catalog
                  </h3>
                  <p className="text-xs text-rose-800">
                    Restores the 32 seeded Star Tech products and categories. Use
                    with caution — custom edits will be replaced.
                  </p>
                  <button
                    type="button"
                    disabled={toolsBusy}
                    onClick={() => void handleResetDemoCatalog()}
                    className="inline-flex items-center gap-1.5 rounded-control bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset Demo Catalog</span>
                  </button>
                </div>
              </div>

              {/* Import Snapshot */}
              <div className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
                <div className="flex items-center justify-between border-b border-brand-border pb-3">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-brand-textMain">
                    <Upload className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                    <span>Import JSON Backup</span>
                  </h2>
                  <input
                    ref={importFileRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      void file.text().then((text) => {
                        setImportJsonText(text);
                      });
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="rounded-control border border-brand-border bg-white px-2.5 py-1 text-xs font-semibold text-brand-blue hover:border-brand-blue"
                  >
                    Load .json file
                  </button>
                </div>

                <textarea
                  rows={10}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='Paste exported JSON snapshot ({ "products": [...], "categories": [...] })...'
                  aria-label="JSON backup payload"
                  className="w-full rounded-control border border-brand-border p-3 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                />

                <button
                  type="button"
                  disabled={toolsBusy || !importJsonText.trim()}
                  onClick={() => void handleImportSnapshot(importJsonText)}
                  className="inline-flex items-center gap-1.5 rounded-control bg-brand-orange px-4 py-2 text-xs font-semibold text-white hover:bg-brand-orangeHover disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Import JSON Snapshot</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
