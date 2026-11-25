import type { Metadata } from "next";

export const SITE_NAME = "Star Tech Demo";
export const DEFAULT_DESCRIPTION =
  "Leading Computer, Laptop & Electronics Retail & Online Shop. High-performance PCs, components, and gadgets.";

export function normalizeBaseUrl(raw?: string): string {
  return ((raw ?? "").trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export const BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);

function joinUrl(baseUrl: string, relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }
  const trimmed = relativeOrAbsolute.trim();
  if (!trimmed) {
    return baseUrl;
  }
  if (/^\/+$/.test(trimmed)) {
    return `${baseUrl}/`;
  }
  return `${baseUrl}/${trimmed.replace(/^\/+/, "")}`;
}

export interface ConstructMetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  canonicalPath?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  image?: string;
}

export function constructMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  canonicalPath,
  noIndex = false,
  noFollow = false,
  image = "/opengraph-image",
}: ConstructMetadataOptions = {}): Metadata {
  const baseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Leading Tech & Electronics Store`;
  const canonicalUrl = joinUrl(baseUrl, canonicalPath ?? path);
  const resolvedImageUrl = joinUrl(baseUrl, image);
  const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !noIndex,
      follow: !noFollow,
      googleBot: {
        index: !noIndex,
        follow: !noFollow,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: resolvedImageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [resolvedImageUrl],
    },
    verification: gscVerification
      ? {
          google: gscVerification,
        }
      : undefined,
  };
}
