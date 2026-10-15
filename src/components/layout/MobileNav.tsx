"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { SearchBox } from "./SearchBox";
import { DeliveryPostcodeChecker } from "./DeliveryPostcodeChecker";
import { BrandLogo } from "@/components/ui/BrandLogo";

export interface NavLink {
  label: string;
  href: string;
  highlight?: boolean;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
}

const FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled])";

export function MobileNav({ open, onClose, links }: MobileNavProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        id="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="absolute right-0 top-0 flex h-full w-[min(22rem,90vw)] flex-col overflow-y-auto bg-cream p-5 shadow-lift animate-rise"
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BrandLogo size={36} />
            <span className="font-display text-lg font-bold text-forest">Fresh Stop</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-leaf-soft"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <SearchBox className="mt-5" onSubmitted={onClose} />

        <nav aria-label="Shop categories" className="mt-5 flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              className={`rounded-2xl px-4 py-3 text-base font-semibold transition hover:bg-leaf-soft ${
                l.highlight ? "text-citrus-deep" : "text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/stores"
            onClick={onClose}
            className="rounded-2xl px-4 py-3 text-base font-semibold text-ink transition hover:bg-leaf-soft"
          >
            Our Stores
          </Link>
        </nav>

        <div className="mt-4 border-t border-forest/10 pt-4">
          <DeliveryPostcodeChecker />
        </div>
      </div>
    </div>
  );
}
