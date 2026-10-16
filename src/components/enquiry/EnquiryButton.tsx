"use client";

import { useEffect, useReducer, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "@/components/motion";
import { productEnquiryLinks } from "@/lib/contact";
import { EnquirySheet } from "./EnquirySheet";
import { ENQUIRY_ANIMATION_MS, enquiryReducer, enquiryStatusMessage, initialEnquiryState, mascotKindFor } from "./enquiry-state";
import "@/styles/catalogue-motion.css";

export interface EnquiryButtonProps {
  name: string;
  imageUrl: string;
  large?: boolean;
  className?: string;
}

/** "Enquire for Details": opens a sheet with real WhatsApp and email links. Never implies an order. */
export function EnquiryButton({ name, imageUrl, large = false, className = "" }: EnquiryButtonProps) {
  const [state, dispatch] = useReducer(enquiryReducer, initialEnquiryState);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const open = state.phase !== "closed";
  const opening = state.phase === "opening";
  const links = productEnquiryLinks(name);

  useEffect(() => {
    if (!opening) return;
    const timer = window.setTimeout(() => dispatch({ type: "settle" }), ENQUIRY_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [opening, state.runId]);

  function close() {
    dispatch({ type: "close" });
    // Wait for the modal dialog to leave the top layer; focusing while it is open is ignored.
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  }

  const size = large ? "min-h-12 px-7 py-3 text-base" : "min-h-11 w-full justify-between px-4 py-2.5 text-sm";
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => dispatch({ type: "open" })}
        className={`enq-btn inline-flex items-center gap-2 rounded-full bg-forest font-bold text-white hover:bg-forest-deep focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-forest ${size} ${className}`.trim()}
      >
        <span>Enquire for Details<span className="sr-only"> about {name}</span></span>
        <ArrowUpRight className="enq-arrow h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <EnquirySheet
          name={name}
          imageUrl={imageUrl}
          mascot={mascotKindFor(name)}
          runId={state.runId}
          animate={opening && !reducedMotion}
          status={enquiryStatusMessage(state)}
          onChoose={channel => dispatch({ type: "choose", channel })}
          onClose={close}
        />
      )}
      <noscript>
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp us about {name}</a>{" "}
        <a href={links.email}>Email us about {name}</a>
      </noscript>
    </>
  );
}
