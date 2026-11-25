import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Star Tech collects, stores, and protects personal data, browser storage keys, and analytics cookie preferences.",
  path: "/privacy-policy",
  canonicalPath: "/privacy-policy",
});

interface StorageKeyRow {
  key: string;
  category: string;
  mechanism: string;
  purpose: string;
}

const BROWSER_STORAGE_ROWS: readonly StorageKeyRow[] = [
  {
    key: "pc_compare_items",
    category: "Essential (Functional)",
    mechanism: "localStorage",
    purpose: "Stores up to 4 selected products for side-by-side specification comparison.",
  },
  {
    key: "pc_builder_state",
    category: "Essential (Functional)",
    mechanism: "localStorage",
    purpose: "Saves your 12-slot PC Builder selections, quantities, and manual verification notes.",
  },
  {
    key: "pc_cookie_consent",
    category: "Essential (Preference)",
    mechanism: "localStorage",
    purpose: "Records your cookie consent choice (essential only vs. analytics enabled) and update timestamp.",
  },
  {
    key: "_ga, _ga_*",
    category: "Optional (Analytics)",
    mechanism: "First-party cookies",
    purpose: "Google Analytics 4 measurement cookies; set only after you explicitly accept analytics.",
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Privacy Policy" }]} />

      <article className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 space-y-6 text-xs text-gray-700 leading-relaxed">
        {/* Exactly ONE h1 */}
        <header className="border-b border-gray-200 pb-4 space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-textMain">
            Privacy Policy
          </h1>
          <p className="text-xs text-brand-textMuted">
            Last updated: November 2026. This policy explains what information Star Tech collects,
            how browser storage and cookies work, and how you control your privacy choices.
          </p>
        </header>

        <section id="information-collected" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            1. Information We Collect
          </h2>
          <p>
            We collect only the details needed to respond to inquiries, process orders, and verify
            manufacturer warranties. When you submit our{" "}
            <Link href="/contact" className="font-medium text-brand-blue underline hover:text-brand-orange">
              Contact Form
            </Link>
            , we collect your name, email address, optional phone number, subject, and inquiry message.
          </p>
          <p>
            We do not store payment card numbers on our web servers, and we never log sensitive inquiry
            messages or personal contact fields into public application logs.
          </p>
        </section>

        <section id="cookies" className="scroll-mt-24 space-y-3">
          <h2 className="text-sm font-bold text-brand-textMain">
            2. Cookies &amp; Browser Storage
          </h2>
          <p>
            Essential browser storage keeps core shopping features—such as the Product Compare drawer
            and PC Builder workspace—functional without requiring an account. Optional Google Analytics 4
            tracking is <strong>disabled by default</strong> and activates only after you click{" "}
            <strong>Accept Analytics</strong> in the cookie banner. When active, IP anonymization is
            enabled and Google advertising signals remain disabled.
          </p>

          <div className="overflow-x-auto rounded-card border border-brand-border">
            <table className="w-full min-w-[540px] border-collapse text-left text-xs">
              <thead className="bg-brand-grayBg text-brand-textMain">
                <tr>
                  <th className="px-3 py-2.5 font-semibold border-b border-brand-border">Storage Key</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-brand-border">Category</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-brand-border">Mechanism</th>
                  <th className="px-3 py-2.5 font-semibold border-b border-brand-border">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {BROWSER_STORAGE_ROWS.map((row) => (
                  <tr key={row.key} className="bg-white">
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-brand-navy">
                      {row.key}
                    </td>
                    <td className="px-3 py-2.5 text-brand-textMain">{row.category}</td>
                    <td className="px-3 py-2.5 text-brand-textMuted">{row.mechanism}</td>
                    <td className="px-3 py-2.5 text-gray-700">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-1">
            <CookieSettingsButton className="inline-flex min-h-[38px] items-center justify-center rounded-control bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blueDark" />
          </div>
        </section>

        <section id="third-party" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            3. Third-Party Services
          </h2>
          <p>
            If you opt in to analytics, aggregated page performance metrics are processed by Google
            Analytics 4 under Google Consent Mode with ad storage and personalization denied. Contact form
            submissions may be routed through our configured transactional email provider (such as Resend
            or an authorized SMTP mail server) solely to deliver your inquiry to our support desk.
          </p>
        </section>

        <section id="data-security" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            4. Data Security &amp; Retention
          </h2>
          <p>
            All traffic is encrypted in transit via HTTPS/TLS, and strict browser security headers
            (including <span className="font-mono text-[11px]">Referrer-Policy</span> and{" "}
            <span className="font-mono text-[11px]">Permissions-Policy</span>) restrict unnecessary
            data exposure. We never sell, rent, or trade your personal information to third parties.
          </p>
        </section>

        <section id="your-rights" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            5. Your Rights &amp; Contact
          </h2>
          <p>
            You may withdraw analytics consent at any time by reopening Cookie Settings above or via the
            footer, and you can clear locally stored comparison or PC Builder items from your browser.
            To request correction or deletion of inquiry records, please{" "}
            <Link href="/contact" className="font-medium text-brand-blue underline hover:text-brand-orange">
              contact our support team
            </Link>
            . You may also review our{" "}
            <Link href="/terms" className="font-medium text-brand-blue underline hover:text-brand-orange">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
