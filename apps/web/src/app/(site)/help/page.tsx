import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/design-system/icons/Icon";
import { HelpSearch, type Faq } from "./HelpSearch";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "Answers about booking, payments after inspection, refunds, listing a property, verification and languages on RentMe.",
};

/**
 * Help centre.
 *
 * A searchable FAQ, grouped by topic. The answers are the real rules of the
 * platform written in plain language, not marketing copy, and anything the
 * page cannot answer routes to the contact page.
 */

const FAQS: Faq[] = [
  // ------------------------------------------------------------ booking
  {
    category: "Booking a stay",
    q: "How do I book a stay on RentMe?",
    a: "Search for the city or area you want, open a listing, pick your dates and follow the booking steps. You will see the full price in naira before you confirm anything, and your booking then appears under Bookings in your account.",
  },
  {
    category: "Booking a stay",
    q: "Do I need an account to book?",
    a: "Yes. Bookings, payments, messages and receipts all live in your account, so we need to know who a booking belongs to. Creating an account takes about a minute and is free.",
  },
  {
    category: "Booking a stay",
    q: "Can I talk to the agent before I book?",
    a: "Yes. Every listing has a message option, so you can ask about the area, power supply, water, parking or anything else before you commit. Keep the conversation on RentMe so there is a record if anything goes wrong.",
  },
  {
    category: "Booking a stay",
    q: "Can I request an inspection before paying for a long stay?",
    a: "For longer stays we encourage exactly that. Request an inspection through the listing, view the property in person or on a video call, and only confirm the booking once you are satisfied. Never hand over cash at an inspection; all payment happens on the platform.",
  },

  // ----------------------------------------------------------- payments
  {
    category: "Payments and refunds",
    q: "When is my money released to the agent?",
    a: "Not immediately. Your payment is held securely by RentMe and is only released to the agent after you have checked in, or after you confirm an inspection went as described. If the place is not what was listed, report it straight away and the payment stays held while we look into it.",
  },
  {
    category: "Payments and refunds",
    q: "What payment methods can I use?",
    a: "You can pay in naira with Nigerian debit cards or by bank transfer, and from your RentMe wallet. Prices are always shown in naira with no hidden conversion.",
  },
  {
    category: "Payments and refunds",
    q: "Is it safe to pay through RentMe?",
    a: "Payments run through licensed Nigerian payment processors and we never store your full card details. Because money is held until after check-in or inspection, paying on the platform protects you in a way that cash or a direct transfer to a stranger cannot.",
  },
  {
    category: "Payments and refunds",
    q: "How do refunds work?",
    a: "If you cancel within the listing's cancellation window, or a booking falls through because the property was misrepresented or unavailable, you get a refund. It goes back the way you paid, or to your RentMe wallet if you prefer that for speed.",
  },
  {
    category: "Payments and refunds",
    q: "How long does a refund take to arrive?",
    a: "Wallet refunds are quickest, usually within one business day. Refunds to a card or bank account typically take three to ten business days depending on your bank. If a refund seems stuck, contact support with your booking reference.",
  },

  // ------------------------------------------------------------ listing
  {
    category: "Listing your property",
    q: "How do I list my property on RentMe?",
    a: "Apply through the Become an agent page. The application has six short steps: personal details, identity verification, business type, documents, payout account and review. Your progress saves as you go, and once approved you can publish listings from the agent dashboard.",
  },
  {
    category: "Listing your property",
    q: "Does it cost anything to list?",
    a: "No. Listing is free. RentMe takes a small commission only when a booking completes, so we earn nothing unless you do.",
  },
  {
    category: "Listing your property",
    q: "When do agents get paid?",
    a: "After each completed stay, your earnings are paid to the Nigerian bank account you added during your application. You can follow every payout from the earnings page in your agent dashboard.",
  },

  // ------------------------------------------------------- verification
  {
    category: "Verification and trust",
    q: "What does the verified badge on a listing mean?",
    a: "It means the agent behind the listing passed identity verification with a government issued ID or NIN, and the listing details were checked before going live. Listings that fail our checks do not appear on RentMe at all.",
  },
  {
    category: "Verification and trust",
    q: "How are agents verified?",
    a: "Every agent verifies their identity with their NIN or a government issued ID. Agents operating as a business also upload their business registration documents. Applications are reviewed by a person, not just a script.",
  },
  {
    category: "Verification and trust",
    q: "How do I report a suspicious listing or user?",
    a: "Use the report option on the listing, or email support@naijafinds.com with the listing link and what you saw. Reports are reviewed quickly, and listings under investigation can be hidden while we check.",
  },

  // ---------------------------------------------------------- languages
  {
    category: "Languages and accessibility",
    q: "Which languages does RentMe work in?",
    a: "English, Yoruba, Hausa and Igbo. You can switch language at any time from the switcher in the header, and your choice is remembered on your device.",
  },
  {
    category: "Languages and accessibility",
    q: "Can I get support in my own language?",
    a: "Yes. Write to support in English, Yoruba, Hausa or Igbo and you will get a reply in the language you used.",
  },
];

export default function HelpPage() {
  return (
    <div className="nf-shell py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <Icon name="help" fill />
            </span>
            Help centre
          </span>
          <h1 className="nf-h1 mx-auto mt-5 max-w-[16ch]">How can we help?</h1>
          <p className="mx-auto mt-4 max-w-[50ch] text-[var(--nf-content-secondary)]">
            Straight answers about booking, payments, refunds, listing and
            verification. Search below, or browse by topic.
          </p>
        </div>

        {/* --------------------------------------------- searchable list */}
        <div className="nf-rise mt-10" style={{ animationDelay: "100ms" }}>
          <HelpSearch faqs={FAQS} />
        </div>

        {/* ------------------------------------------------ still stuck */}
        <div className="nf-card mt-14 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-grid h-10 w-10 shrink-0 place-items-center">
              <Icon name="chat" fill />
            </span>
            <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
              Still stuck? A person replies within one business day.
            </p>
          </div>
          <Link href="/contact" className="nf-btn nf-btn--primary shrink-0">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
