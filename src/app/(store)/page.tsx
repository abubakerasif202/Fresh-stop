import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Leaf, MapPin, MessageCircle, ShoppingBasket, Sprout, Sun, Tag } from "lucide-react";
import { getCatalogue, getStores } from "@/lib/catalogue-data";
import { ProductCard } from "@/components/products/ProductCard";
import { ContactActions } from "@/components/ui/ContactActions";
import { Reveal } from "@/components/ui/Reveal";
import { MarketHero } from "@/components/home/MarketHero";
import { CONTACT } from "@/lib/contact";
import { homepageMapsUrl, homepageSpecials, storeOpeningHours } from "@/lib/homepage";
import "@/styles/homepage.css";

// Prices, approvals and active branches remain runtime catalogue data.
export const dynamic = "force-dynamic";

const categoryTiles = [
  { name: "Fresh fruits", slug: "fruits", image: "/products/strawberries-250g.webp" },
  { name: "Vegetables", slug: "vegetables", image: "/products/fresh-broccoli-head.webp" },
  { name: "Groceries & pantry", slug: "pantry", image: "/products/ai/red-lentils.webp" },
  { name: "Rice & grains", slug: "rice-grains", image: "/products/ai/basmati-rice.webp" },
  { name: "Frozen foods", slug: "frozen", image: "/products/ai/plain-paratha.webp" },
  { name: "Drinks", slug: "drinks", image: "/products/ai/fruit-juice.webp" },
  { name: "Condiments", slug: "condiments", image: "/products/ai/green-olives.webp" }
];
const values = [
  { icon: Sprout, title: "Fresh produce", text: "Make room for colourful fruits, leafy greens and everyday vegetables." },
  { icon: MapPin, title: "Close to home", text: "Find your local Fresh Stop in Rockdale or Riverwood, Sydney." },
  { icon: ShoppingBasket, title: "More in your basket", text: "Explore rice, grains, pantry favourites, frozen foods and groceries." },
  { icon: MessageCircle, title: "Come say hello", text: "Have a question or something in mind? Speak with our team." }
];

export default async function HomePage() {
  const [products, stores] = await Promise.all([getCatalogue(), getStores()]);
  const categories = categoryTiles.filter(tile => products.some(product => product.category.slug === tile.slug));
  const specials = homepageSpecials(products);
  const featuredSlugs = ["cavendish-bananas-1kg", "fresh-carrots", "fresh-eggplant", "basmati-rice", "red-lentils", "plain-paratha", "green-olives", "fresh-strawberries"];
  const featured = products.filter(product => featuredSlugs.includes(product.slug));
  const picks = [...featured, ...products.filter(product => !featured.includes(product) && product.imageKind !== "placeholder")].slice(0, 8);

  return <div className="market-home">
    <MarketHero mapsUrl={homepageMapsUrl(stores)} />
    <div className="market-note"><div className="page-width">
      <span><Leaf size={17} aria-hidden="true" />Fresh fruit &amp; vegetables</span>
      <span><ShoppingBasket size={17} aria-hidden="true" />Everyday groceries</span>
      <span><MapPin size={17} aria-hidden="true" />Your local Sydney stores</span>
    </div></div>
    <section id="fresh-produce" className="page-width market-section" aria-labelledby="category-heading">
      <div className="market-section-head"><div><p className="eyebrow">A little colour. A lot to discover.</p><h2 id="category-heading" className="section-title">Fresh finds for every basket.</h2></div><Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest">Explore the range<ArrowRight size={17} aria-hidden="true" /></Link></div>
      <div className="market-category-grid">{categories.map((category, index) => <Link href={`/products?category=${category.slug}`} key={category.slug} className={`market-category ${index > 2 ? "market-category-small" : ""}`}>
        <div className="market-category-image"><Image src={category.image} alt="" fill sizes={index === 0 ? "(max-width: 1023px) 45vw, 640px" : "(max-width: 1023px) 45vw, 320px"} className={index > 1 ? "object-contain" : ""} /></div>
        <span className="market-category-label">{category.name}<ArrowUpRight size={19} aria-hidden="true" /></span>
      </Link>)}</div>
      <p className="mt-4 text-xs text-ink-soft">Category images are reference photography and illustrations.</p>
    </section>
    <section id="weekly-specials" className="market-specials market-section" aria-labelledby="specials-heading"><div className="page-width">
      <div className="market-section-head"><div><p className="eyebrow">See what’s in store</p><h2 id="specials-heading" className="section-title">Weekly specials.</h2></div><Tag size={30} className="text-brand-red" aria-hidden="true" /></div>
      {specials.length > 0 ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 sm:gap-5">{specials.map((product, index) => <ProductCard {...product} key={product.id} categoryName={product.category.name} categorySlug={product.category.slug} index={index} />)}</div> : <div className="market-specials-empty">
        <Tag size={32} aria-hidden="true" /><div><h3 className="text-xl font-black text-forest">Discover this week’s fresh finds.</h3><p className="mt-2 text-sm leading-relaxed text-ink-soft">Ask our team about current in-store specials and availability.</p></div><a href={CONTACT.phoneHref} className="button button-green">Call our team<ArrowUpRight size={17} aria-hidden="true" /></a>
      </div>}
      <div className="market-section-head mt-12"><div><p className="eyebrow">From our catalogue to your kitchen</p><h2 className="section-title">Good food, all kinds.</h2></div><Link href="/products" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest">Browse all products<ArrowRight size={17} aria-hidden="true" /></Link></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 sm:gap-5">{picks.map((product, index) => <ProductCard {...product} key={product.id} categoryName={product.category.name} categorySlug={product.category.slug} index={index} />)}</div>
      <p className="mt-5 text-xs text-ink-soft">AI-generated product photography is illustrative. Contact us to confirm product details and current availability.</p>
    </div></section>
    <section id="visit-store" className="page-width market-section" aria-labelledby="visit-heading"><Reveal><div className="market-visit">
      <figure className="market-visit-art"><Image src="/images/market-scene-illustration.webp" alt="Illustrated fruit market with a green Fresh Stop sign and colourful produce displays; not a photograph of our stores." fill sizes="(max-width: 1023px) 100vw, 640px" /><figcaption>Artist’s impression. Visit our stores to experience Fresh Stop.</figcaption></figure>
      <div className="market-visit-copy"><p className="eyebrow text-deep-green">Your neighbourhood market</p><h2 id="visit-heading" className="section-title mt-3">Make a fresh stop.</h2><p className="mt-4 leading-relaxed text-ink-soft">Drop in for fruit, vegetables and everyday favourites. We’d love to see you.</p>
        {stores.map(store => <div key={store.id} className="market-store"><h3>{store.suburb}</h3><address>{store.address}<br />{store.suburb} {store.state} {store.postcode}</address>
          {storeOpeningHours(store.openingHours).length > 0 && <dl className="my-3 space-y-1 text-xs text-ink-soft">{storeOpeningHours(store.openingHours).map(([day, hours]) => <div key={day} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt>{day}</dt><dd>{hours}</dd></div>)}</dl>}
          {store.googleMapsUrl && <a href={store.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest underline underline-offset-4">Get directions to {store.suburb}<ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>}
        </div>)}
        <Link href="/stores" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-forest">Store &amp; contact details<ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </div></Reveal></section>
    <section id="about-us" className="market-values market-section" aria-labelledby="why-heading"><div className="page-width"><Reveal>
      <p className="eyebrow text-deep-green">A fresh part of your everyday</p><h2 id="why-heading" className="section-title mt-3">Good reasons to stop by.</h2>
      <div className="market-values-grid">{values.map(({ icon: Icon, title, text }) => <div key={title}><Icon size={30} strokeWidth={1.6} aria-hidden="true" /><h3>{title}</h3><p>{text}</p></div>)}</div>
    </Reveal></div></section>
    <section className="page-width market-section market-contact" aria-label="Talk to Fresh Stop">
      <div><p className="eyebrow text-deep-green">For your business</p><h2 className="mt-3 text-2xl font-black text-forest">Wholesale &amp; Business Orders</h2><p className="mb-5 mt-3 leading-relaxed text-ink-soft">For wholesale orders, bulk purchases and business enquiries, please call or email our team.</p><ContactActions /><Link href="/wholesale" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">Wholesale enquiries<ArrowRight size={16} aria-hidden="true" /></Link></div>
      <div><p className="eyebrow text-deep-green">Let’s get in touch</p><h2 className="mt-3 text-2xl font-black text-forest">Home Delivery Enquiries</h2><p className="mb-5 mt-3 leading-relaxed text-ink-soft">For home delivery enquiries, please email us or send a message on WhatsApp.</p><ContactActions delivery /><Link href="/home-delivery" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest">Home delivery enquiries<ArrowRight size={16} aria-hidden="true" /></Link></div>
    </section>
    <div className="market-note"><div className="page-width"><span><Sun size={17} aria-hidden="true" />Freshness Every Day, Right Around the Corner.</span></div></div>
  </div>;
}
export const metadata: Metadata = { alternates: { canonical: "/" } };
