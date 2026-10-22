import { STOREFRONT_DEMO } from "@/lib/indicative-pricing";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "How to enquire about Fresh Stop products, prices, wholesale requirements, delivery and store visits.",
  alternates: { canonical: "/faq" }
};

const questions = [
  ["How do I enquire about a product?", STOREFRONT_DEMO ? "Open a product in the catalogue and choose Enquire. You can send its name to our team through email or WhatsApp." : "Choose Add to Cart to order online, or contact us by email or WhatsApp with product questions."],
  ["Can I pay or place an order on this website?", STOREFRONT_DEMO ? "This website is a catalogue for enquiries. It does not take online payments or confirm orders. Please discuss any purchase directly with our team." : "Yes. Add products to your cart, choose delivery or pickup, then pay on Stripe’s secure checkout page. Orders may include items sourced after purchase; we will contact you if this affects fulfilment."],
  ["Where can I confirm prices and availability?", STOREFRONT_DEMO ? "Contact our team for current pricing, selling units, packaging and availability before arranging a purchase." : "Selling prices and units are shown in the catalogue. Delivery fees and your final total are shown before you pay. Contact us with questions about packaging or fulfilment."],
  ["How do I ask about home delivery?", STOREFRONT_DEMO ? "Email or message us on WhatsApp with the products you are interested in and your suburb. Confirm delivery coverage, fees and timing directly with our team." : "Enter your postcode at checkout to see delivery coverage, fees and minimum orders. You can also choose pickup, or contact us about other areas."],
  ["Do you handle wholesale enquiries?", "Yes. Please call or email our team with product names and approximate quantities to discuss wholesale and business requirements."],
  ["Do the images show the exact product?", "AI-generated product images are illustrative. Packaging and appearance may vary. Some products have a placeholder while a verified image is unavailable; please confirm product details with our team."],
  ["Where are your stores?", "Our stores page lists the existing Rockdale and Riverwood store details and directions. Contact the store to confirm details before travelling."]
];

export default function FaqPage() {
  return <div className="page-width py-12 sm:py-20">
    <p className="eyebrow text-deep-green">Good to know</p>
    <h1 className="section-title mt-4">Common questions</h1>
    <div className="mt-9 max-w-3xl space-y-4">{questions.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-forest/10 bg-white p-5 sm:p-6"><summary className="min-h-11 cursor-pointer text-lg font-extrabold text-forest">{question}</summary><p className="mt-3 leading-relaxed text-ink-soft">{answer}</p></details>)}</div>
    <p className="mt-8"><Link href="/contact" className="button button-green">Contact our team</Link></p>
  </div>;
}
