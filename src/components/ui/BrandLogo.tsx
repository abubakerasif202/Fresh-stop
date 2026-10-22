import Image from "next/image";

export function BrandLogo({ size = 56, priority = false, sizes }: { size?: number; priority?: boolean; sizes?: string }) {
  return (
    <Image
      src="/brand/fresh-stop-primary.webp"
      alt="Fresh Stop"
      width={size}
      height={size}
      priority={priority}
      sizes={sizes ?? `${size}px`}
      className="h-auto max-w-full shrink-0"
    />
  );
}
