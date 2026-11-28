"use client";

import React, { useState } from "react";
import { FolderTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { slugifyClient, type AdminCategoryRecord } from "./types";

export interface CategoryManagerProps {
  categories: readonly AdminCategoryRecord[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string, variant?: "success" | "error") => void;
}

export function CategoryManager({
  categories,
  onRefresh,
  onNotify,
}: CategoryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [parentSlug, setParentSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setSlugManual(false);
    setParentSlug("");
    setDescription("");
  };

  const handleEdit = (category: AdminCategoryRecord) => {
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setSlugManual(true);
    setParentSlug(category.parentSlug ?? "");
    setDescription(category.description ?? "");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const resolvedSlug = slugifyClient(slug.trim() || trimmedName);
    if (!trimmedName || !resolvedSlug) {
      onNotify("Category name and slug are required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/cms/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? `cat-${resolvedSlug}`,
          name: trimmedName,
          slug: resolvedSlug,
          parentSlug: parentSlug.trim() || null,
          description: description.trim() || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        onNotify(data.error || "Failed to save category.", "error");
        return;
      }

      await onRefresh();
      onNotify(
        editingId
          ? `Updated category "${trimmedName}".`
          : `Created category "${trimmedName}".`,
        "success"
      );
      resetForm();
    } catch {
      onNotify("Network error saving category.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: AdminCategoryRecord) => {
    const productHint =
      category.productCount && category.productCount > 0
        ? ` (${category.productCount} products currently reference this category)`
        : "";
    if (
      !window.confirm(
        `Delete category "${category.name}" (${category.slug})${productHint}?`
      )
    ) {
      return;
    }

    setDeletingSlug(category.slug);
    try {
      const response = await fetch(
        `/api/cms/categories?slug=${encodeURIComponent(category.slug)}`,
        { method: "DELETE" }
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        onNotify(data.error || "Failed to delete category.", "error");
        return;
      }
      await onRefresh();
      if (editingId === category.id) {
        resetForm();
      }
      onNotify(`Deleted category "${category.name}".`, "success");
    } catch {
      onNotify("Network error deleting category.", "error");
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Add / Edit Category Form (WordPress Taxonomy Left Column) */}
      <div className="lg:col-span-4">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-card border border-brand-border bg-white p-5 shadow-card"
        >
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-textMain">
              <FolderTree className="h-4 w-4 text-brand-blue" aria-hidden="true" />
              <span>{editingId ? "Edit Category" : "Add New Category"}</span>
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-textMuted hover:text-brand-textMain"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cat-name"
              className="block text-xs font-semibold text-brand-textMain"
            >
              Name <span className="text-brand-orange">*</span>
            </label>
            <input
              id="cat-name"
              type="text"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugManual) {
                  setSlug(slugifyClient(next));
                }
              }}
              placeholder="e.g. Graphics Card"
              className="w-full rounded-control border border-brand-border px-3 py-2 text-sm text-brand-textMain focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cat-slug"
              className="block text-xs font-semibold text-brand-textMain"
            >
              Slug <span className="text-brand-orange">*</span>
            </label>
            <input
              id="cat-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              placeholder="e.g. graphics-card"
              className="w-full rounded-control border border-brand-border px-3 py-2 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
            />
            <p className="text-[11px] text-brand-textMuted">
              Used in URLs like <code className="font-mono">/category/{slug || "slug"}</code>
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cat-parent"
              className="block text-xs font-semibold text-brand-textMain"
            >
              Parent Category Slug (optional)
            </label>
            <input
              id="cat-parent"
              type="text"
              list="cms-parent-category-options"
              value={parentSlug}
              onChange={(e) => setParentSlug(e.target.value)}
              placeholder="e.g. component, power, accessories"
              className="w-full rounded-control border border-brand-border px-3 py-2 font-mono text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
            />
            <datalist id="cms-parent-category-options">
              <option value="component" />
              <option value="power" />
              <option value="accessories" />
              <option value="gaming" />
              <option value="server-storage" />
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cat-description"
              className="block text-xs font-semibold text-brand-textMain"
            >
              Description
            </label>
            <textarea
              id="cat-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short SEO and catalog description..."
              className="w-full rounded-control border border-brand-border px-3 py-2 text-xs text-brand-textMain focus:border-brand-blue focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-control bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Category"
                  : "Add Category"}
            </span>
          </button>
        </form>
      </div>

      {/* Category Table (Right Column) */}
      <div className="lg:col-span-8">
        <div className="overflow-hidden rounded-card border border-brand-border bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-brand-border bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-bold text-brand-textMain">
              Categories ({categories.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-brand-grayBg text-brand-textMain">
                <tr>
                  <th scope="col" className="border-b border-brand-border px-4 py-2.5 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="border-b border-brand-border px-4 py-2.5 font-semibold">
                    Slug
                  </th>
                  <th scope="col" className="border-b border-brand-border px-4 py-2.5 font-semibold">
                    Parent
                  </th>
                  <th scope="col" className="border-b border-brand-border px-4 py-2.5 font-semibold">
                    Count
                  </th>
                  <th scope="col" className="border-b border-brand-border px-4 py-2.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border bg-white">
                {categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-brand-textMuted"
                    >
                      No categories found. Add your first category on the left.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-brand-grayBg/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-brand-textMain">
                          {cat.name}
                        </div>
                        {cat.description ? (
                          <div className="mt-0.5 line-clamp-1 text-[11px] text-brand-textMuted">
                            {cat.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-brand-blue">
                        {cat.slug}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-brand-textMuted">
                        {cat.parentSlug || "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-brand-textMain">
                        {cat.productCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(cat)}
                            aria-label={`Edit ${cat.name}`}
                            className="inline-flex items-center gap-1 rounded-control border border-brand-border bg-white px-2.5 py-1 text-[11px] font-medium text-brand-textMain hover:border-brand-blue hover:text-brand-blue"
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(cat)}
                            disabled={deletingSlug === cat.slug}
                            aria-label={`Delete ${cat.name}`}
                            className="inline-flex items-center gap-1 rounded-control border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
