"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/cms/types";
import {
  COMPARE_CHANGE_EVENT,
  COMPARE_STORAGE_KEY,
  MAX_COMPARE_ITEMS,
  addToCompareList,
  parseCompareStorage,
  removeFromCompareList,
  replaceCompareList,
  serializeCompareProduct,
  type AddToCompareResult,
  type CompareItem,
} from "@/lib/compare/compare";

export interface PendingCompareConflict {
  item: CompareItem;
  existingCategorySlug: string;
  existingCategoryName: string;
}

export interface CompareContextValue {
  items: CompareItem[];
  count: number;
  maxItems: number;
  isFull: boolean;
  categorySlug: string | null;
  categoryName: string | null;
  pendingConflict: PendingCompareConflict | null;
  addProduct: (product: Product | CompareItem) => AddToCompareResult;
  removeItem: (id: string) => void;
  clearAll: () => void;
  confirmReplaceWithPending: () => void;
  cancelPendingConflict: () => void;
  isInCompare: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function isFullProduct(input: Product | CompareItem): input is Product {
  return "images" in input && Array.isArray(input.images);
}

function readStoredItems(): CompareItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    return parseCompareStorage(window.localStorage.getItem(COMPARE_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeStoredItems(items: CompareItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota or private-browsing write errors
  }
  window.dispatchEvent(
    new CustomEvent<CompareItem[]>(COMPARE_CHANGE_EVENT, { detail: items })
  );
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [pendingConflict, setPendingConflict] =
    useState<PendingCompareConflict | null>(null);

  useEffect(() => {
    setItems(readStoredItems());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === COMPARE_STORAGE_KEY || event.key === null) {
        setItems(parseCompareStorage(event.newValue));
        setPendingConflict(null);
      }
    };

    const handleSameTabChange = (event: Event) => {
      const customEvent = event as CustomEvent<CompareItem[] | undefined>;
      const next = Array.isArray(customEvent.detail)
        ? customEvent.detail
        : readStoredItems();
      setItems((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(next)) {
          return prev;
        }
        return next;
      });
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(COMPARE_CHANGE_EVENT, handleSameTabChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(COMPARE_CHANGE_EVENT, handleSameTabChange);
    };
  }, []);

  const persist = useCallback((next: CompareItem[]) => {
    setItems(next);
    writeStoredItems(next);
  }, []);

  const addProduct = useCallback(
    (product: Product | CompareItem): AddToCompareResult => {
      const item = isFullProduct(product)
        ? serializeCompareProduct(product)
        : product;
      const result = addToCompareList(items, item);

      if (result.status === "added") {
        persist(result.nextList);
      } else if (result.status === "category_mismatch" && items.length > 0) {
        setPendingConflict({
          item,
          existingCategorySlug: items[0].categorySlug,
          existingCategoryName: items[0].categoryName,
        });
      }

      return result;
    },
    [items, persist]
  );

  const removeItem = useCallback(
    (id: string) => {
      const next = removeFromCompareList(items, id);
      persist(next);
    },
    [items, persist]
  );

  const clearAll = useCallback(() => {
    setPendingConflict(null);
    persist([]);
  }, [persist]);

  const confirmReplaceWithPending = useCallback(() => {
    if (!pendingConflict) {
      return;
    }
    const next = replaceCompareList(pendingConflict.item);
    setPendingConflict(null);
    persist(next);
  }, [pendingConflict, persist]);

  const cancelPendingConflict = useCallback(() => {
    setPendingConflict(null);
  }, []);

  const isInCompare = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items]
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      count: items.length,
      maxItems: MAX_COMPARE_ITEMS,
      isFull: items.length >= MAX_COMPARE_ITEMS,
      categorySlug: items[0]?.categorySlug ?? null,
      categoryName: items[0]?.categoryName ?? null,
      pendingConflict,
      addProduct,
      removeItem,
      clearAll,
      confirmReplaceWithPending,
      cancelPendingConflict,
      isInCompare,
    }),
    [
      items,
      pendingConflict,
      addProduct,
      removeItem,
      clearAll,
      confirmReplaceWithPending,
      cancelPendingConflict,
      isInCompare,
    ]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return ctx;
}
