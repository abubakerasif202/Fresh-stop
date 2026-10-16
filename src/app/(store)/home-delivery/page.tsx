import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContactActions } from "@/components/ui/ContactActions";
import { Mascot, LeafDivider } from "@/components/motion";
import { ContactCards } from "@/components/enquiry/ContactCards";
import "@/styles/catalogue-motion.css";

export const metadata: Metadata = { title: "Home Delivery Enquiries", description: "Ask Fresh Stop about home delivery. Email info@freshstop.com.au or message +61 423 936 586 on WhatsApp.", alternates: { canonical: "/home-delivery" } };
export default function HomeDeliveryPage() {
  return <><section className="bg-leaf-soft py-14 sm:py-20"><div className="page-width grid items-center gap-10 md:grid-cols-[1.4fr_.6fr]"><div><p className="eyebrow text-deep-green">Fresh Stop, let’s talk</p><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-forest sm:text-6xl">Home Delivery<br />Enquiries</h1><p className="mb-8 mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">For home delivery enquiries, please email us or send a message on WhatsApp.</p><ContactActions delivery /></div><div className="mx-auto hidden md:block" aria-hidden="true"><Mascot kind="orange" animation="bounce" size={168} /></div></div></section>
    <section className="page-width grid gap-7 py-14 lg:grid-cols-3 lg:py-20">{[
      ["01","Explore the range","Browse the catalogue and note the products you are interested in."],
      ["02","Send us a message","Share your product list, suburb and any questions by email or WhatsApp."],
      ["03","Discuss the details","Our team can advise on your enquiry. Please confirm availability and delivery arrangements directly."]
    ].map(([n,title,text])=><div key={n} className="sd-rise rounded-2xl border border-forest/10 bg-white p-7"><span className="text-4xl font-black text-brand-red">{n}</span><h2 className="mt-5 text-xl font-black text-forest">{title}</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">{text}</p></div>)}</section>
    <section className="page-width mb-8 rounded-2xl bg-forest p-7 text-white sm:p-10"><h2 className="text-2xl font-black">Start your enquiry.</h2><ContactCards kind="delivery" className="mt-5" /><Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-lime">Browse the catalogue<ArrowRight size={16} aria-hidden="true" /></Link></section><LeafDivider /></>;
}
