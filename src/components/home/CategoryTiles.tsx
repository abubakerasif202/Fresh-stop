import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export interface CategoryTile {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

const TINTS: Record<string, string> = {
  fruits: "bg-citrus text-ink",
  vegetables: "bg-leaf text-ink",
  boxes: "bg-sun text-ink",
  dairy: "bg-berry text-ink",
  pantry: "bg-forest text-cream"
};
const RADII = ["rounded-[2.5rem]", "rounded-[1.5rem] rounded-tr-[4rem]", "rounded-[2rem] rounded-bl-[4rem]"];

export function CategoryTiles({ categories }: { categories: CategoryTile[] }) {
  if (categories.length === 0) return null;
  return (
    <section id="categories" aria-labelledby="categories-heading" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
      <Reveal>
        <h2 id="categories-heading" className="font-display text-4xl font-black leading-none tracking-tight sm:text-6xl">
          Shop by <span className="text-forest">category</span>
        </h2>
      </Reveal>

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-6">
        {categories.map((c, i) => (
          <li key={c.id} className={i < 2 ? "col-span-2 lg:col-span-3" : "lg:col-span-2"}>
            <Reveal delay={i * 70} className="h-full">
              <Link
                href={`/products?category=${c.slug}`}
                className={`group relative flex h-full min-h-[200px] flex-col justify-between overflow-hidden p-5 shadow-soft transition-shadow hover:shadow-lift sm:min-h-[260px] sm:p-7 ${TINTS[c.slug] ?? "bg-forest text-cream"} ${RADII[i % RADII.length]}`}
              >
                <span className="relative z-10 flex items-start justify-between gap-2">
                  <span className="font-display text-2xl font-black leading-tight sm:text-4xl">{c.name}</span>
                  <ArrowUpRight
                    className="h-6 w-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
                {c.imageUrl && (
                  <span
                    className="absolute -bottom-6 -right-6 h-[62%] w-[62%] overflow-hidden shadow-lift"
                    style={{ borderRadius: "55% 45% 50% 50% / 50% 55% 45% 50%" }}
                  >
                    <Image
                      src={c.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                )}
                <span className="relative z-10 text-sm font-bold underline-offset-4 group-hover:underline">Browse</span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
