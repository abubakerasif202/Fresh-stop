"use client";

import { Search } from "lucide-react";
import { useId } from "react";

interface SearchBoxProps {
  className?: string;
  onSubmitted?: () => void;
}

export function SearchBox({ className = "", onSubmitted }: SearchBoxProps) {
  const id = useId();
  return (
    <form
      action="/products"
      method="get"
      role="search"
      onSubmit={onSubmitted}
      className={`relative ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        Search fresh produce
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      <input
        id={id}
        type="search"
        name="q"
        placeholder="Search fruit, veg, boxes..."
        autoComplete="off"
        className="h-11 w-full rounded-full border border-forest/15 bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/80 shadow-soft transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-leaf"
      />
    </form>
  );
}
