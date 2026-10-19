import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
