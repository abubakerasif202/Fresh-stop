import { MessageCircle } from "lucide-react";
import { CONTACT } from "@/lib/contact";

export function WhatsAppContact() {
  return <a href={CONTACT.whatsappHref} className="fixed bottom-5 right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border-2 border-white bg-forest px-4 py-3 font-extrabold text-white shadow-lift transition-transform hover:-translate-y-1 motion-reduce:transform-none sm:right-6" aria-label="Let’s talk: message Fresh Stop on WhatsApp about home delivery"><MessageCircle size={23} aria-hidden="true" /><span className="hidden text-sm sm:inline">Let’s talk</span></a>;
}
