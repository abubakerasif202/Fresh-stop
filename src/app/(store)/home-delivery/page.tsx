import { STOREFRONT_DEMO } from "@/lib/indicative-pricing";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContactActions } from "@/components/ui/ContactActions";
import { Mascot, LeafDivider } from "@/components/motion";
import { ContactCards } from "@/components/enquiry/ContactCards";
import "@/styles/catalogue-motion.css";

export const metadata: Metadata = { title: STOREFRONT_DEMO ? "Home Delivery Enquiries" : "Home Delivery & Pickup", description: STOREFRONT_DEMO ? "Ask Fresh Stop about home delivery. Email info@freshstop.com.au or message 0423 936 586 on WhatsApp." : "Order Fresh Stop groceries online. Enter your postcode at checkout for delivery coverage and fees, or choose pickup.", alternates: { canonical: "/home-delivery" } };
export default function HomeDeliveryPage() {
  return <><section className="bg-leaf-soft py-14 sm:py-20"><div className="page-width grid items-center gap-10 md:grid-cols-[1.4fr_.6fr]"><div><p className="eyebrow text-deep-green">Fresh Stop, let’s talk</p><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-forest sm:text-6xl">Home Delivery{STOREFRONT_DEMO && <><br />Enquiries</>}</h1><p className="mb-8 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">{STOREFRONT_DEMO ? "For home delivery enquiries, please email us or send a message on WhatsApp." : "Order online and enter your postcode at checkout for delivery coverage, fees and minimum orders. Pickup is also available. Contact us about areas outside our online delivery zones."}</p><ContactActions delivery /></div><div className="mx-auto hidden md:block" aria-hidden="true"><Mascot kind="orange" animation="bounce" size={168} /></div></div></section>
    <section className="page-width grid gap-7 py-14 lg:grid-cols-3 lg:py-20">{[
      ["01","Explore the range",STOREFRONT_DEMO ? "Browse the catalogue and note the products you are interested in." : "Browse our products and add your choices to the cart."],
      ["02",STOREFRONT_DEMO ? "Send us a message" : "Choose delivery or pickup",STOREFRONT_DEMO ? "Share your product list, suburb and any questions by email or WhatsApp." : "Enter your postcode at checkout to confirm coverage, delivery fees and minimum orders, or select a pickup store."],
      ["03",STOREFRONT_DEMO ? "Discuss the details" : "Pay securely",STOREFRONT_DEMO ? "Our team can advise on your enquiry. Please confirm availability and delivery arrangements directly." : "Review your total and continue to Stripe to pay securely. We will contact you if sourcing affects fulfilment."]
    ].map(([n,title,text])=><div key={n} className="sd-rise rounded-2xl border border-forest/10 bg-white p-7"><span className="text-4xl font-black text-brand-red">{n}</span><h2 className="mt-5 text-xl font-black text-forest">{title}</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">{text}</p></div>)}</section>
    <section className="page-width mb-8 rounded-2xl bg-forest p-7 text-white sm:p-10"><h2 className="text-2xl font-black">Start your enquiry.</h2><ContactCards kind="delivery" className="mt-5" /><Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-lime">Browse the catalogue<ArrowRight size={16} aria-hidden="true" /></Link></section><LeafDivider /></>;
}
