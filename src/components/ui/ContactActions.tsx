import { Mail, MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/lib/contact";

export function ContactActions({ delivery = false }: { delivery?: boolean }) {
  return <div className="flex flex-wrap gap-3">
    <a className="button button-red" href={delivery ? CONTACT.whatsappHref : CONTACT.phoneHref}>
      {delivery ? <MessageCircle size={18} aria-hidden="true" /> : <Phone size={18} aria-hidden="true" />}
      {delivery ? "Message on WhatsApp" : "Call Now"}
    </a>
    <a className="button button-outline" href={delivery ? CONTACT.deliveryEmailHref : CONTACT.wholesaleEmailHref}><Mail size={18} aria-hidden="true" />Email Us</a>
  </div>;
}
