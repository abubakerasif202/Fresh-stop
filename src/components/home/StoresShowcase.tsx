"use client";

import { Check, Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import { BRANCHES, useBranchStore } from "@/lib/store/useBranchStore";
import { useHydratedStore } from "@/lib/store/useHydratedStore";
import { Reveal } from "@/components/ui/Reveal";

const SLUGS = ["rockdale", "riverwood"] as const;
const PANELS = {
  rockdale: "bg-forest text-cream rounded-[2.5rem] rounded-tr-[5rem]",
  riverwood: "bg-berry text-ink rounded-[2.5rem] rounded-bl-[5rem]"
} as const;

export function StoresShowcase() {
  const currentBranch = useHydratedStore(useBranchStore, (s) => s.currentBranch);
  const setBranch = useBranchStore((s) => s.setBranch);

  return (
    <section aria-labelledby="stores-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <Reveal>
        <h2 id="stores-heading" className="font-display text-4xl font-black leading-none tracking-tight sm:text-6xl">
          Visit a <span className="text-forest">Fresh Stop</span>
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {SLUGS.map((slug, i) => {
          const b = BRANCHES[slug];
          const isCurrent = currentBranch?.slug === slug;
          const onDark = slug === "rockdale";
          return (
            <Reveal key={slug} delay={i * 100} className="h-full">
              <article className={`flex h-full flex-col p-7 sm:p-9 ${PANELS[slug]}`}>
                <h3 className="font-display text-3xl font-black sm:text-4xl">{b.name}</h3>

                <ul className="mt-6 space-y-3 text-sm font-medium">
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>
                      {b.address}, {b.suburb} NSW {b.postcode}
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <a href={`tel:${b.phone.replace(/[^0-9]/g, "")}`} className="underline underline-offset-4">
                      {b.phone}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{b.hours}</span>
                  </li>
                </ul>

                <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
                  <button
                    type="button"
                    onClick={() => setBranch(slug)}
                    aria-pressed={isCurrent}
                    className={`inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-extrabold transition-transform hover:-translate-y-0.5 ${
                      onDark ? "bg-sun text-ink" : "bg-ink text-cream"
                    }`}
                  >
                    {isCurrent && <Check className="h-4 w-4" aria-hidden="true" />}
                    {isCurrent ? "My store" : "Choose this store"}
                  </button>
                  <a
                    href={b.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold underline underline-offset-4"
                  >
                    Open in Maps
                    <span className="sr-only">(opens in a new tab)</span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
