import { Mail, MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import "@/styles/catalogue-motion.css";

/** Primary contact buttons; icons wiggle on hover (transform only, off under reduced motion). */
export function ContactActions({ delivery = false }: { delivery?: boolean }) {
  return <div className="flex flex-wrap gap-3">
    <a
      className="button button-red btn-wiggle"
      href={delivery ? CONTACT.whatsappHref : CONTACT.phoneHref}
      {...(delivery ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {delivery ? <MessageCircle size={18} aria-hidden="true" /> : <Phone size={18} aria-hidden="true" />}
      {delivery ? "Message on WhatsApp" : "Call Now"}
      {delivery && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
    <a className="button button-outline btn-wiggle" href={delivery ? CONTACT.deliveryEmailHref : CONTACT.wholesaleEmailHref}><Mail size={18} aria-hidden="true" />Email Us</a>
  </div>;
}
