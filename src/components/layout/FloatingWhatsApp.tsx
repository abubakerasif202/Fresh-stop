"use client";

import { usePathname } from "next/navigation";
import { WhatsAppContact } from "./WhatsAppContact";
import { shouldShowFloatingWhatsApp } from "./whatsapp-visibility";

/** Mounted once in the root layout; renders the floating button except on cart and checkout routes. */
export function FloatingWhatsApp() {
  return shouldShowFloatingWhatsApp(usePathname()) ? <WhatsAppContact /> : null;
}
