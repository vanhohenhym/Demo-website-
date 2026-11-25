import type { Product } from "@/lib/cms/types";
import { BASE_URL, SITE_NAME } from "./metadata";

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/opengraph-image`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+880-9678002003",
        contactType: "customer service",
        areaServed: "BD",
        availableLanguage: ["en", "bn"],
      },
    ],
    sameAs: [
      "https://www.facebook.com/star.tech.ltd",
      "https://www.youtube.com/@StarTechLtd",
      "https://www.instagram.com/startech.com.bd",
    ],
  };
}

export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

export function getProductSchema(product: Product) {
  const imageUrl = product.images?.[0]?.url?.trim();
  const hasAbsoluteImage =
    typeof imageUrl === "string" &&
    (imageUrl.startsWith("https://") || imageUrl.startsWith("http://"));
  const effectivePrice =
    product.price !== undefined &&
    product.salePrice !== undefined &&
    product.salePrice < product.price
      ? product.salePrice
      : product.price;

  const availabilityMap: Record<Product["availability"], string> = {
    in_stock: "https://schema.org/InStock",
    out_of_stock: "https://schema.org/OutOfStock",
    preorder: "https://schema.org/PreOrder",
    upcoming: "https://schema.org/PreOrder",
  };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(hasAbsoluteImage ? { image: imageUrl } : {}),
    description: product.shortDescription || product.name,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    ...(effectivePrice !== undefined
      ? {
          offers: {
            "@type": "Offer",
            url: `${BASE_URL}/product/${product.slug}`,
            priceCurrency: "BDT",
            price: effectivePrice,
            availability: availabilityMap[product.availability],
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {}),
  };
}

export function getItemListSchema(
  listName: string,
  items: Array<{ name: string; slug: string; position: number }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      url: `${BASE_URL}/product/${item.slug}`,
      name: item.name,
    })),
  };
}
