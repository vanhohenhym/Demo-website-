import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingActions } from "@/components/layout/FloatingActions";
import { CompareProvider } from "@/components/compare/CompareProvider";
import { CompareBar } from "@/components/compare/CompareBar";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { JsonLd } from "@/components/seo/JsonLd";
import { getOrganizationSchema } from "@/lib/seo/schema";
import { constructMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = constructMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd schema={getOrganizationSchema()} />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-brand-grayBg text-brand-textMain font-sans">
        <CompareProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-brand-orange focus:text-white focus:px-4 focus:py-2 focus:rounded-control focus:text-xs focus:font-semibold focus:shadow-lg"
          >
            Skip to main content
          </a>
          <Header />
          <main id="main-content" tabIndex={-1} className="flex-1 max-w-site w-full mx-auto px-4 py-5">
            {children}
          </main>
          <FloatingActions />
          <CompareBar />
          <Footer />
        </CompareProvider>
        <CookieConsent />
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_ID} />
      </body>
    </html>
  );
}
