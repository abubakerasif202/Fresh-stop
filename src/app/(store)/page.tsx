import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Leaf, MapPin, MessageCircle, Sprout } from "lucide-react";
import { getCatalogue, getStores } from "@/lib/catalogue-data";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ProductCard } from "@/components/products/ProductCard";
import { ContactActions } from "@/components/ui/ContactActions";
import { Reveal } from "@/components/ui/Reveal";
import { CONTACT } from "@/lib/contact";
import { FloatingProduce, HeroHeadline, LeafDivider, Mascot, MascotStrip, PeekingCarrot } from "@/components/motion";

// Catalogue approvals and active stores are runtime data, independent of the build.
export const dynamic = "force-dynamic";
const categoryTiles = [
  { name: "Fresh fruit", slug: "fruits", image: "/products/cavendish-bananas-1kg.webp" },
  { name: "Vegetables", slug: "vegetables", image: "/products/fresh-broccoli-head.webp" },
  { name: "Rice & grains", slug: "rice-grains", image: "/products/ai/basmati-rice.webp" },
  { name: "Pantry essentials", slug: "pantry", image: "/products/ai/red-lentils.webp" },
  { name: "Frozen foods", slug: "frozen", image: "/products/ai/plain-paratha.webp" },
  { name: "Drinks", slug: "drinks", image: "/products/ai/fruit-juice.webp" },
  { name: "Condiments", slug: "condiments", image: "/products/ai/green-olives.webp" }
];
export default async function HomePage() {
  const [products, stores] = await Promise.all([getCatalogue(), getStores()]);
  const visibleCategoryTiles = categoryTiles.filter(tile => products.some(product => product.category.slug === tile.slug));
  const featuredSlugs = ["cavendish-bananas-1kg","fresh-carrots","fresh-eggplant","basmati-rice","red-lentils","plain-paratha","green-olives","fresh-strawberries"];
  const featured = products.filter(p => featuredSlugs.includes(p.slug)).slice(0,8);
  const filled = [...featured,...products.filter(p=>!featured.includes(p) && p.imageKind !== "placeholder")].slice(0,8);
  return <div>
    <section className="hero-bg relative isolate overflow-x-clip border-b border-forest/10 bg-leaf-soft/50">
      <FloatingProduce />
      <div className="page-width relative z-10 grid items-center gap-9 pb-10 pt-16 sm:pt-9 lg:grid-cols-[1fr_1.07fr] lg:gap-12 lg:py-14">
        <div className="relative z-10 animate-rise">
          <p className="eyebrow mb-5 inline-flex items-center gap-2 text-deep-green"><Sprout size={17} aria-hidden="true" />Your local Fresh Stop</p>
          <HeroHeadline />
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">Colourful fruit and veg, pantry favourites and groceries worth exploring. Discover the range at Fresh Stop.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link className="button button-red" href="/products">Explore Our Products<ArrowRight size={18} aria-hidden="true" /></Link><Link href="/wholesale" className="button button-outline text-forest">Wholesale &amp; Business Enquiries<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
          <div className="mt-8 flex items-center gap-3 border-t border-forest/15 pt-5 text-sm font-bold text-forest"><MapPin size={19} aria-hidden="true" /><span>Rockdale &amp; Riverwood, Sydney</span><Mascot kind="strawberry" animation="wave" size={52} className="ml-auto" /></div>
        </div>
        <div className="relative min-w-0 pb-6 lg:pb-0">
          <div className="hero-art relative aspect-[1.05] overflow-hidden bg-forest"><Image src="/images/produce-hero.webp" alt="Illustrative fresh vegetables and colourful fruit arranged in a wooden crate" fill priority fetchPriority="high" sizes="(max-width: 1023px) calc(100vw - 2rem), 640px" quality={65} className="object-cover" /></div>
          <div className="sd-parallax absolute -left-2 -top-5 w-28 -rotate-6 sm:w-40 lg:w-44"><div className="hero-logo"><BrandLogo size={200} sizes="(max-width: 639px) 112px, (max-width: 1023px) 160px, 176px" /></div></div>
          <Leaf aria-hidden="true" className="absolute right-1 top-0 h-12 w-12 animate-float fill-leaf text-deep-green" />
          <div className="absolute bottom-0 left-5 right-5 rounded-xl bg-cream px-5 py-4 shadow-soft lg:-bottom-5"><p className="font-black text-forest">From our catalogue to your kitchen.</p><p className="mt-1 text-xs text-ink-soft">Browse online. Enquire directly with our team.</p></div>
        </div>
      </div>
    </section>
    <LeafDivider />
    <section className="page-width pb-12 pt-6 lg:pb-16" aria-labelledby="category-heading">
      <div className="mb-7 flex items-end justify-between gap-4"><div className="relative"><PeekingCarrot /><p className="eyebrow mb-2 text-deep-green">Everyday staples. New discoveries.</p><h2 id="category-heading" className="section-title">Find your favourites.</h2></div><Link href="/products" className="hidden min-h-11 items-center gap-2 text-sm font-extrabold text-forest sm:inline-flex">View all categories<ArrowRight size={16} aria-hidden="true" /></Link></div>
      <div className="sd-rise grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{visibleCategoryTiles.map(c=><Link href={`/products?category=${c.slug}`} key={c.slug} className="category-tile group overflow-hidden rounded-xl border border-forest/10 bg-white text-center"><div className="relative mx-auto aspect-[1.25]"><Image src={c.image} alt="" fill sizes="(max-width: 640px) 45vw, 160px" className="object-contain p-3" /></div><span className="block border-t border-forest/5 px-2 py-3 text-sm font-black text-forest">{c.name}</span></Link>)}</div>
    </section>
    <MascotStrip className="page-width" />
    <section className="border-y border-forest/10 bg-cream-deep/60 py-12 lg:py-16"><div className="page-width">
      <Reveal><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2 text-deep-green">Take a closer look</p><h2 className="section-title">Good food, all kinds.</h2></div><Link href="/products" className="button button-green">Browse all products<ArrowRight size={17} aria-hidden="true" /></Link></div></Reveal>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 sm:gap-5">{filled.map((p,index)=><ProductCard {...p} key={p.id} categoryName={p.category.name} categorySlug={p.category.slug} index={index} />)}</div>
      <p className="mt-5 text-xs text-ink-soft">AI-generated product photography is illustrative. Contact us to confirm product details and current availability.</p>
    </div></section>
    <section className="page-width py-14 lg:py-20"><Reveal><div className="grid overflow-hidden rounded-3xl bg-forest text-white lg:grid-cols-[1.2fr_.8fr]">
      <div className="p-7 sm:p-10 lg:p-14"><p className="eyebrow text-lime">For your business</p><h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Wholesale &amp;<br />Business Orders</h2><p className="mb-7 mt-5 max-w-lg leading-relaxed text-white/85">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p><ContactActions /><a href={CONTACT.phoneHref} className="mt-5 inline-block text-sm font-bold text-lime">{CONTACT.phoneDisplay}</a></div>
      <div className="relative min-h-64 border-t border-white/10 bg-deep-green/30 p-7 lg:border-l lg:border-t-0"><span className="eyebrow text-lime">A range worth exploring</span><div className="mt-6 grid gap-3">{["Fresh fruit & vegetables","Rice, grains & pantry essentials","Frozen foods & everyday groceries","Condiments, drinks & more"].map(t=><p key={t} className="flex items-center justify-between border-b border-white/20 py-3 text-lg font-extrabold">{t}<ArrowUpRight size={18} aria-hidden="true" /></p>)}</div><Link href="/wholesale" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-lime">Let’s talk wholesale<ArrowRight size={17} aria-hidden="true" /></Link></div>
    </div></Reveal></section>
    <section className="bg-leaf-soft py-14 lg:py-20"><div className="page-width grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
      <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-full border border-forest/15 bg-cream"><MessageCircle className="h-36 w-36 text-deep-green" strokeWidth={1.2} aria-hidden="true" /><Leaf className="absolute left-5 top-7 h-16 w-16 -rotate-12 fill-leaf text-deep-green" aria-hidden="true" /><p className="absolute bottom-9 rounded-full bg-brand-red px-5 py-2 text-sm font-black text-white">A fresh conversation starts here.</p></div>
      <div><p className="eyebrow text-deep-green">Let’s get in touch</p><h2 className="section-title mt-3">Home Delivery Enquiries</h2><p className="mb-7 mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">For home delivery enquiries, please email us or send a message on WhatsApp.</p><ContactActions delivery /><Link href="/home-delivery" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest">Find out how to enquire<ArrowRight size={17} aria-hidden="true" /></Link></div>
    </div></section>
    <section className="page-width py-14 lg:py-20"><div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow mb-2 text-deep-green">Come say hello</p><h2 className="section-title">Your local Fresh Stop.</h2></div><Link href="/stores" className="button button-outline text-forest">Our stores<ArrowUpRight size={17} aria-hidden="true" /></Link></div>
      <div className="grid gap-5 md:grid-cols-2">{stores.map((s,i)=><div key={s.id} className={`rounded-2xl border border-forest/10 p-7 sm:p-9 ${i===0?"bg-leaf-soft":"bg-peach"}`}><MapPin size={28} className="text-brand-red" aria-hidden="true" /><h3 className="mt-4 text-3xl font-black tracking-tight text-forest">{s.suburb}</h3><p className="mt-3 text-sm font-bold">{s.address}, {s.suburb} {s.state} {s.postcode}</p><a href={s.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest underline underline-offset-4">Get directions<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></div>)}</div>
    </section>
  </div>;
}
export const metadata: Metadata = { alternates: { canonical: "/" } };
