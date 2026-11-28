import React from "react";
import type { Metadata } from "next";
import { constructMetadata } from "@/lib/seo/metadata";
import { isAdminCookieAuthenticated } from "@/lib/cms/admin-auth";
import { AdminCmsApp } from "@/components/admin/AdminCmsApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = constructMetadata({
  title: "Custom CMS Admin",
  description:
    "Internal Star Tech Demo CMS Admin dashboard for managing catalog products, specifications, media, and categories.",
  path: "/admin",
  noIndex: true,
  noFollow: true,
});

export default async function AdminPage() {
  const initialAuthenticated = await isAdminCookieAuthenticated();
  const showDevHint = process.env.NODE_ENV !== "production";

  return (
    <AdminCmsApp
      initialAuthenticated={initialAuthenticated}
      showDevHint={showDevHint}
    />
  );
}
