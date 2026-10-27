import { SITE_URL } from "./site";

type ReturnBaseEnv = Readonly<Record<string, string | undefined>>;

const PLAIN_HOSTNAME = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i;

/**
 * Origin Stripe sends the customer back to. Preview deployments return to their own URL so a
 * sandbox payment never lands on the live storefront; every other environment keeps the configured site URL.
 */
export function checkoutReturnBase(env: ReturnBaseEnv = process.env): string {
  if (env.VERCEL_ENV === "preview") {
    const host = env.VERCEL_BRANCH_URL || env.VERCEL_URL;
    if (host && PLAIN_HOSTNAME.test(host)) return `https://${host}`;
  }
  return env.NEXT_PUBLIC_SITE_URL || SITE_URL;
}
