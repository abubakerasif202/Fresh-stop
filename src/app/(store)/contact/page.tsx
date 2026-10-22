import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT } from "@/lib/contact";
import { EnquiryForm } from "@/components/enquiry/EnquiryForm";

export const metadata: Metadata = {
  title: "Contact Fresh Stop",
  description: "Contact Fresh Stop by phone, email or WhatsApp for product, wholesale and home delivery enquiries.",
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  return <div className="page-width py-12 sm:py-20">
    <p className="eyebrow text-deep-green">Let’s talk fresh</p>
    <h1 className="section-title mt-4">Contact Fresh Stop</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">Ask about a product, discuss wholesale requirements or enquire about home delivery. Include product names and your suburb when relevant so our team can discuss the details with you.</p>
    <div className="mt-9 grid gap-5 md:grid-cols-3">
      {[
        ["Call our team", CONTACT.phoneDisplay, CONTACT.phoneHref],
        ["Email Fresh Stop", CONTACT.email, `mailto:${CONTACT.email}`],
        ["Home delivery", "Message us on WhatsApp", CONTACT.whatsappHref]
      ].map(([title, label, href]) => <section key={title} className="min-w-0 rounded-2xl border border-forest/10 bg-white p-6"><h2 className="text-xl font-extrabold text-forest">{title}</h2><a href={href} className="mt-4 inline-flex min-h-11 items-center break-all font-bold text-forest underline underline-offset-4">{label}</a></section>)}
    </div>
    <section aria-labelledby="contact-form-heading" className="mt-10 max-w-2xl rounded-2xl border border-forest/10 bg-white p-6 sm:p-8"><h2 id="contact-form-heading" className="text-2xl font-black text-forest">Send us a message</h2><EnquiryForm kind="CONTACT" className="mt-5" /></section>
    <p className="mt-7 max-w-2xl text-sm leading-relaxed text-ink-soft">Email and WhatsApp open an external service to send your message. Please avoid sending payment card details or other sensitive information.</p>
    <div className="mt-8 flex flex-wrap gap-4"><Link href="/stores" className="button button-green">Store details &amp; directions</Link><Link href="/faq" className="button button-cream">Common questions</Link></div>
  </div>;
}
