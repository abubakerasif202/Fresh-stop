import { ArrowUpRight } from "lucide-react";
import { productEnquiryHref } from "@/lib/contact";

export function EnquireLink({ name, large = false, fill = false }: { name: string; large?: boolean; fill?: boolean }) {
  return <a href={productEnquiryHref(name)} aria-label={`Enquire about ${name} by email`} className={`${fill ? "w-full justify-between " : ""}inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 text-sm font-bold text-white transition-colors hover:bg-forest-deep focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-forest ${large ? "min-h-12 px-6 py-3" : "py-2.5"}`}><span>Enquire</span><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a>;
}
