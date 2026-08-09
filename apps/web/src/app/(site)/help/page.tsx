import { SUPPORT_SENTENCE } from "@/lib/support-email";
import type { Metadata } from "next";
import Link from "next/link";
import { SupportChat } from "@/components/app/account/SupportChat";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { HelpSearch, type Faq } from "./HelpSearch";
import { ButtonLink } from "@/components/ui/Button";

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

/**
 * The three trust surfaces, reachable from the page people already come to
 * when something has gone wrong. They are also the answer to the question the
 * FAQ format cannot carry, because an FAQ answer is plain text and cannot hold
 * a link.
 */
const TRUST_LINKS: { href: string; icon: BrandIconName; title: string; body: string }[] = [
  {
    href: "/safety",
    icon: "shield-check",
    title: "Safety centre",
    body: "How paying works, how inspections work, and what we will never ask you for.",
  },
  {
    href: "/standards",
    icon: "shield-home",
    title: "Trust and safety",
    body: "What is not allowed, how we enforce it, and how quickly we answer a report.",
  },
  {
    href: "/cancellations",
    icon: "calendar-clock",
    title: "Cancellations",
    body: "One refund schedule for every stay, with the windows written out.",
  },
];

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
    q: "Do I pay the agent directly?",
    a: "Never. You pay on RentMe, through the checkout screen, using a card, a bank transfer raised by the payment processor, or your RentMe wallet. Nobody on this platform has any reason to send you an account number, and if somebody does, report them. Settlement to the agent is between RentMe and the agent, and it is not something you arrange or hand over.",
  },
  {
    category: "Payments and refunds",
    q: "What payment methods can I use?",
    a: "You can pay in naira with Nigerian debit cards or by bank transfer, and from your RentMe wallet. Prices are always shown in naira with no hidden conversion.",
  },
  {
    category: "Payments and refunds",
    q: "Is it safe to pay through RentMe?",
    a: "Payments run through licensed Nigerian payment processors and we never store your full card details. Every payment leaves a reference against your booking that both you and our support team can open, which is what makes a dispute solvable. Cash at a viewing, or a transfer to a stranger's account, leaves us nothing to work from.",
  },
  {
    category: "Payments and refunds",
    q: "How do refunds work?",
    a: "One schedule applies to every stay on RentMe. Cancel more than 72 hours before check-in and you get everything back; inside that window you get half; once check-in day has started the stay is the host's. If the host cancels, or the property was not what was listed, you get everything back whenever it happens. Refunds land in your RentMe wallet, and you move them to your bank from there.",
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
    a: "No. Listing is free, and it stays free. RentMe charges no fees at all: not to list, not to book, and nothing is taken out of what a guest pays you.",
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
    /* This answer printed the fifteen characters {SUPPORT_EMAIL} to every
       reader, because an earlier pass turned a template literal into a plain
       string and nothing renders a placeholder as an error. */
    a: `Use the report option on the listing, or ${SUPPORT_SENTENCE} with the listing link and what you saw. Reports are reviewed quickly, and listings under investigation can be hidden while we check.`,
  },

  // --------------------------------------------------- safety and money
  {
    category: "Verification and trust",
    q: "Does RentMe charge any fees?",
    a: "No. RentMe charges no fees. Not to book, not to list, not to be paid. The total you see before you confirm a stay is the host's nightly rate and cleaning charge and nothing else. Anyone presenting an inspection fee, a holding fee, an agency fee or a caution fee as ours is lying, and you should report them.",
  },
  {
    category: "Verification and trust",
    q: "Someone asked me to pay into a bank account. What do I do?",
    a: "Stop, and report them. No RentMe staff member, agent or listing will ever give you an account number to pay into: every payment happens inside the platform. Use the report control on the listing, or the contact form, and include the account number and the messages. Reports about off-platform payment are answered within four hours.",
  },
  {
    category: "Verification and trust",
    q: "What if I have already sent money outside the platform?",
    a: "Call your bank first and ask them to raise a dispute on the transfer, because a fast report is sometimes enough for them to place a lien on the receiving account. Then report it to us with the listing link, the account details and the messages. We cannot recover money that never came through RentMe, but we can remove the account and stop the same person reaching anybody else.",
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
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="support-chat" fill />
            </span>
            Help centre
          </span>
          <h1 className="nf-h1 mx-auto mt-heading max-w-[16ch]">How can we help?</h1>
          <p className="mx-auto mt-group max-w-[50ch] text-[var(--nf-content-secondary)]">
            Straight answers about booking, payments, refunds, listing and
            verification. Search below, or browse by topic.
          </p>
        </div>

        {/* ------------------------------------------------ trust surfaces */}
        <nav
          aria-label="Safety and policy"
          className="nf-rise mt-block grid gap-row sm:grid-cols-3"
          style={{ animationDelay: "60ms" }}
        >
          {TRUST_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nf-card nf-card--interactive p-card-sm">
              <span className="inline-grid h-9 w-9 place-items-center">
                <BrandIcon name={link.icon} fill />
              </span>
              <span className="mt-inline block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                {link.title}
              </span>
              <span className="mt-inline-tight block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {link.body}
              </span>
            </Link>
          ))}
        </nav>

        {/* --------------------------------------------- searchable list */}
        <div className="nf-rise mt-block" style={{ animationDelay: "100ms" }}>
          <HelpSearch faqs={FAQS} />
        </div>

        {/* ------------------------------------------- ask the agent */}
        <div className="nf-rise mt-block" style={{ animationDelay: "160ms" }}>
          <SupportChat />
        </div>

        {/* ------------------------------------------------ still stuck */}
        <div className="nf-card mt-section-tight flex flex-col items-start gap-group p-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-group">
            <span className="inline-grid h-13 w-13 shrink-0 place-items-center">
              <BrandIcon name="chat" fill />
            </span>
            <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
              Still stuck? A person replies within one business day.
            </p>
          </div>
          <ButtonLink href="/contact" variant="primary" className="shrink-0">
            Contact support
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
