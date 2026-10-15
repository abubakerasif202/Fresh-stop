import { Plus } from "lucide-react";
import { FREE_DELIVERY_THRESHOLD, MIN_ORDER_AMOUNT, STANDARD_DELIVERY_FEE } from "@/lib/delivery";
import { Reveal } from "@/components/ui/Reveal";

const QUESTIONS = [
  { question: "Can I collect my order?", answer: "Yes. Choose Click & Collect at checkout, select Rockdale or Riverwood and pick an available collection timeslot." },
  { question: "How much is home delivery?", answer: `Home delivery is $${STANDARD_DELIVERY_FEE.toFixed(2)} for eligible postcodes, with a $${MIN_ORDER_AMOUNT.toFixed(0)} minimum order. Delivery is free when your basket reaches $${FREE_DELIVERY_THRESHOLD.toFixed(0)}.` },
  { question: "Which store will deliver my order?", answer: "Eligible St George and Bayside postcodes are served by Rockdale. Eligible Canterbury-Bankstown postcodes are served by Riverwood. Check your postcode to confirm the store for your address." },
  { question: "Can I shop without creating an account?", answer: "Yes. Use guest checkout and enter your contact details so the store can prepare your order. For delivery, you will also need to enter your delivery address." },
];

export function ShoppingQuestions() {
  return (
    <section id="shopping-questions" aria-labelledby="questions-heading" className="bg-peach py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-berry-deep">A little help before you shop</p>
          <h2 id="questions-heading" className="mt-4 font-display text-4xl font-black leading-none tracking-tight sm:text-5xl">Good questions.<br /><span className="text-forest">Fresh answers.</span></h2>
          <p className="mt-5 max-w-sm leading-relaxed text-ink-soft">From your first pick to your front door, here is how shopping with Fresh Stop works.</p>
        </Reveal>
        <Reveal className="divide-y divide-ink/15 border-y border-ink/15">
          {QUESTIONS.map(({ question, answer }) => (
            <details key={question} className="faq-item group py-1">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-extrabold">
                {question}<Plus aria-hidden="true" className="faq-icon h-5 w-5 shrink-0 text-forest transition-transform duration-200" />
              </summary>
              <p className="faq-answer max-w-2xl pb-5 pr-6 text-sm leading-relaxed text-ink-soft">{answer}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
