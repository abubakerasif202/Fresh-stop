import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { CONTACT } from "@/lib/contact";

export function Footer() {
  return <footer className="bg-forest text-white">
    <div className="page-width grid gap-10 py-14 md:grid-cols-[1.2fr_1fr_1.3fr]">
      <div><Link href="/" aria-label="Fresh Stop home" className="inline-block"><BrandLogo size={94} /></Link><p className="mt-4 max-w-xs text-lg font-extrabold">Fresh produce. Everyday groceries.<br />A world of good food.</p><p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">Browse our range and speak with our team in Rockdale and Riverwood.</p></div>
      <div><h2 className="text-sm font-black uppercase tracking-widest text-lime">Explore Fresh Stop</h2><nav aria-label="Footer navigation" className="mt-5 grid gap-3 text-sm font-bold">{[["Product catalogue","/products"],["Wholesale & business orders","/wholesale"],["Home delivery enquiries","/home-delivery"],["Our stores","/stores"]].map(([label,href])=><Link key={href} href={href} className="inline-flex items-center gap-2 hover:text-lime">{label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav></div>
      <div><h2 className="text-sm font-black uppercase tracking-widest text-lime">Wholesale &amp; Business Orders</h2><p className="mt-5 text-sm leading-relaxed text-white/80">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p><div className="mt-5 grid gap-3 text-sm font-bold"><a href={CONTACT.phoneHref} className="inline-flex items-center gap-2"><Phone size={16} aria-hidden="true" />{CONTACT.phoneDisplay}</a><a href={CONTACT.wholesaleEmailHref} className="inline-flex items-center gap-2 break-all"><Mail size={16} aria-hidden="true" />{CONTACT.email}</a><Link href="/stores" className="inline-flex items-center gap-2"><MapPin size={16} aria-hidden="true" />Rockdale &amp; Riverwood, Sydney</Link></div><a className="mt-5 inline-flex min-h-11 items-center font-bold text-lime underline underline-offset-4" href={CONTACT.whatsappHref}>Home delivery? Message us on WhatsApp</a></div>
    </div>
    <div className="border-t border-white/15"><div className="page-width flex flex-wrap justify-between gap-3 py-5 text-xs text-white/65"><p>© {new Date().getFullYear()} Fresh Stop. All rights reserved.</p><p>AI product images are illustrative. Contact us for current product details.</p></div></div>
  </footer>;
}
