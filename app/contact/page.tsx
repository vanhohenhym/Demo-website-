import React from "react";
import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, Building2 } from "lucide-react";
import { constructMetadata } from "@/lib/seo/metadata";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = constructMetadata({
  title: "Contact Us",
  description:
    "Contact Star Tech customer care for product inquiries, warranty support, store locations, and custom PC consultation.",
  path: "/contact",
  canonicalPath: "/contact",
});

interface BranchLocation {
  name: string;
  city: string;
  address: string;
  hours: string;
  services: string;
}

const BRANCH_LOCATIONS: readonly BranchLocation[] = [
  {
    name: "Dhaka — IDB Bhaban",
    city: "Dhaka",
    address: "BCS Computer City, IDB Bhaban, Agargaon, Sher-e-Bangla Nagar, Dhaka 1207",
    hours: "Sat – Thu: 10:00 AM – 8:00 PM (Friday Closed)",
    services: "Sales, Custom PC Assembly & Warranty Desk",
  },
  {
    name: "Dhaka — Multiplan Centre",
    city: "Dhaka",
    address: "Level 6, ECS Computer City, Multiplan Centre, New Elephant Road, Dhaka 1205",
    hours: "Wed – Mon: 10:00 AM – 8:00 PM (Tuesday Closed)",
    services: "Sales, Pickup Counter & Component Consultation",
  },
  {
    name: "Dhaka — Uttara",
    city: "Dhaka",
    address: "House 15, Sonargaon Janapath, Sector 7, Uttara, Dhaka 1230",
    hours: "Sat – Thu: 10:00 AM – 8:00 PM (Friday Closed)",
    services: "Retail Showroom & Express Pickup",
  },
  {
    name: "Chattogram — Agrabad",
    city: "Chattogram",
    address: "Agrabad Commercial Area, Sheikh Mujib Road, Chattogram 4100",
    hours: "Sat – Thu: 10:00 AM – 8:00 PM (Friday Closed)",
    services: "Regional Sales & After-Sales Support",
  },
  {
    name: "Rajshahi — Shaheb Bazar",
    city: "Rajshahi",
    address: "Alupatti More, Shaheb Bazar, Boalia, Rajshahi 6100",
    hours: "Sat – Thu: 10:00 AM – 8:00 PM (Friday Closed)",
    services: "Retail Showroom & Order Collection",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Contact Us" }]} />

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        {/* Exactly ONE h1 */}
        <h1 className="text-2xl font-bold text-brand-textMain">Contact Us</h1>
        <p className="text-xs text-brand-textMuted mt-1">
          Have a question about a product, warranty, or order? Reach out to our customer care team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Information Cards */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 text-xs space-y-2">
            <div className="h-9 w-9 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center">
              <Phone className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 className="font-bold text-sm text-brand-textMain">Call Center</h2>
            <p className="text-brand-textMuted">Dial 16793 (9 AM - 8 PM)</p>
            <p className="text-brand-textMuted">Hotline: +880 9678002003</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 text-xs space-y-2">
            <div className="h-9 w-9 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 className="font-bold text-sm text-brand-textMain">Email Support</h2>
            <p className="text-brand-textMuted">webteam@startechbd.com</p>
            <p className="text-brand-textMuted">Response time: within 24 hours</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 text-xs space-y-2">
            <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 className="font-bold text-sm text-brand-textMain">Corporate Office</h2>
            <p className="text-brand-textMuted leading-relaxed">
              28 Kazi Nazrul Islam Ave, Navana Zohura Square, Dhaka 1000, Bangladesh
            </p>
          </div>
        </div>

        {/* Contact Form with Zod validation and honeypot */}
        <ContactForm />
      </div>

      {/* Our Branch Locations Directory */}
      <section
        aria-labelledby="branch-locations-heading"
        className="bg-white p-6 rounded-lg border border-gray-200 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h2
              id="branch-locations-heading"
              className="text-base font-bold text-brand-textMain flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-brand-blue" aria-hidden="true" />
              <span>Our Branch Locations</span>
            </h2>
            <p className="text-xs text-brand-textMuted mt-0.5">
              Visit any showroom for in-person pickup, PC build assembly, or warranty assistance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BRANCH_LOCATIONS.map((branch) => (
            <article
              key={branch.name}
              className="rounded-card border border-brand-border bg-brand-grayBg/40 p-4 text-xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-brand-textMain">{branch.name}</h3>
                <span className="rounded-control bg-white border border-brand-border px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                  {branch.city}
                </span>
              </div>
              <p className="text-brand-textMuted leading-relaxed flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-brand-orange" aria-hidden="true" />
                <span>{branch.address}</span>
              </p>
              <p className="text-brand-textMuted flex items-start gap-1.5">
                <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-brand-blue" aria-hidden="true" />
                <span>{branch.hours}</span>
              </p>
              <p className="text-[11px] font-medium text-brand-textMain pt-1 border-t border-brand-border/70">
                {branch.services}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
