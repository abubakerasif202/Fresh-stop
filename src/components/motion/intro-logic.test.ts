import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INTRO_STORAGE_KEY,
  hasSeenIntro,
  markIntroSeen,
  prefersReducedMotion,
  shouldShowIntro,
  type StorageLike
} from "./intro-logic";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    }
  };
}
const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  }
};
const mm = (matches: boolean) => () => ({ matches });

describe("prefersReducedMotion", () => {
  it("is false without matchMedia", () => assert.equal(prefersReducedMotion(undefined), false));
  it("reflects the media query", () => {
    assert.equal(prefersReducedMotion(mm(true)), true);
    assert.equal(prefersReducedMotion(mm(false)), false);
  });
  it("is false when matchMedia throws", () => {
    assert.equal(prefersReducedMotion(() => { throw new Error("x"); }), false);
  });
});

describe("intro session flag", () => {
  it("round-trips through storage", () => {
    const s = memoryStorage();
    assert.equal(hasSeenIntro(s), false);
    markIntroSeen(s);
    assert.equal(s.data[INTRO_STORAGE_KEY], "1");
    assert.equal(hasSeenIntro(s), true);
  });
  it("never throws when storage is blocked", () => {
    assert.equal(hasSeenIntro(throwingStorage), false);
    assert.doesNotThrow(() => markIntroSeen(throwingStorage));
  });
});

describe("shouldShowIntro", () => {
  it("shows on first visit to /", () => {
    assert.equal(shouldShowIntro({ pathname: "/", storage: memoryStorage(), matchMedia: mm(false) }), true);
  });
  it("does not show on other routes", () => {
    assert.equal(shouldShowIntro({ pathname: "/products", storage: memoryStorage(), matchMedia: mm(false) }), false);
    assert.equal(shouldShowIntro({ pathname: null }), false);
  });
  it("does not repeat in the same session", () => {
    const s = memoryStorage({ [INTRO_STORAGE_KEY]: "1" });
    assert.equal(shouldShowIntro({ pathname: "/", storage: s, matchMedia: mm(false) }), false);
  });
  it("is skipped for reduced motion", () => {
    assert.equal(shouldShowIntro({ pathname: "/", storage: memoryStorage(), matchMedia: mm(true) }), false);
  });
  it("still shows when storage is blocked", () => {
    assert.equal(shouldShowIntro({ pathname: "/", storage: throwingStorage, matchMedia: mm(false) }), true);
  });
});
