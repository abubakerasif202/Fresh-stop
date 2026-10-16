export const CONTACT = {
  phoneDisplay: "+61 423 936 586",
  phoneHref: "tel:+61423936586",
  email: "info@freshstop.com.au",
  wholesaleEmailHref: "mailto:info@freshstop.com.au?subject=Fresh%20Stop%20Wholesale%20Enquiry",
  deliveryEmailHref: "mailto:info@freshstop.com.au?subject=Fresh%20Stop%20Home%20Delivery%20Enquiry",
  whatsappHref: "https://wa.me/61423936586?text=Hello%20Fresh%20Stop%2C%20I%20would%20like%20to%20enquire%20about%20home%20delivery."
} as const;

export function productEnquiryHref(name: string): string {
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent("Fresh Stop Product Enquiry")}&body=${encodeURIComponent(`Hello Fresh Stop, I would like to enquire about ${name}.`)}`;
}
export function productWhatsAppHref(name: string): string {
  return `https://wa.me/61423936586?text=${encodeURIComponent(`Hello Fresh Stop, I would like to enquire about ${name}.`)}`;
}

export function productEnquiryLinks(name: string): { whatsapp: string; email: string } {
  return { whatsapp: productWhatsAppHref(name), email: productEnquiryHref(name) };
}
