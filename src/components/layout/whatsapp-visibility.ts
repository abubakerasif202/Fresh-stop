/** Routes whose full-width primary actions scroll under the floating button; WhatsApp stays in the footer and contact pages. */
const HIDDEN_PREFIXES = ["/cart", "/checkout"] as const;

export function shouldShowFloatingWhatsApp(pathname: string | null): boolean {
  if (!pathname) return true;
  return !HIDDEN_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
