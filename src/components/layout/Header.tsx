import Link from "next/link";
import { stripeSandboxEnabled } from "@/lib/stripe-sandbox";
import { Phone, Search } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { CONTACT } from "@/lib/contact";
import { MobileNav } from "./MobileNav";

const NAV_LINKS = [
  { label: "Home", href: "/" }, { label: "Catalogue", href: "/products" },
  { label: "Wholesale", href: "/wholesale" }, { label: "Home delivery", href: "/home-delivery" },
  { label: "Our stores", href: "/stores" }
];

export function Header() {
  const links = stripeSandboxEnabled() ? [...NAV_LINKS, { label: "Sandbox shop", href: "/shop" }] : NAV_LINKS;
  return <header className="site-header sticky top-0 z-40 bg-cream">
    <div className="bg-forest text-white"><div className="page-width flex min-h-8 items-center justify-between gap-3 text-xs font-bold"><span>Fresh produce, groceries &amp; wholesale enquiries</span><a className="hidden whitespace-nowrap sm:block" href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a></div></div>
    <div className="page-width flex items-center gap-5 py-3">
      <Link href="/" className="flex shrink-0 items-center gap-2"><BrandLogo size={64} priority /><span aria-hidden="true" className="hidden font-display text-xl font-black leading-tight text-forest xl:block">FRESH<span className="block text-brand-red">STOP</span></span></Link>
      <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-5 lg:flex">{links.map(link => <Link key={link.href} href={link.href} className="nav-link">{link.label}</Link>)}</nav>
      <form action="/products" role="search" className="ml-auto hidden min-w-0 max-w-52 flex-1 md:block lg:ml-3"><label htmlFor="header-search" className="sr-only">Search the catalogue</label><div className="relative"><input id="header-search" name="q" type="search" maxLength={100} placeholder="Find something fresh…" className="h-11 w-full rounded-full border border-forest/20 bg-white pl-4 pr-11 text-sm" /><button className="absolute right-0 top-0 grid h-11 w-11 place-items-center" aria-label="Search catalogue"><Search size={18} /></button></div></form>
      <a href={CONTACT.phoneHref} aria-label="Contact us by phone" className="button button-green hidden shrink-0 sm:inline-flex"><Phone size={16} aria-hidden="true" /><span className="hidden xl:inline">Contact us</span></a>
      <MobileNav links={links} />
    </div>
  </header>;
}
