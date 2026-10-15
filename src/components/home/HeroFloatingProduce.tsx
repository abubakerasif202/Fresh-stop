import Image from "next/image";

export interface HeroProduce {
  name: string;
  imageUrl: string;
}

/** Slots are percent-positioned inside a fixed-aspect stage so the collage scales 320 -> 1920. */
const SLOTS = [
  { pos: "left-[6%] top-[10%] h-[58%] w-[46%]", radius: "58% 42% 52% 48% / 46% 58% 42% 54%", float: "animate-float", ring: "ring-sun", delay: "0ms", sizes: "(max-width: 1024px) 50vw, 28vw" },
  { pos: "right-[2%] top-[0%] h-[40%] w-[36%]", radius: "44% 56% 40% 60% / 56% 44% 56% 44%", float: "animate-float-slow", ring: "ring-citrus", delay: "140ms", sizes: "(max-width: 1024px) 40vw, 20vw" },
  { pos: "right-[10%] bottom-[2%] h-[46%] w-[40%]", radius: "50% 50% 58% 42% / 42% 56% 44% 58%", float: "animate-float", ring: "ring-leaf", delay: "280ms", sizes: "(max-width: 1024px) 40vw, 22vw" }
] as const;

export function HeroFloatingProduce({ produce }: { produce: HeroProduce[] }) {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px] lg:aspect-square lg:max-w-none">
      {/* Layered organic blobs */}
      <svg aria-hidden="true" viewBox="0 0 400 400" className="absolute inset-0 h-full w-full animate-float-slow">
        <path
          d="M300 40c50 30 80 90 60 150s-70 90-130 110-120 10-150-40S10 170 50 110 150 10 210 10s60 10 90 30Z"
          fill="#52B788"
          opacity="0.35"
        />
      </svg>
      <div
        aria-hidden="true"
        className="absolute -left-2 bottom-[6%] h-[26%] w-[26%] bg-citrus animate-float"
        style={{ borderRadius: "62% 38% 46% 54% / 55% 45% 55% 45%" }}
      />
      <div
        aria-hidden="true"
        className="absolute right-[34%] top-[2%] h-[14%] w-[14%] rounded-full bg-sun animate-float-slow"
      />

      {produce.slice(0, SLOTS.length).map((p, i) => {
        const s = SLOTS[i];
        return (
          <div key={p.imageUrl} className={`absolute ${s.pos}`}>
            <div className="h-full w-full animate-rise" style={{ animationDelay: s.delay }}>
              <div className={`relative h-full w-full ${s.float}`}>
                <div
                  className={`relative h-full w-full overflow-hidden bg-cream-deep shadow-lift ring-4 ${s.ring}`}
                  style={{ borderRadius: s.radius }}
                >
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    priority={i === 0}
                    sizes={s.sizes}
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
