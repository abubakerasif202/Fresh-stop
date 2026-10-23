import { MessageCircle } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import "@/styles/catalogue-motion.css";

export function WhatsAppContact() {
  return <a href={CONTACT.whatsappHref} className="wa-fab fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 flex h-12 w-12 items-center justify-center gap-2 rounded-full border-2 border-white bg-forest font-extrabold min-[1600px]:w-auto min-[1600px]:px-4 text-white shadow-lift transition-transform hover:-translate-y-1 motion-reduce:transform-none" aria-label="Let’s talk: message Fresh Stop on WhatsApp about home delivery"><MessageCircle size={23} aria-hidden="true" /><span className="hidden text-sm min-[1600px]:inline">Let’s talk</span></a>;
}
