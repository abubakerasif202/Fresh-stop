import Image from "next/image";

export function BrandLogo({ size = 56, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/brand/fresh-stop-logo.png"
      alt="Fresh Stop"
      width={size}
      height={size}
      priority={priority}
      className="shrink-0"
    />
  );
}
