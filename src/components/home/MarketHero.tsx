import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Sprout } from "lucide-react";

/** An imagined market scene, explicitly labelled until genuine shop photography is supplied. */
export function MarketHero({ mapsUrl }: { mapsUrl?: string }) {
  return (
    <section className="market-hero" aria-labelledby="market-heading">
      <div className="market-hero-scene">
        <Image
          src="/images/market-scene-illustration.webp"
          alt="Artist’s impression of a green-fronted fruit market with an open entrance, sunlit leaves and wooden crates of tomatoes, carrots, bananas, oranges, strawberries, broccoli and capsicums."
          fill priority fetchPriority="high" quality={85}
          sizes="100vw"
          className="market-hero-image"
        />
      </div>
      <div className="page-width market-hero-content">
        <div className="market-hero-copy">
          <p className="market-eyebrow"><Sprout size={17} aria-hidden="true" /> Your neighbourhood fresh food stop</p>
          <h1 id="market-heading">FRESH <span>STOP</span></h1>
          <p className="market-hero-subtitle">Fresh Fruits <span>•</span> Vegetables <span>•</span> Groceries</p>
          <p className="market-hero-message">Freshness Every Day,<br className="hidden lg:block" /> Right Around the Corner.</p>
          <div className="market-hero-actions">
            {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="button button-green"><MapPin size={18} aria-hidden="true" />Find Us on Google Maps<span className="sr-only"> (opens in a new tab)</span></a> : <Link href="/stores" className="button button-green"><MapPin size={18} aria-hidden="true" />Find your Fresh Stop</Link>}
            <Link href="/products" className="button market-explore">Explore Our Products<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className="market-hero-locations"><MapPin size={15} aria-hidden="true" /> Rockdale &amp; Riverwood, Sydney</p>
        </div>
      </div>
      <p className="market-scene-caption">Market illustration inspired by our Fresh Stop poster. Store appearance may differ.</p>
    </section>
  );
}
