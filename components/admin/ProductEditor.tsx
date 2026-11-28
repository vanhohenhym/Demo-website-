"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUp,
  Cpu,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import type { Availability } from "@/lib/cms/types";
import { LiveProductPreview } from "./LiveProductPreview";
import { MediaLibraryModal } from "./MediaLibraryModal";
import {
  COMMON_BRAND_SUGGESTIONS,
  HARDWARE_SPEC_PRESETS,
  parseOptionalPositivePrice,
  slugifyClient,
  type AdminCategoryRecord,
  type AdminMediaRecord,
  type CmsProductStatus,
  type ProductFormState,
} from "./types";

export interface ProductEditorProps {
  initialForm: ProductFormState;
  categories: readonly AdminCategoryRecord[];
  media: readonly AdminMediaRecord[];
  mediaLoading: boolean;
  onMediaUploaded: (item: AdminMediaRecord) => void;
  onMediaDeleted: (id: string) => void;
  onSaveProduct: (
    form: ProductFormState,
    targetStatus: CmsProductStatus
  ) => Promise<ProductFormState | null>;
  onCancel: () => void;
  onNotify: (message: string, variant?: "success" | "error") => void;
}

type EditorLayoutMode = "split" | "edit" | "preview";

export function ProductEditor({
  initialForm,
  categories,
  media,
  mediaLoading,
  onMediaUploaded,
  onMediaDeleted,
  onSaveProduct,
  onCancel,
  onNotify,
}: ProductEditorProps) {
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [slugLocked, setSlugLocked] = useState<boolean>(Boolean(initialForm.id));
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | undefined>(
    initialForm.id ? initialForm.slug : undefined
  );
  const [layoutMode, setLayoutMode] = useState<EditorLayoutMode>("split");
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [externalImageUrl, setExternalImageUrl] = useState("");
  const [externalImageAlt, setExternalImageAlt] = useState("");
  const [subCategoryInput, setSubCategoryInput] = useState(
    initialForm.subCategorySlugs.join(", ")
  );
  const inlineFileInputRef = useRef<HTMLInputElement | null>(null);

  const updateForm = (updater: (prev: ProductFormState) => ProductFormState) => {
    setForm((prev) => updater(prev));
    setIsDirty(true);
  };

  const handleTitleChange = (nextTitle: string) => {
    updateForm((prev) => ({
      ...prev,
      title: nextTitle,
      slug: slugLocked
        ? prev.slug
        : slugifyClient(
            prev.sku ? `${nextTitle}-${prev.sku}` : nextTitle
          ),
    }));
  };

  const handleCategoryChange = (nextSlug: string) => {
    const matched = categories.find((cat) => cat.slug === nextSlug);
    const parentSlugs = matched?.parentSlug ? [matched.parentSlug] : [];
    setSubCategoryInput(parentSlugs.join(", "));
    updateForm((prev) => ({
      ...prev,
      categorySlug: nextSlug,
      categoryName: matched?.name ?? nextSlug,
      subCategorySlugs: parentSlugs,
    }));
  };

  const handleInlineImageUpload = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    setUploadingInline(true);
    try {
      for (const file of fileList) {
        if (file.size > 2 * 1024 * 1024) {
          onNotify(`"${file.name}" exceeds the 2 MB upload limit.`, "error");
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);

        const response = await fetch("/api/cms/media", {
          method: "POST",
          body: fd,
        });
        const data = (await response.json().catch(() => ({}))) as {
          media?: AdminMediaRecord;
          error?: string;
        };

        if (!response.ok || !data.media) {
          onNotify(data.error || `Failed to upload "${file.name}".`, "error");
          continue;
        }

        onMediaUploaded(data.media);
        updateForm((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              url: data.media!.url,
              alt: prev.title.trim() || data.media!.filename,
            },
          ],
        }));
        onNotify(`Added "${data.media.filename}" to product gallery.`, "success");
      }
    } catch {
      onNotify("Network error while uploading image.", "error");
    } finally {
      setUploadingInline(false);
    }
  };

  const handleAddExternalImage = () => {
    const url = externalImageUrl.trim();
    if (!url) {
      onNotify("Enter an image URL first.", "error");
      return;
    }
    if (
      !url.startsWith("https://") &&
      !url.startsWith("http://") &&
      !url.startsWith("/api/cms/media/") &&
      !url.startsWith("data:image/")
    ) {
      onNotify(
        "Image URL must start with https://, http://, /api/cms/media/, or data:image/.",
        "error"
      );
      return;
    }

    updateForm((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url,
          alt: externalImageAlt.trim() || prev.title.trim() || "Product image",
        },
      ],
    }));
    setExternalImageUrl("");
    setExternalImageAlt("");
  };

  const handleAddPresetSpec = (key: string, defaultVal: string) => {
    const existingIdx = form.explicitAttributes.findIndex(
      (pair) => pair.key.toLowerCase() === key.toLowerCase()
    );
    if (existingIdx >= 0) {
      onNotify(`Spec "${key}" is already in the table.`, "error");
      return;
    }
    updateForm((prev) => ({
      ...prev,
      explicitAttributes: [
        ...prev.explicitAttributes,
        { key, value: defaultVal },
      ],
    }));
  };

  const handleAutoPopulateCategorySpecs = () => {
    const slugLower = form.categorySlug.toLowerCase();
    const matchingPresets = HARDWARE_SPEC_PRESETS.filter((preset) =>
      preset.categories.includes(slugLower)
    );
    if (matchingPresets.length === 0) {
      onNotify(
        "No required hardware presets for this category — add custom specs as needed.",
        "error"
      );
      return;
    }

    const existingKeys = new Set(
      form.explicitAttributes.map((p) => p.key.toLowerCase())
    );
    const additions = matchingPresets
      .filter((preset) => !existingKeys.has(preset.key.toLowerCase()))
      .map((preset) => ({ key: preset.key, value: "" }));

    if (additions.length === 0) {
      onNotify("All recommended hardware keys are already present.", "success");
      return;
    }

    updateForm((prev) => ({
      ...prev,
      explicitAttributes: [...prev.explicitAttributes, ...additions],
    }));
    onNotify(
      `Added ${additions.length} recommended spec row${additions.length > 1 ? "s" : ""}.`,
      "success"
    );
  };

  const handleSave = async (targetStatus: CmsProductStatus) => {
    if (!form.title.trim()) {
      onNotify("Product Title is required.", "error");
      return;
    }
    if (!form.sku.trim()) {
      onNotify("SKU is required.", "error");
      return;
    }

    const regularPrice = parseOptionalPositivePrice(form.priceInput);
    const salePrice = parseOptionalPositivePrice(form.salePriceInput);
    if (
      regularPrice != null &&
      salePrice != null &&
      salePrice >= regularPrice
    ) {
      onNotify(
        "Sale Price must be strictly lower than Regular Price (or leave Sale Price blank).",
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      const saved = await onSaveProduct(form, targetStatus);
      if (saved) {
        setForm(saved);
        setSlugLocked(true);
        setSavedSlug(saved.slug);
        setIsDirty(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const savingsSummary = useMemo(() => {
    const reg = parseOptionalPositivePrice(form.priceInput);
    const sale = parseOptionalPositivePrice(form.salePriceInput);
    if (reg && sale && sale < reg) {
      const diff = Math.round(reg - sale);
      const pct = Math.round((diff / reg) * 100);
      return `Save ${diff.toLocaleString("en-US")}৳ (-${pct}%)`;
    }
    return null;
  }, [form.priceInput, form.salePriceInput]);

  return (
    <div className="space-y-4">
      {/* Editor Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-border bg-white px-4 py-3 shadow-card">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (
                isDirty &&
                !window.confirm("Discard unsaved changes and return to Products?")
              ) {
                return;
              }
              onCancel();
            }}
            className="inline-flex items-center gap-1.5 rounded-control border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All Products</span>
          </button>
          <div>
            <h2 className="text-sm font-bold text-brand-textMain sm:text-base">
              {form.id ? `Edit Product: ${form.title || form.sku}` : "Add New Product"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Editor layout mode"
            className="inline-flex rounded-control border border-brand-border bg-brand-grayBg p-0.5"
          >
            {(
              [
                { id: "split", label: "Split View" },
                { id: "edit", label: "Editor Only" },
                { id: "preview", label: "Preview Only" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLayoutMode(item.id)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  layoutMode === item.id
                    ? "bg-white text-brand-blue shadow-sm"
                    : "text-brand-textMuted hover:text-brand-textMain"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div
        className={`grid grid-cols-1 gap-5 ${
          layoutMode === "split" ? "xl:grid-cols-12" : ""
        }`}
      >
        {/* Left / Main Editor Column */}
        {layoutMode !== "preview" ? (
          <div
            className={`space-y-5 ${
              layoutMode === "split" ? "xl:col-span-7" : ""
            }`}
          >
            {/* 1. Core Identity & Permalink */}
            <section className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-brand-border pb-2.5">
                <h3 className="text-sm font-bold text-brand-textMain">
                  Product Title, Taxonomy &amp; Permalink
                </h3>
                <span className="text-[11px] text-brand-textMuted">
                  Fields marked * are required
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="prod-title"
                  className="block text-xs font-semibold text-brand-textMain"
                >
                  Product Title <span className="text-brand-orange">*</span>
                </label>
                <input
                  id="prod-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. AMD Ryzen 7 7800X3D Gaming Processor"
                  className="w-full rounded-control border border-brand-border px-3 py-2 text-sm font-medium text-brand-textMain focus:border-brand-blue focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="prod-slug"
                      className="block text-xs font-semibold text-brand-textMain"
                    >
                      Permalink Slug
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSlugLocked(false);
                        updateForm((prev) => ({
                          ...prev,
                          slug: slugifyClient(
                            prev.sku ? `${prev.title}-${prev.sku}` : prev.title
                          ),
                        }));
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-blue hover:text-brand-orange"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span>Auto-generate</span>
                    </button>
                  </div>
                  <input
                    id="prod-slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugLocked(true);
                      updateForm((prev) => ({ ...prev, slug: e.target.value }));
                    }}
                    placeholder="amd-ryzen-7-7800x3d"
                    className="w-full rounded-control border border-brand-border px-3 py-2 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-brand"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Brand
                  </label>
                  <input
                    id="prod-brand"
                    type="text"
                    list="cms-brand-suggestions"
                    value={form.brandTaxonomy}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        brandTaxonomy: e.target.value,
                      }))
                    }
                    placeholder="e.g. AMD, ASUS, MSI, Corsair"
                    className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain focus:border-brand-blue focus:outline-none"
                  />
                  <datalist id="cms-brand-suggestions">
                    {COMMON_BRAND_SUGGESTIONS.map((brand) => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-category"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Primary Category <span className="text-brand-orange">*</span>
                  </label>
                  <select
                    id="prod-category"
                    value={form.categorySlug}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full rounded-control border border-brand-border bg-white px-3 py-2 text-sm text-brand-textMain focus:border-brand-blue focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                    {!categories.some((c) => c.slug === form.categorySlug) ? (
                      <option value={form.categorySlug}>
                        {form.categoryName || form.categorySlug} ({form.categorySlug})
                      </option>
                    ) : null}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-subcategories"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Parent / Sub-Category Slugs (comma-separated)
                  </label>
                  <input
                    id="prod-subcategories"
                    type="text"
                    value={subCategoryInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setSubCategoryInput(raw);
                      const parsed = raw
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      updateForm((prev) => ({
                        ...prev,
                        subCategorySlugs: parsed,
                      }));
                    }}
                    placeholder="e.g. component, gaming"
                    className="w-full rounded-control border border-brand-border px-3 py-2 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* 2. Commercial Pricing & Inventory */}
            <section className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
              <div className="flex items-center justify-between border-b border-brand-border pb-2.5">
                <h3 className="text-sm font-bold text-brand-textMain">
                  Commercial Pricing &amp; Inventory
                </h3>
                {savingsSummary ? (
                  <span className="rounded-full bg-brand-badgePurple px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    {savingsSummary}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-sku"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    SKU <span className="text-brand-orange">*</span>
                  </label>
                  <input
                    id="prod-sku"
                    type="text"
                    value={form.sku}
                    onChange={(e) => {
                      const nextSku = e.target.value;
                      updateForm((prev) => ({
                        ...prev,
                        sku: nextSku,
                        slug: slugLocked
                          ? prev.slug
                          : slugifyClient(
                              nextSku ? `${prev.title}-${nextSku}` : prev.title
                            ),
                      }));
                    }}
                    placeholder="AMD-7800X3D"
                    className="w-full rounded-control border border-brand-border px-3 py-2 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-price"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Regular Price (BDT)
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    min={0}
                    step="1"
                    value={form.priceInput}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        priceInput: e.target.value,
                      }))
                    }
                    placeholder="Blank = Call for price"
                    className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain tabular-nums focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-sale-price"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Sale Price (BDT)
                  </label>
                  <input
                    id="prod-sale-price"
                    type="number"
                    min={0}
                    step="1"
                    value={form.salePriceInput}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        salePriceInput: e.target.value,
                      }))
                    }
                    placeholder="Optional discounted price"
                    className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain tabular-nums focus:border-brand-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-availability"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Availability
                  </label>
                  <select
                    id="prod-availability"
                    value={form.availability}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        availability: e.target.value as Availability,
                      }))
                    }
                    className="w-full rounded-control border border-brand-border bg-white px-3 py-2 text-sm text-brand-textMain focus:border-brand-blue focus:outline-none"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="preorder">Pre-Order</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-stock"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Stock Quantity
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min={0}
                    step="1"
                    value={form.stockQuantityInput}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        stockQuantityInput: e.target.value,
                      }))
                    }
                    placeholder="e.g. 15"
                    className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain tabular-nums focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="prod-warranty"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    Official Warranty
                  </label>
                  <input
                    id="prod-warranty"
                    type="text"
                    value={form.warranty}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        warranty: e.target.value,
                      }))
                    }
                    placeholder="e.g. 3 Years"
                    className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain focus:border-brand-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-brand-textMain">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        isFeatured: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-brand-border text-brand-blue focus:ring-brand-orange"
                  />
                  <span>Featured Product</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-brand-textMain">
                  <input
                    type="checkbox"
                    checked={form.isFlashDeal}
                    onChange={(e) =>
                      updateForm((prev) => ({
                        ...prev,
                        isFlashDeal: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                  />
                  <span>Include in Flash Sale / Mega Deal</span>
                </label>
              </div>
            </section>

            {/* 3. Descriptions */}
            <section className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
              <div className="border-b border-brand-border pb-2.5">
                <h3 className="text-sm font-bold text-brand-textMain">
                  Descriptions
                </h3>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="prod-short-desc"
                  className="block text-xs font-semibold text-brand-textMain"
                >
                  Short Description
                </label>
                <textarea
                  id="prod-short-desc"
                  rows={2}
                  value={form.shortDescription}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      shortDescription: e.target.value,
                    }))
                  }
                  placeholder="Concise summary displayed on the product overview and meta description..."
                  className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain focus:border-brand-blue focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="prod-html-desc"
                    className="block text-xs font-semibold text-brand-textMain"
                  >
                    HTML / Rich Description
                  </label>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateForm((prev) => ({
                          ...prev,
                          descriptionHtml: `${prev.descriptionHtml}${prev.descriptionHtml ? "\n" : ""}<p><strong>Key Highlight:</strong> </p>`,
                        }))
                      }
                      className="rounded border border-brand-border bg-brand-grayBg px-2 py-0.5 text-[11px] font-medium text-brand-textMain hover:border-brand-blue"
                    >
                      + Paragraph
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateForm((prev) => ({
                          ...prev,
                          descriptionHtml: `${prev.descriptionHtml}${prev.descriptionHtml ? "\n" : ""}<ul>\n  <li>Feature 1</li>\n  <li>Feature 2</li>\n</ul>`,
                        }))
                      }
                      className="rounded border border-brand-border bg-brand-grayBg px-2 py-0.5 text-[11px] font-medium text-brand-textMain hover:border-brand-blue"
                    >
                      + Bullet List
                    </button>
                  </div>
                </div>
                <textarea
                  id="prod-html-desc"
                  rows={5}
                  value={form.descriptionHtml}
                  onChange={(e) =>
                    updateForm((prev) => ({
                      ...prev,
                      descriptionHtml: e.target.value,
                    }))
                  }
                  placeholder="<p>Detailed product overview, features, and warranty coverage...</p>"
                  className="w-full rounded-control border border-brand-border px-3 py-2 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                />
              </div>
            </section>

            {/* 4. Media Gallery */}
            <section className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-2.5">
                <h3 className="text-sm font-bold text-brand-textMain">
                  Media Gallery ({form.images.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setMediaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-control border border-brand-blue bg-brand-blue/5 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue hover:text-white"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Choose from Media Library</span>
                </button>
              </div>

              {/* Inline Drag-and-Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (e.dataTransfer.files?.length) {
                    void handleInlineImageUpload(e.dataTransfer.files);
                  }
                }}
                className={`flex flex-col items-center justify-center rounded-control border-2 border-dashed px-4 py-4 text-center transition-colors ${
                  dragActive
                    ? "border-brand-orange bg-brand-orange/5"
                    : "border-brand-border bg-brand-grayBg/40 hover:border-brand-blue"
                }`}
              >
                <input
                  ref={inlineFileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files) {
                      void handleInlineImageUpload(e.target.files);
                      e.target.value = "";
                    }
                  }}
                />
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-brand-textMain">
                  {uploadingInline ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-orange" aria-hidden="true" />
                  ) : (
                    <Upload className="h-4 w-4 text-brand-blue" aria-hidden="true" />
                  )}
                  <span className="font-medium">
                    {uploadingInline
                      ? "Uploading to Media Library..."
                      : "Drop image files here or"}
                  </span>
                  <button
                    type="button"
                    onClick={() => inlineFileInputRef.current?.click()}
                    disabled={uploadingInline}
                    className="font-semibold text-brand-blue underline-offset-2 hover:underline"
                  >
                    browse computer
                  </button>
                </div>
              </div>

              {/* Paste External URL */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-textMuted"
                    aria-hidden="true"
                  />
                  <input
                    type="url"
                    value={externalImageUrl}
                    onChange={(e) => setExternalImageUrl(e.target.value)}
                    placeholder="Paste external image URL (https://...)"
                    className="w-full rounded-control border border-brand-border py-2 pl-8 pr-3 text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={externalImageAlt}
                  onChange={(e) => setExternalImageAlt(e.target.value)}
                  placeholder="Alt text (optional)"
                  className="w-full rounded-control border border-brand-border px-3 py-2 text-xs text-brand-textMain sm:w-44 focus:border-brand-blue focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddExternalImage}
                  className="inline-flex items-center justify-center gap-1 rounded-control border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Add URL</span>
                </button>
              </div>

              {/* Gallery Items */}
              {form.images.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {form.images.map((img, idx) => (
                    <div
                      key={`${img.url}-${idx}`}
                      className={`flex items-start gap-3 rounded-control border p-2.5 ${
                        idx === 0
                          ? "border-brand-orange/60 bg-orange-50/30"
                          : "border-brand-border bg-white"
                      }`}
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-brand-border bg-slate-50">
                        <Image
                          src={img.url}
                          alt={img.alt || form.title || "Product preview"}
                          fill
                          unoptimized
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                              <Star className="h-2.5 w-2.5" aria-hidden="true" />
                              Primary
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                updateForm((prev) => {
                                  const next = [...prev.images];
                                  const [picked] = next.splice(idx, 1);
                                  if (picked) next.unshift(picked);
                                  return { ...prev, images: next };
                                })
                              }
                              className="inline-flex items-center gap-1 rounded border border-brand-border bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue hover:border-brand-blue"
                            >
                              <ArrowUp className="h-2.5 w-2.5" aria-hidden="true" />
                              Make Primary
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              updateForm((prev) => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label={`Remove image ${idx + 1}`}
                            className="rounded p-1 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={img.alt}
                          onChange={(e) =>
                            updateForm((prev) => ({
                              ...prev,
                              images: prev.images.map((item, i) =>
                                i === idx ? { ...item, alt: e.target.value } : item
                              ),
                            }))
                          }
                          placeholder="Image alt text"
                          className="w-full rounded border border-brand-border px-2 py-1 text-[11px] text-brand-textMain focus:border-brand-blue focus:outline-none"
                        />
                        <p
                          className="truncate font-mono text-[10px] text-brand-textMuted"
                          title={img.url}
                        >
                          {img.url}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* 5. Hardware Spec Builder */}
            <section className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-brand-blue" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-brand-textMain">
                    Hardware Spec Builder
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoPopulateCategorySpecs}
                    className="inline-flex items-center gap-1 rounded-control border border-brand-blue/40 bg-brand-blue/5 px-2.5 py-1 text-[11px] font-semibold text-brand-blue hover:bg-brand-blue hover:text-white"
                  >
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    <span>Fill Required for Category</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateForm((prev) => ({
                        ...prev,
                        explicitAttributes: [
                          ...prev.explicitAttributes,
                          { key: "", value: "" },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-control border border-brand-border bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    <span>Add Custom Spec</span>
                  </button>
                </div>
              </div>

              {/* Quick-Add Presets per docs/CMS_DATA_GUIDE.md */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-textMuted">
                  Quick-Add Canonical Specs (PC Builder &amp; Filters)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {HARDWARE_SPEC_PRESETS.map((preset) => {
                    const alreadyAdded = form.explicitAttributes.some(
                      (pair) => pair.key.toLowerCase() === preset.key.toLowerCase()
                    );
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() =>
                          handleAddPresetSpec(preset.key, preset.placeholder)
                        }
                        title={preset.helper}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          alreadyAdded
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-brand-border bg-brand-grayBg/70 text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                        }`}
                      >
                        <Plus className="h-2.5 w-2.5" aria-hidden="true" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Structured Key/Value Table */}
              {form.explicitAttributes.length === 0 ? (
                <p className="rounded-control border border-dashed border-brand-border bg-brand-grayBg/40 px-4 py-5 text-center text-xs text-brand-textMuted">
                  No specifications added yet. Click a preset pill above or{" "}
                  <strong>Add Custom Spec</strong> to define hardware attributes.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-control border border-brand-border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-brand-grayBg text-brand-textMain">
                      <tr>
                        <th scope="col" className="border-b border-brand-border px-3 py-2 font-semibold">
                          Attribute Key
                        </th>
                        <th scope="col" className="border-b border-brand-border px-3 py-2 font-semibold">
                          Value
                        </th>
                        <th scope="col" className="w-12 border-b border-brand-border px-3 py-2 text-right font-semibold">
                          Remove
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border bg-white">
                      {form.explicitAttributes.map((pair, idx) => {
                        const preset = HARDWARE_SPEC_PRESETS.find(
                          (p) => p.key.toLowerCase() === pair.key.toLowerCase()
                        );
                        const datalistId = preset
                          ? `spec-suggestions-${preset.id}-${idx}`
                          : undefined;

                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2 align-top">
                              <input
                                type="text"
                                aria-label={`Spec key row ${idx + 1}`}
                                value={pair.key}
                                onChange={(e) =>
                                  updateForm((prev) => ({
                                    ...prev,
                                    explicitAttributes: prev.explicitAttributes.map(
                                      (item, i) =>
                                        i === idx
                                          ? { ...item, key: e.target.value }
                                          : item
                                    ),
                                  }))
                                }
                                placeholder="e.g. socket"
                                className="w-full rounded border border-brand-border px-2.5 py-1.5 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
                              />
                              {preset ? (
                                <p className="mt-0.5 text-[10px] text-brand-textMuted">
                                  {preset.helper}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                type="text"
                                aria-label={`Spec value row ${idx + 1}`}
                                list={datalistId}
                                value={pair.value}
                                onChange={(e) =>
                                  updateForm((prev) => ({
                                    ...prev,
                                    explicitAttributes: prev.explicitAttributes.map(
                                      (item, i) =>
                                        i === idx
                                          ? { ...item, value: e.target.value }
                                          : item
                                    ),
                                  }))
                                }
                                placeholder={preset?.placeholder ?? "Value"}
                                className="w-full rounded border border-brand-border px-2.5 py-1.5 text-xs font-medium text-brand-textMain focus:border-brand-blue focus:outline-none"
                              />
                              {preset && datalistId ? (
                                <datalist id={datalistId}>
                                  {preset.suggestions.map((val) => (
                                    <option key={val} value={val} />
                                  ))}
                                </datalist>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-right align-top">
                              <button
                                type="button"
                                onClick={() =>
                                  updateForm((prev) => ({
                                    ...prev,
                                    explicitAttributes:
                                      prev.explicitAttributes.filter(
                                        (_, i) => i !== idx
                                      ),
                                  }))
                                }
                                aria-label={`Delete spec row ${idx + 1}`}
                                className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* Right / Split Sticky Live Preview Column */}
        {layoutMode !== "edit" ? (
          <div
            className={
              layoutMode === "split" ? "xl:col-span-5 xl:sticky xl:top-4 xl:self-start" : ""
            }
          >
            <LiveProductPreview
              form={form}
              categories={categories}
              isDirty={isDirty}
              saving={saving}
              savedSlug={savedSlug}
              onSaveDraft={() => void handleSave("draft")}
              onPublish={() => void handleSave("publish")}
            />
          </div>
        ) : null}
      </div>

      {/* Media Library Picker Modal */}
      <MediaLibraryModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        media={media}
        loading={mediaLoading}
        onMediaUploaded={onMediaUploaded}
        onMediaDeleted={onMediaDeleted}
        onSelectMedia={(item) => {
          updateForm((prev) => ({
            ...prev,
            images: [
              ...prev.images,
              {
                url: item.url,
                alt: prev.title.trim() || item.filename,
              },
            ],
          }));
          onNotify(`Added "${item.filename}" to product gallery.`, "success");
        }}
        onNotify={onNotify}
      />
    </div>
  );
}
