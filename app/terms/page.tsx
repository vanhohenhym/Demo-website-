import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const metadata: Metadata = constructMetadata({
  title: "Terms and Conditions",
  description:
    "Review Star Tech official terms of service, pricing, warranty coverage, delivery, refund, EMI, Star Points, and PC Builder terms.",
  path: "/terms",
  canonicalPath: "/terms",
});

interface TermsSectionLink {
  id: string;
  label: string;
}

const TERMS_SECTIONS: readonly TermsSectionLink[] = [
  { id: "pricing", label: "Pricing & Stock" },
  { id: "warranty", label: "Warranty Policy" },
  { id: "delivery", label: "Online Delivery" },
  { id: "refund", label: "Refund & Return" },
  { id: "emi", label: "EMI Terms" },
  { id: "star-points", label: "Star Points" },
  { id: "pc-builder", label: "PC Builder" },
] as const;

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Terms & Conditions" }]} />

      <article className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 space-y-6 text-xs text-gray-700 leading-relaxed">
        {/* Exactly ONE h1 */}
        <header className="border-b border-gray-200 pb-4 space-y-3">
          <h1 className="text-xl sm:text-2xl font-bold text-brand-textMain">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs text-brand-textMuted">
            Welcome to Star Tech. By browsing this website, configuring a custom build, or placing an
            order, you agree to the pricing, warranty, delivery, and service guidelines below.
          </p>

          <nav aria-label="Terms sections" className="flex flex-wrap gap-2 pt-1">
            {TERMS_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex items-center rounded-full border border-brand-border bg-brand-grayBg px-3 py-1 text-[11px] font-medium text-brand-textMain transition-colors hover:border-brand-orange hover:text-brand-orange"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </header>

        <section id="pricing" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            1. Product Pricing &amp; Availability
          </h2>
          <p>
            Product prices, specifications, and availability statuses are synchronized from our connected
            CMS catalog. Because hardware supply and currency rates fluctuate, prices and stock levels
            are subject to change without prior notice. Items marked &ldquo;Call for price&rdquo; or out
            of stock require confirmation with our hotline (16793) before order dispatch.
          </p>
        </section>

        <section id="warranty" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            2. Official Manufacturer Warranty
          </h2>
          <p>
            Products sold through Star Tech carry official manufacturer or authorized importer warranty
            coverage as indicated on each product listing. Warranty service requires the original
            invoice and intact serial/warranty stickers. Physical impact, liquid ingress, burn marks,
            or unauthorized hardware tampering void warranty eligibility.
          </p>
        </section>

        <section id="delivery" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            3. Online Delivery &amp; Store Pickup
          </h2>
          <p>
            Orders within Dhaka metropolitan areas are typically dispatched within 24–48 business hours,
            while nationwide courier delivery takes 2–5 business days depending on destination and
            courier schedules. Customers may also choose branch pickup from our showrooms listed on the{" "}
            <Link href="/contact" className="font-medium text-brand-blue underline hover:text-brand-orange">
              Contact &amp; Store Locator
            </Link>{" "}
            page.
          </p>
        </section>

        <section id="refund" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            4. Refund and Return Policy
          </h2>
          <p>
            Unopened, factory-sealed items or hardware verified defective on arrival (DOA) may be
            eligible for replacement or refund within 7 days of delivery when returned with complete
            packaging, accessories, and original invoice. Software licenses, custom-assembled systems,
            and physically damaged items are non-returnable unless covered by an approved warranty claim.
          </p>
        </section>

        <section id="emi" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            5. EMI Payment Terms
          </h2>
          <p>
            Equated Monthly Installment (EMI) facilities are available on eligible purchases through
            participating bank credit cards for 3, 6, 9, or 12-month tenures. Promotional cash-discount
            prices apply to direct cash/card settlements and may differ from regular EMI pricing.
          </p>
        </section>

        <section id="star-points" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            6. Star Point Policy
          </h2>
          <p>
            Star Points are loyalty credits awarded on qualifying retail and online purchases. Points
            cannot be exchanged for cash and apply solely toward eligible future purchases in
            accordance with active campaign terms.
          </p>
        </section>

        <section id="pc-builder" className="scroll-mt-24 space-y-2">
          <h2 className="text-sm font-bold text-brand-textMain">
            7. PC Builder &amp; Compatibility Guidance
          </h2>
          <p>
            Our{" "}
            <Link href="/pc-builder" className="font-medium text-brand-blue underline hover:text-brand-orange">
              PC Builder
            </Link>{" "}
            evaluates socket, memory generation, form factor, GPU clearance, and estimated power draw
            using structured product attributes. Where a product lacks verified attribute data
            (&ldquo;Could not verify&rdquo;), our technicians perform manual pre-assembly verification
            before finalizing custom builds.
          </p>
        </section>

        <footer className="border-t border-gray-200 pt-4 text-xs text-brand-textMuted flex flex-wrap items-center gap-4">
          <span>
            Read our{" "}
            <Link href="/privacy-policy" className="font-medium text-brand-blue underline hover:text-brand-orange">
              Privacy Policy
            </Link>
          </span>
          <span>
            Questions?{" "}
            <Link href="/contact" className="font-medium text-brand-blue underline hover:text-brand-orange">
              Contact Customer Care
            </Link>
          </span>
        </footer>
      </article>
    </div>
  );
}
