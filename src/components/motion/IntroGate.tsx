"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { shouldShowIntro } from "./intro-logic";

/** The intro chunk is only fetched when the gate decides to show it (home route, first visit, motion OK). */
const IntroSequence = dynamic(() => import("./IntroSequence"), { ssr: false });

/** Tiny always-mounted wrapper for the root layout. Renders nothing unless the intro should play. */
export function IntroGate() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = undefined;
    }
    // Decide once on first mount: later client navigations to "/" within the session must not replay it.
    setShow(shouldShowIntro({ pathname, storage, matchMedia: window.matchMedia?.bind(window) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return show ? <IntroSequence onDone={() => setShow(false)} /> : null;
}
