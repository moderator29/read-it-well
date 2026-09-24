import { SUPPORT_SENTENCE } from "@/lib/support-email";
import type { Metadata } from "next";
import { SiteHead } from "@/components/site/SiteHead";
import Link from "next/link";
import { SupportChat } from "@/components/app/account/SupportChat";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { HelpSearch, type Faq } from "./HelpSearch";
import { ButtonLink } from "@/components/ui/Button";
import { doorsSentence } from "@/lib/supply/roles";
import { AGENT_PAYOUT_ANSWER, WALLET_MONEY_USES } from "@/lib/wallet/bank-payouts";

export const metadata: Metadata = {
  title: "Help centre",
  description:
    "Answers about both sides of Vallo: the switch between Property and Stays, booking a stay, holding a table, payments after inspection, refunds, listing, verification and languages.",
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
    body: "One refund schedule for every paid stay, with the windows written out.",
  },
];

const FAQS: Faq[] = [
  /*
   * WHAT VALLO IS FOR COMES FIRST, added 22 September when the platform's
   * position changed. A help centre that explains every control and never
   * says what the thing is for leaves the commonest question on the page
   * unanswered, and this one is the question the founder's own co-founder
   * asked: what does Vallo actually help me do.
   *
   * The answer states the position and nothing beyond it. It does NOT say a
   * person can buy or rent direct from an owner today, because there is no
   * owner listing in the catalogue yet; it says what happens where there is
   * one, which is true now and stays true then.
   */
  {
    category: "Property and Stays",
    q: "What is Vallo actually for?",
    a: "Vallo does not remove the agent. Vallo removes the runaround. The runaround is the part everybody in Nigeria recognises: agent fees stacked on agent fees, a chain of agents on one property, the same flat listed four times at four prices, and a total cost nobody will state until you have spent a Saturday in traffic. Agents hold most of the property offered in this market and their fee is theirs to charge. What Vallo is for is that you know who you are dealing with, what you will actually pay and whether the property is real, before you call anybody. Where an owner lists a property directly, you deal with the owner; where an agent lists it, you deal with the agent, and either way the costs are written down on the listing.",
  },
  /*
   * THE TWO SIDES COME NEXT, because until the content truth sweep of 19
   * September this page answered as though Vallo sold property and nothing
   * else, and the three questions a person actually arrives with on a
   * two-sided product were nowhere on it: what the switch is, how paying for
   * a stay differs from paying for a tenancy, and what Verified means when a
   * row can also say Third party.
   */
  {
    category: "Property and Stays",
    q: "What are the two sides, and what does switching do?",
    a: "Vallo is one app with two faces. The Property side is renting, buying and selling: listings, agents, inspections and Bookings, priced as a sale price or a yearly rent. Vallo Stays is the nightly side: hotels, apartments, guest houses, resorts, serviced apartments, shortlets and restaurant tables, priced per night against your dates. The switch sits at the foot of the side menu. Flipping it changes the vocabulary and the bottom bar and nothing else: same account, same profile, same wallet and balance, same inbox, same saved places. Bookings is the Property side's word for what is coming up and Trips is the Stays side's word for it.",
  },
  {
    category: "Property and Stays",
    q: "How is paying for a stay different from paying for a tenancy?",
    a: "A stay is paid on Vallo before you arrive. You pick your dates, reserve, and the nights are held free for 48 hours while you decide; the breakdown shows the nightly rate, the nights and anything the host charges, added up, and you pay by card or from your wallet. A tenancy is the other way round: you message the agent, you inspect the property in person, and only then do you pay, with the whole move-in total printed before you commit. There is no reserve button on a yearly rental for that reason. Both are paid inside Vallo and both leave a reference you can open later.",
  },
  {
    category: "Property and Stays",
    q: "Does my wallet work on both sides?",
    a: `Yes. There is one naira wallet on one account. Top it up by card or bank transfer and pay for a tenancy, a sale deposit or a hotel room from the same balance. Refunds land back in the same wallet whichever side they came from. ${WALLET_MONEY_USES}`,
  },
  {
    category: "Property and Stays",
    q: "Do I have to pay for a restaurant table?",
    a: "No. A table is a request, not a booking: you ask for a date, a time and a party size, and the restaurant confirms it or turns it down. No money moves on Vallo for a reservation and you pay the restaurant when you eat. Every reservation opens its own conversation, so running late is a message rather than a phone call. Cancel it at any hour, for nothing.",
  },
  {
    category: "Property and Stays",
    q: "What does Verified mean, and what does Third party mean?",
    a: "They answer two different questions and they never overlap. Verified is about a person: somebody at Vallo checked the identification of the agent or host behind the listing before it went live, and higher levels mean we have also checked their address, their payout account, or met them. Third party is about fulfilment: it marks a stay that a partner confirms and delivers rather than us, and it names that partner. A row carrying the Third party tag is never dressed as first party and never wears the verified tick. No partner inventory is live today; the label exists so that the first one cannot arrive unlabelled.",
  },

  // ------------------------------------------------------------ booking
  {
    category: "Booking a stay",
    q: "How do I book a stay on Vallo?",
    a: "Open Stays, type where you are going and set your check-in, your check-out and how many of you there are. Every price on the results page then becomes the total for those nights rather than a rate. Open one, reserve, and the nights are held for 48 hours for nothing while you decide. Pay by card or from your wallet and the stay appears under Trips on the Stays side, or Bookings on the Property side, with its reference.",
  },
  {
    category: "Booking a stay",
    q: "How do I hold a table at a restaurant?",
    a: "Open Restaurants, open the one you want, and ask for a date, a time and a party size. The time is read as Lagos time whatever your phone is set to. The restaurant confirms it or turns it down and you are told either way, the reservation opens its own conversation, and it sits with your stays on Trips at its hour.",
  },
  {
    category: "Booking a stay",
    q: "Do I need an account to book?",
    a: "Yes. Bookings, payments, messages and receipts all live in your account, so we need to know who a booking belongs to. Creating an account takes about a minute and is free.",
  },
  {
    category: "Booking a stay",
    q: "Can I talk to the agent before I book?",
    a: "Yes. Every listing has a message option, so you can ask about the area, power supply, water, parking or anything else before you commit. Keep the conversation on Vallo so there is a record if anything goes wrong.",
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
    a: "Never. You pay on Vallo, through the checkout screen, using a card, a bank transfer raised by the payment processor, or your Vallo wallet. Nobody on this platform has any reason to send you an account number, and if somebody does, report them. How the agent is paid is handled on the platform, and it is never something you arrange by transfer.",
  },
  {
    category: "Payments and refunds",
    q: "What payment methods can I use?",
    a: "You can pay in naira with Nigerian debit cards or by bank transfer, and from your Vallo wallet. The same three work on both sides of the product, for a night or for a year. Prices are always shown in naira with no hidden conversion.",
  },
  {
    category: "Payments and refunds",
    q: "Is it safe to pay through Vallo?",
    a: "Payments run through licensed Nigerian payment processors and we never store your full card details. Every payment leaves a reference against your booking that both you and our support team can open, which is what makes a dispute solvable. Cash at an inspection, or a transfer to a stranger's account, leaves us nothing to work from.",
  },
  {
    category: "Payments and refunds",
    q: "How do refunds work?",
    a: `One schedule applies to every stay on Vallo. Cancel more than 72 hours before check-in and you get everything back; inside that window you get half; once check-in day has started the stay is the agent's. If the agent cancels, or the property was not what was listed, you get everything back whenever it happens. Refunds land in your Vallo wallet. ${WALLET_MONEY_USES}`,
  },
  {
    category: "Payments and refunds",
    q: "How long does a refund take to arrive?",
    /* This answer used to promise card reversals in three to ten business
       days. Refunds do not go back to a card: they land in the wallet, which
       is what the docs, the cancellation policy and the product itself say. */
    a: `A refund lands in your Vallo wallet, usually within minutes of the decision. ${WALLET_MONEY_USES} If nothing has appeared in your wallet statement, contact support with your booking reference.`,
  },

  // ------------------------------------------------------------ listing
  {
    category: "Listing your property",
    q: "Can I list a hotel, a guest house or a restaurant rather than a property?",
    a: "Yes. The same application covers both sides. Once you are approved you publish from your agent workspace, and a place let by the night is run with the host tools: the calendar, the nights you close by hand, and the bookings that arrive against them. A restaurant is listed the same way and answers table requests from the same workspace.",
  },
  {
    category: "Listing your property",
    q: "How do I list my property on Vallo?",
    /* "Agent dashboard" is not a Vallo word: the agent surface is the
       workspace, called Agent Mode in the product. PRODUCT.md section 7.
       AND IT NO LONGER SENDS A LANDLORD TO BECOME AN AGENT. This answer
       described the six step agent application as the only route in, which is
       the exact reason this platform has one `agents` row in it: a man with one
       flat in Bwari is not becoming an agent and never will be, and we were
       showing him the door rather than the room. The three doors are named from
       `SUPPLY_DOORS`, so renaming one changes this sentence too. */
    a: `Add a workspace from your profile and pick the door that fits: ${doorsSentence()}. The owner form takes about five minutes and asks for your name, an ID and whatever you hold on the property, and there is an honest answer if you hold no document at all. Once you are through you publish from that workspace.`,
  },
  {
    category: "Listing your property",
    q: "Does it cost anything to list?",
    a: "No. Listing is free, and it stays free. Vallo charges no fees at all: not to list, not to book, and nothing is taken out of what a guest pays you.",
  },
  {
    category: "Listing your property",
    q: "When do agents get paid?",
    a: AGENT_PAYOUT_ANSWER,
  },

  // ------------------------------------------------------- verification
  {
    category: "Verification and trust",
    q: "What does the verified badge on a listing mean?",
    a: "It means the agent behind the listing passed identity verification with a government issued ID or NIN, and the listing details were checked before going live. Listings that fail our checks do not appear on Vallo at all.",
  },
  {
    category: "Verification and trust",
    q: "How are agents verified?",
    a: "Every agent verifies their identity with their NIN or a government issued ID. Agents operating as a business also upload their business registration documents. Applications are reviewed by a person, not a script.",
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
    q: "Does Vallo charge any fees?",
    a: "No. Vallo charges no fees. Not to book, not to list, not to be paid, in any market on the platform. The total you see before you commit is the agent's own number: the move-in total on a yearly tenancy, the nights and any cleaning charge on a shortlet, the asking price on a sale, a shop, an office or land. Nothing of ours sits on top of it. An agency fee or a caution fee can be a real part of what a landlord asks for, and when it is, it is named on the listing and counted into the move-in total. Anyone presenting an inspection fee, a holding fee or a platform fee as ours is lying, and you should report them.",
  },
  {
    category: "Verification and trust",
    q: "Someone asked me to pay into a bank account. What do I do?",
    a: "Stop, and report them. No Vallo staff member, agent or listing will ever give you an account number to pay into: every payment happens inside the platform. Use the report control on the listing, or the contact form, and include the account number and the messages. Reports about off-platform payment are answered within four hours.",
  },
  {
    category: "Verification and trust",
    q: "What if I have already sent money outside the platform?",
    a: "Call your bank first and ask them to raise a dispute on the transfer, because a fast report is sometimes enough for them to place a lien on the receiving account. Then report it to us with the listing link, the account details and the messages. We cannot recover money that never came through Vallo, but we can remove the account and stop the same person reaching anybody else.",
  },

  // ---------------------------------------------------------- languages
  {
    category: "Languages and accessibility",
    q: "Which languages does Vallo work in?",
    a: "English, Yorùbá, Hausa and Igbo. You can switch language at any time from the switcher in the header, and your choice is remembered on your device.",
  },
  {
    category: "Languages and accessibility",
    q: "Can I get support in my own language?",
    a: "Yes. Write to support in English, Yorùbá, Hausa or Igbo and you will get a reply in the language you used.",
  },
];

export default function HelpPage() {
  return (
    <>
      <SiteHead
        plate="living-room-dusk"
        icon="support-chat"
        chip="Help centre"
        title="How can we help?"
        lede="Straight answers about both sides of Vallo: what the platform is for, the switch, booking a stay, holding a table, payments, refunds, listing and verification. Search below, or browse by topic."
      />
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-3xl">

        {/* ------------------------------------------------ trust surfaces */}
        <nav
          aria-label="Safety and policy"
          className="nf-rise mt-block grid gap-row sm:grid-cols-3"
          style={{ animationDelay: "60ms" }}
        >
          {TRUST_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nf-panel nf-panel--card block nf-card--interactive p-card-sm">
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
        <div className="nf-panel nf-panel--card mt-section-tight flex flex-col items-start gap-group p-card sm:flex-row sm:items-center sm:justify-between">
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
    </>
  );
}
