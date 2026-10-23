import Image from "next/image";

export function BrandLogo({ size = 56, priority = false, eager = false, sizes }: { size?: number; priority?: boolean; eager?: boolean; sizes?: string }) {
  return (
    <Image
      src="/brand/fresh-stop-primary.webp"
      alt="Fresh Stop"
      width={size}
      height={size}
      priority={priority}
      loading={eager ? "eager" : undefined}
      sizes={sizes ?? `${size}px`}
      className="h-auto max-w-full shrink-0"
    />
  );
}
