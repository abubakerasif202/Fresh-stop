"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileNav({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return <div className="relative ml-auto lg:hidden">
    <button ref={button} type="button" className="grid h-11 w-11 place-items-center rounded-full border border-forest/20 text-forest" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute right-0 top-14 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-forest/10 bg-cream p-3 shadow-lift">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 font-bold text-forest hover:bg-leaf-soft">{link.label}</Link>)}</nav>}
  </div>;
}
