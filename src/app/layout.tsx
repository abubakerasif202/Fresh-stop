import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppContact } from "@/components/layout/WhatsAppContact";
import { SITE_URL } from "@/lib/site";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-rounded", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Fresh Stop — Fresh Produce, Groceries & Wholesale Enquiries", template: "%s | Fresh Stop" },
  description: "Browse fresh produce, groceries, rice, pantry staples and frozen foods at Fresh Stop in Rockdale and Riverwood. Contact us for wholesale and home delivery enquiries.",
  openGraph: { title: "Fresh Stop — Fresh Produce & Groceries", description: "Explore the catalogue. Talk to our team about wholesale and home delivery.", siteName: "Fresh Stop", locale: "en_AU", type: "website" },
  twitter: { card: "summary_large_image" },
  robots: process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : undefined,
  referrer: "strict-origin-when-cross-origin"
};
export const viewport: Viewport = { themeColor: "#0B3D1B", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU" className={nunito.variable}><body className="flex min-h-screen flex-col bg-cream text-ink antialiased">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4 focus:font-bold">Skip to content</a>
    <Header /><main id="main" className="flex-1">{children}</main><Footer /><WhatsAppContact />
  </body></html>;
}
