/** Pure helpers for the first-visit intro and reduced-motion detection (injectable for tests). */
export const INTRO_STORAGE_KEY = "fs-intro-seen";
export const INTRO_AUTO_COMPLETE_MS = 3000;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type MatchMediaLike = (query: string) => { matches: boolean };

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the user prefers reduced motion. Safe when matchMedia is missing or throws. */
export function prefersReducedMotion(matchMedia?: MatchMediaLike): boolean {
  if (!matchMedia) return false;
  try {
    return matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/** True if the intro was already shown this session. Storage failures count as "not seen" only once. */
export function hasSeenIntro(storage?: StorageLike): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(storage?: StorageLike): void {
  if (!storage) return;
  try {
    storage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {
    /* storage unavailable (private mode); intro may repeat, which is harmless */
  }
}

export interface IntroDecisionInput {
  pathname: string | null;
  storage?: StorageLike;
  matchMedia?: MatchMediaLike;
}

/** Intro shows only on the home route, once per session, and never with reduced motion. */
export function shouldShowIntro({ pathname, storage, matchMedia }: IntroDecisionInput): boolean {
  if (pathname !== "/") return false;
  if (prefersReducedMotion(matchMedia)) return false;
  return !hasSeenIntro(storage);
}
