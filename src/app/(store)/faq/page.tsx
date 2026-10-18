import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "How to enquire about Fresh Stop products, prices, wholesale requirements, delivery and store visits.",
  alternates: { canonical: "/faq" }
};

const questions = [
  ["How do I enquire about a product?", "Open a product in the catalogue and choose Enquire. You can send its name to our team through email or WhatsApp."],
  ["Can I pay or place an order on this website?", "This website is a catalogue for enquiries. It does not take online payments or confirm orders. Please discuss any purchase directly with our team."],
  ["Where can I confirm prices and availability?", "Contact our team for current pricing, selling units, packaging and availability before arranging a purchase."],
  ["How do I ask about home delivery?", "Email or message us on WhatsApp with the products you are interested in and your suburb. Confirm delivery coverage, fees and timing directly with our team."],
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
