import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { getStores } from "@/lib/catalogue-data";
import { CONTACT } from "@/lib/contact";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Our Stores — Rockdale & Riverwood", description: "Visit Fresh Stop in Rockdale and Riverwood. Find store contact details and directions, or contact our team about products, wholesale and home delivery.", alternates: { canonical: "/stores" } };
export const revalidate = 60;

function openingHours(value: string): [string, string][] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const labels: Record<string, string> = { mon_sat: "Monday–Saturday", sun: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
    return Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0 && Boolean(labels[entry[0]])).map(([day, hours]) => [labels[day], hours]);
  } catch { return []; }
}

export default async function StoresPage() {
  const stores = await getStores();
  const structuredData = { "@context": "https://schema.org", "@graph": stores.map(store => ({
    "@type": "GroceryStore", "@id": `${SITE_URL}/stores#${store.slug}`, name: store.name,
    url: `${SITE_URL}/stores#${store.slug}`, telephone: CONTACT.phoneE164, email: store.email,
    hasMap: store.googleMapsUrl, image: `${SITE_URL}/brand/fresh-stop-primary.webp`,
    address: { "@type": "PostalAddress", streetAddress: store.address, addressLocality: store.suburb,
      addressRegion: store.state, postalCode: store.postcode, addressCountry: "AU" }
  })) };
  return <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <div className="mb-10 max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-forest">Come say hello</p><h1 className="mt-4 font-display text-4xl font-black leading-tight tracking-tight text-forest sm:text-6xl">Your local Fresh Stop.</h1><p className="mt-5 text-base leading-relaxed text-ink/70">Explore fresh produce and groceries at our Rockdale and Riverwood stores. Contact our team before visiting if you are looking for a particular product.</p></div>
    <div className="grid gap-6 md:grid-cols-2">{stores.map(store => { const hours = openingHours(store.openingHours); return <section id={store.slug} key={store.id} className="scroll-mt-28 rounded-[2rem] border border-forest/15 bg-white p-6 sm:p-9"><div className="mb-7 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-forest/80">Fresh Stop</p><h2 className="font-display text-3xl font-black text-forest">{store.suburb}</h2></div><MapPin className="h-9 w-9 shrink-0 text-brand-red" aria-hidden="true" /></div><address className="space-y-4 text-sm not-italic leading-relaxed text-ink/75"><p><strong className="block text-base text-ink">{store.address}</strong>{store.suburb} {store.state} {store.postcode}</p><a href={CONTACT.phoneHref} className="flex min-h-11 w-fit items-center gap-3 font-semibold text-forest hover:underline"><Phone className="h-4 w-4" aria-hidden="true" />{CONTACT.phoneDisplay}</a>{store.email && <a href={`mailto:${store.email}`} className="flex min-h-11 w-fit max-w-full items-center gap-3 break-all font-semibold text-forest hover:underline"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{store.email}</a>}</address>{hours.length > 0 && <div className="mt-6 border-t border-forest/10 pt-5"><h3 className="mb-3 text-sm font-extrabold text-forest">Opening hours</h3><dl className="space-y-2 text-sm text-ink/70">{hours.map(([day, time]) => <div key={day} className="flex flex-wrap justify-between gap-x-6 gap-y-1"><dt>{day}</dt><dd>{time}</dd></div>)}</dl></div>}{store.googleMapsUrl && <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-full bg-forest px-6 text-sm font-bold text-white hover:bg-forest-deep">Get Directions<ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only"> (opens Google Maps in a new tab)</span></a>}</section>; })}</div>
    <section className="mt-12 grid gap-6 rounded-[2rem] bg-cream-deep p-6 sm:p-10 md:grid-cols-2"><div><h2 className="font-display text-2xl font-extrabold text-forest">Wholesale &amp; Business Orders</h2><p className="mt-3 text-sm leading-relaxed text-ink/75">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p><div className="mt-5 flex flex-wrap gap-3"><a href={CONTACT.phoneHref} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-bold text-white">Call Now</a><a href={CONTACT.wholesaleEmailHref} className="inline-flex min-h-11 items-center rounded-full border border-forest px-5 text-sm font-bold text-forest">Email Us</a></div></div><div><h2 className="font-display text-2xl font-extrabold text-forest">Home Delivery Enquiries</h2><p className="mt-3 text-sm leading-relaxed text-ink/75">For home delivery enquiries, please email us or send a message on WhatsApp.</p><Link href="/home-delivery" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-forest px-5 text-sm font-bold text-forest">Home delivery enquiries</Link></div></section>
  </div>;
}
