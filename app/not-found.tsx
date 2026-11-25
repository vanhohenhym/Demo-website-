import React from "react";
import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";
import { CATEGORIES } from "@/components/layout/Header";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-100 text-brand-orange text-3xl font-black mb-2">
        404
      </div>

      {/* Exactly ONE h1 */}
      <h1 className="text-2xl sm:text-3xl font-bold text-brand-textMain">
        Page Not Found
      </h1>

      <p className="text-sm text-brand-textMuted max-w-md mx-auto">
        The page or product you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      {/* Search Input */}
      <search className="max-w-md mx-auto block">
        <form action="/category/all" method="GET" className="relative">
          <label htmlFor="not-found-search" className="sr-only">
            Search components, laptops, monitors
          </label>
          <input
            id="not-found-search"
            type="search"
            name="q"
            placeholder="Search components, laptops, monitors..."
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full h-11 pl-4 pr-11 text-sm border border-gray-400 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-500 hover:text-brand-orange"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </search>

      {/* Popular Categories */}
      <div className="pt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Popular Categories
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.slice(0, 8).map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="bg-white border border-gray-200 text-xs text-brand-textMain px-3 py-1.5 rounded-full hover:border-brand-orange hover:text-brand-orange transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-4 flex justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-brand-blue hover:bg-brand-blueDark text-white text-xs font-semibold px-5 py-2.5 rounded transition-colors"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/pc-builder"
          className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-brand-textMain text-xs font-semibold px-5 py-2.5 rounded transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Go to PC Builder</span>
        </Link>
      </div>
    </div>
  );
}
