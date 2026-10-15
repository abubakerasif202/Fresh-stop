import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BranchSelectorModal } from "@/components/layout/BranchSelectorModal";
import { CartDrawer } from "@/components/cart/CartDrawer";

export const metadata: Metadata = {
  title: "Fresh Stop | Premium Fresh Fruit, Veg & Grocery Delivery Sydney",
  description:
    "Fresh produce delivered right to your door across Sydney from our Rockdale and Riverwood stores. Farm-fresh fruit, veg boxes, dairy, and groceries."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <BranchSelectorModal />
        <CartDrawer />
      </body>
    </html>
  );
}
