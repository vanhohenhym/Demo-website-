"use client";

import React, { useState } from "react";
import Image from "next/image";
import { isRenderableImageUrl } from "@/lib/cms/image-url";

export interface SafeProductImageProps {
  src?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallback: React.ReactNode;
}

/**
 * Client-safe `next/image` wrapper that falls back to `fallback` when the CMS image
 * URL is non-renderable or fails to load at runtime (`onError`).
 */
export function SafeProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  fallback,
}: SafeProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!isRenderableImageUrl(src) || failedSrc === src) {
    return <>{fallback}</>;
  }

  const trimmedSrc = src.trim();
  const isUnoptimized =
    trimmedSrc.startsWith("/api/cms/media/") ||
    trimmedSrc.startsWith("data:");

  return (
    <Image
      src={trimmedSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isUnoptimized}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
