import type { ReactNode } from "react";
import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import "@/styles/catalogue-motion.css";

interface CardSpec { key: string; label: string; value: string; href: string; icon: ReactNode; external?: boolean; className?: string }

const ICON = 24;

/** Contact options per audience. Values come straight from CONTACT; nothing is invented. */
export function contactCardSpecs(kind: "wholesale" | "delivery"): CardSpec[] {
  const email: CardSpec = {
    key: "email", label: "Email", value: CONTACT.email, icon: <Mail size={ICON} aria-hidden="true" />,
    href: kind === "wholesale" ? CONTACT.wholesaleEmailHref : CONTACT.deliveryEmailHref
  };
  if (kind === "wholesale") {
    return [{ key: "phone", label: "Call", value: CONTACT.phoneDisplay, icon: <Phone size={ICON} aria-hidden="true" />, href: CONTACT.phoneHref }, email];
  }
  return [{ key: "whatsapp", label: "WhatsApp", value: CONTACT.phoneDisplay, icon: <MessageCircle size={ICON} aria-hidden="true" />, href: CONTACT.whatsappHref, external: true, className: "cc-wa" }, email];
}

/** Animated contact cards: lift on hover, icon wobble, arrow nudge. Rise-in is scroll-driven where supported. */
export function ContactCards({ kind, className = "", stacked = false }: { kind: "wholesale" | "delivery"; className?: string; stacked?: boolean }) {
  return (
    <ul className={`grid gap-3 ${stacked ? "" : "sm:grid-cols-2"} ${className}`.trim()}>
      {contactCardSpecs(kind).map(c => (
        <li key={c.key} className="sd-rise">
          <a
            href={c.href}
            {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`cc ${c.className ?? ""} focus-visible:outline-3 focus-visible:outline-offset-3`.trim()}
          >
            <span className="cc-icon">{c.icon}</span>
            <span className="min-w-0"><span className="cc-label">{c.label}</span><span className="cc-value">{c.value}</span>{c.external && <span className="sr-only"> (opens in a new tab)</span>}</span>
            <ArrowUpRight className="cc-arrow" size={20} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
