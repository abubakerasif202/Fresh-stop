import { STOREFRONT_DEMO } from "@/lib/indicative-pricing";
import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppContact } from "@/components/layout/WhatsAppContact";
import { SITE_URL } from "@/lib/site";
import { IntroGate } from "@/components/motion/IntroGate";
import { CartProvider } from "@/context/CartContext";
import { CartDrawerLoader } from "@/components/cart/CartDrawerLoader";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-rounded", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Fresh Stop — Sydney Fresh Produce & Online Groceries", template: "%s | Fresh Stop" },
  description: "Shop farm fresh produce, groceries, rice, pantry staples and frozen foods at Fresh Stop with online ordering and home delivery across Sydney, NSW.",
  openGraph: {
    title: "Fresh Stop — Sydney Fresh Produce & Online Grocery Delivery",
    description: "Shop online for fresh fruits, vegetables, pantry staples and groceries with fast Sydney delivery.",
    siteName: "Fresh Stop",
    locale: "en_AU",
    type: "website"
  },
  twitter: { card: "summary_large_image" },
  robots: process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : undefined,
  referrer: "strict-origin-when-cross-origin"
};
export const viewport: Viewport = { themeColor: "#0B3D1B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={nunito.variable}>
      <body className="flex min-h-screen flex-col bg-cream text-ink antialiased">
        <CartProvider>
          <IntroGate />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4 focus:font-bold"
          >
            Skip to content
          </a>
          <Header />
          {STOREFRONT_DEMO && <p className="border-b border-forest/10 bg-leaf-soft px-4 py-2 text-center text-xs font-semibold leading-relaxed text-forest">Grocery prices are indicative until confirmed by Fresh Stop. Browse, build your cart and send an enquiry.</p>}
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <WhatsAppContact />
          <CartDrawerLoader />
        </CartProvider>
      </body>
    </html>
  );
}
