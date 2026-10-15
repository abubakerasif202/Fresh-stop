import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BranchSelectorModal } from "@/components/layout/BranchSelectorModal";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SITE_URL } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap"
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fresh Stop | Fresh Fruit & Veg Greengrocer in Rockdale & Riverwood, Sydney",
    template: "%s | Fresh Stop"
  },
  description:
    "Fresh Stop is a Sydney greengrocer with stores in Rockdale and Riverwood. Shop fresh fruit, vegetables and seasonal boxes for Click & Collect or local home delivery.",
  openGraph: {
    title: "Fresh Stop — Sydney Greengrocer",
    description: "Fresh fruit and veg from our Rockdale and Riverwood stores.",
    siteName: "Fresh Stop",
    locale: "en_AU",
    type: "website"
  },
  twitter: { card: "summary_large_image" },
  referrer: "strict-origin-when-cross-origin"
};

export const viewport: Viewport = {
  themeColor: "#145A32",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="bg-cream text-ink min-h-screen flex flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-forest focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        <BranchSelectorModal />
        <CartDrawer />
      </body>
    </html>
  );
}
