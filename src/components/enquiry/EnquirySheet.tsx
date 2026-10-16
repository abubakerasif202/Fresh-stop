"use client";

import { useEffect, useId, useRef, type MouseEvent } from "react";
import Image from "next/image";
import { Mail, MessageCircle, X } from "lucide-react";
import { productEnquiryLinks } from "@/lib/contact";
import type { MascotKind } from "@/components/motion";
import { EnquiryEffects } from "./EnquiryEffects";
import { ENQUIRY_GUIDANCE, type EnquiryChannel } from "./enquiry-state";
import "@/styles/catalogue-motion.css";

interface EnquirySheetProps {
  name: string;
  imageUrl: string;
  mascot: MascotKind;
  runId: number;
  /** Decorative animation is mounted only when true (never under prefers-reduced-motion). */
  animate: boolean;
  status: string;
  onChoose: (channel: EnquiryChannel) => void;
  onClose: () => void;
}

/** Modal dialog with two real links. The links are never intercepted; the animation runs alongside the navigation. */
export function EnquirySheet({ name, imageUrl, mascot, runId, animate, status, onChoose, onClose }: EnquirySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const waRef = useRef<HTMLAnchorElement>(null);
  const mailRef = useRef<HTMLAnchorElement>(null);
  const titleId = useId();
  const links = productEnquiryLinks(name);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  /** Aims the bubble at the chosen option; measures only, never blocks the click. */
  function aim(channel: EnquiryChannel) {
    const stage = stageRef.current;
    const stageBox = stage?.getBoundingClientRect();
    const targetBox = (channel === "email" ? mailRef : waRef).current?.getBoundingClientRect();
    if (stage && stageBox && targetBox) {
      stage.style.setProperty("--fx", `${Math.round(targetBox.left + 26 - (stageBox.left + stageBox.width / 2))}px`);
      stage.style.setProperty("--fy", `${Math.round(targetBox.top + targetBox.height / 2 - (stageBox.bottom - 24))}px`);
    }
    onChoose(channel);
  }

  function onBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog ref={dialogRef} className="enq-sheet" aria-labelledby={titleId} onClose={onClose} onClick={onBackdrop}>
      <div className="enq-panel">
        <span ref={stageRef} className="enq-stage" aria-hidden="true" data-run={animate ? runId : undefined}>
          <span className="enq-thumb"><Image src={imageUrl} alt="" fill sizes="96px" className="object-cover" /></span>
          {animate && <EnquiryEffects key={runId} mascot={mascot} />}
        </span>
        <h2 id={titleId} className="mt-2 text-center font-display text-xl font-black leading-tight text-forest">Enquire about {name}</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-ink/75">{ENQUIRY_GUIDANCE}</p>
        <div className="enq-actions">
          <a ref={waRef} href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="enq-link enq-link-wa" onClick={() => aim("whatsapp")}>
            <MessageCircle size={20} aria-hidden="true" />WhatsApp<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a ref={mailRef} href={links.email} className="enq-link enq-link-mail" onClick={() => aim("email")}>
            <Mail size={20} aria-hidden="true" />Email
          </a>
        </div>
        <p role="status" aria-live="polite" className="enq-status">{status}</p>
        <button type="button" className="enq-close" aria-label="Close enquiry options" onClick={onClose}><X size={22} aria-hidden="true" /></button>
      </div>
    </dialog>
  );
}
