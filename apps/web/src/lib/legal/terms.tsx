/**
 * Terms of service, as content rather than as a page.
 *
 * These sections are rendered in two places and must never differ between
 * them: `(site)/terms` for the public web, and `(app)/legal/terms` for
 * somebody already inside the product. The in-product copy exists because the
 * marketing page is a different application shell: tapping Terms of service in the
 * side navigation used to throw a signed-in person out of the product
 * entirely, and their back button then returned them to the marketing site
 * rather than to the screen they were reading a moment earlier.
 *
 * Two routes, one document. A legal text that says different things in two
 * places is not a legal text.
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED ON 15 SEPTEMBER 2026, AND WHY IT WAS URGENT
 *
 * Section 4 used to read: "Your payment is held securely by RentMe and
 * released to the agent only after check-in, or after you confirm that an
 * inspection matched the listing", and section 4 also said "the payment stays
 * held while we investigate". Section 9 then limited our liability "beyond the
 * protections described in sections 4 and 5", which leaned the whole liability
 * clause on that promise.
 *
 * **That was a binding contractual promise of escrow, and no guest's money has
 * ever moved that way.** It was checked rather than assumed before it was
 * removed:
 *
 *   - `public.escrows` DOES exist and is well built. There is a state machine
 *     enforced by a database trigger rather than only in TypeScript, four
 *     escrow purposes, an audit trigger, a timeout sweep, a locking
 *     SECURITY DEFINER settle function, and an admin resolution RPC behind
 *     `/admin/escrow`. The claim in some older notes that escrow is "zero
 *     percent built" is out of date and this file does not repeat it.
 *   - **Nothing routes a guest's payment into it.**
 *     `private.pay_booking_from_wallet` debits the payer and credits the payee
 *     in one transaction with no hold anywhere in it, no screen in the product
 *     can open a hold, and `public.booking_status` is still
 *     `PENDING, CONFIRMED, CANCELLED` with no COMPLETED, so there is no event
 *     that a release after check-in could fire on even if there were a flow.
 *
 * So the mechanism is real and unreachable, and the terms described the
 * mechanism as though a user could reach it. A person deciding whether to send
 * money to a stranger read that clause and relied on it.
 *
 * There is a second reason it could not simply be softened. **Holding client
 * funds between two parties is regulated by the Central Bank of Nigeria**, and
 * whether this company may operate such a service at all is an open question
 * the owner has not had answered. The corporate objects clause filed at the
 * Commission deliberately omits every payment and escrow word, because the
 * portal's classifier read those words as a regulated payments business and
 * demanded share capital of 500,000,000 naira. Promising in a contract a
 * service the memorandum does not permit is worse than promising one the code
 * does not implement.
 *
 * The clause now says what actually happens, and section 4 says plainly that
 * money is not held. **Restore a holding promise when there is a flow AND a
 * legal answer, not when either one arrives alone.**
 *
 * ---------------------------------------------------------------------------
 * FOR THE SOLICITOR
 *
 * HANDOFF 01 section 4.6 is explicit that provisions are not invented here and
 * that anything carrying real legal consequence goes to the Company Solicitor.
 * The clauses below are DESCRIPTIVE: each one says what the platform actually
 * does, which is a thing this session can establish from the code and the
 * schema. None of them creates a new right or a new liability.
 *
 * These seven need a solicitor's eye before Launch and are marked here rather
 * than in a separate document that would drift away from the text:
 *
 *   4   Payments, now that it describes a direct payment rather than a hold.
 *       The consumer protection position changes when the platform is not
 *       holding the money, and that should be said correctly rather than
 *       merely accurately.
 *   5   Cancellations and refunds. The schedule is real and lives in
 *       `lib/trust/cancellation.ts`, but a refund promise is a financial
 *       commitment.
 *   6   The commission paragraph, which describes a fee that is set to zero
 *       today. It must not read as introducing one.
 *   9   Limitation of liability, which no longer rests on a holding promise.
 *   10  Suspension, closure and the appeal route.
 *   13  Governing law, which must stay consistent with the Co-Founder and
 *       Investment Agreement: Nigerian law, and arbitration in Abuja under the
 *       Arbitration and Mediation Act 2023.
 *   15  The wallet, which states what a balance is not. That sentence is the
 *       one a regulator would read first.
 */

import { SUPPORT_HREF, SUPPORT_LABEL } from "@/lib/support-email";
import { COMPANY_FORMAL_NAME, COMPANY_TRADING_NAME } from "./company";
import Link from "next/link";

export const TERMS_SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. About these terms",
    body: (
      <p>
        These terms are an agreement between you and {COMPANY_FORMAL_NAME}, a private
        company limited by shares registered in Nigeria, which operates the{" "}
        {COMPANY_TRADING_NAME} website, apps and services. Where these terms say{" "}
        &quot;{COMPANY_TRADING_NAME}&quot;, &quot;we&quot; or &quot;us&quot;, they mean
        that company. By creating an account or using the platform you accept these
        terms. If you do not accept them, please do not use the platform.
      </p>
    ),
  },
  {
    title: `2. What ${COMPANY_TRADING_NAME} is`,
    body: (
      <>
        <p>
          {COMPANY_TRADING_NAME} is a marketplace for property in Nigeria. People list
          homes to rent, property for sale, land, shops and offices, and shortlets,
          hotels and rooms let by their owners. We verify the people who list, host
          their listings, carry messages between them and you, and process payments.
        </p>
        <p>
          <strong>
            Everything on {COMPANY_TRADING_NAME} was listed on {COMPANY_TRADING_NAME} by
            a real person who applied and was approved.
          </strong>{" "}
          Nothing is imported from an outside feed. That is the point of the platform
          and it is why there is always somebody to message and somebody accountable
          for what a listing says.
        </p>
        <p>
          The property itself is provided by the person who listed it, not by{" "}
          {COMPANY_TRADING_NAME}. The tenancy, sale or stay is between you and them. We
          are not a party to it, not an agent for either side, and not a landlord.
        </p>
      </>
    ),
  },
  {
    title: "3. Accounts and eligibility",
    body: (
      <ul>
        <li>You must be at least 18 years old to use {COMPANY_TRADING_NAME}.</li>
        <li>
          The information on your account must be accurate and kept up to date, and you
          may hold only one personal account.
        </li>
        <li>
          You are responsible for keeping your sign-in details secret and for activity
          on your account. Tell us immediately if you believe it has been compromised.
        </li>
        <li>
          Browsing is open to anybody. Saving, messaging, requesting an inspection,
          paying and listing need an account.
        </li>
      </ul>
    ),
  },
  {
    title: "4. Payments, and what happens to your money",
    body: (
      <>
        <ul>
          <li>
            All payments must go through the platform. The full price, in naira, is
            shown before you confirm anything.
          </li>
          <li>
            <strong>
              We do not hold your money in escrow, and you should not treat a payment
              made here as protected by us holding it.
            </strong>{" "}
            When you pay, the money reaches the person you are paying. We keep the
            record of what was paid, to whom, for what and when, and that record is what
            we can act on if something goes wrong. It is not the same thing as holding
            the money, and we will not describe it as though it were.
          </li>
          <li>
            Renting is <strong>message, inspect, then pay</strong>. Message the person
            who listed the property, see the property in person, and pay after that.
            There is no reserve button on a rental and that is deliberate.
          </li>
          <li>
            Paying in cash or by direct bank transfer outside the platform leaves no
            record we can act on at all, and we cannot help recover money paid that way.
            If anybody asks you to do it, report them to us.
          </li>
          <li>
            If a property is materially not as listed, report it to us. We investigate,
            and we can suspend a listing, stop the person who posted it from trading and
            withhold any payout we still control. We cannot reverse a payment that has
            already reached them.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Cancellations and refunds",
    body: (
      <ul>
        <li>
          One cancellation schedule covers every stay, rather than a different one for
          each host: everything back until 72 hours before check-in, half back inside
          that window, and nothing back once check-in day has started.
        </li>
        <li>
          A stay nobody has paid for is only a hold on the calendar and can be called
          off at any time for nothing.
        </li>
        <li>
          If the host cancels, the property was not what was listed, or you could not
          get in, you get everything back whenever it happens. Report it rather than
          cancelling it yourself.
        </li>
        <li>
          Refunds go to your {COMPANY_TRADING_NAME} wallet in naira, and you move money
          from there to your bank.
        </li>
      </ul>
    ),
  },
  {
    title: "6. Listing a property",
    body: (
      <ul>
        <li>
          <strong>
            Listing is free and {COMPANY_TRADING_NAME} charges no fee of any kind
            today, to anybody, for anything.
          </strong>{" "}
          Not to look, not to save, not to message, not to enquire, not to list and not
          to complete a transaction.
        </li>
        <li>
          If that ever changes, the rate will be shown before the action that incurs it,
          on the same screen and at the same weight as the amount. We will give thirty
          days&apos; notice by email and in the product first, and anything listed or
          booked under one rate completes under that rate.
        </li>
        <li>
          You are responsible for the accuracy of what you list. Listings must be
          lawful, must be yours to offer, and must carry photographs of the actual
          property. Every listing is reviewed by a person before it is published.
        </li>
        <li>
          Where a listing states a title, such as a certificate of occupancy or a deed
          of assignment, that is what the seller claims.{" "}
          <strong>It is not a statement that anybody has checked it.</strong> Have a
          lawyer verify title at the land registry before money moves.
        </li>
        <li>
          Earnings are paid to a nominated Nigerian bank account. We may remove
          listings, withhold payouts connected to fraud, or stop accounts that break
          these terms.
        </li>
      </ul>
    ),
  },
  {
    title: "7. What verification means, and what it does not",
    body: (
      <>
        <p>
          Trust on {COMPANY_TRADING_NAME} is deliberately not a single tick, because a
          single tick is a promise we would have to keep about things we cannot know.
        </p>
        <ul>
          <li>
            <strong>The verified badge</strong> means an administrator approved the
            listing and the person who posted it has passed identity checks. It means
            those two things and nothing else.
          </li>
          <li>
            The person who lists climbs a ladder: phone, then identity document, then
            address, then a physical inspection. Where a rung is shown with a date, that
            is a record of something that happened on that date. Where it is absent,
            nobody has done it. An absence is not a negative and does not mean anything
            is wrong.
          </li>
          <li>
            <strong>Verification is not a guarantee against fraud</strong>, not a
            valuation, not a survey, not a structural inspection and not legal advice
            about title. A verified person can still behave badly, and the checks tell
            you who somebody is rather than how they will behave.
          </li>
          <li>
            Badges are earned and are never for sale. Where a paid inspection is offered
            as a service, what you pay for is the inspection; the outcome depends on
            what the inspector finds and never on the payment.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Messages, and what we can see",
    body: (
      <>
        <p>
          Keep every conversation on the platform. The record is what protects you when
          a deal goes wrong, and a conversation that moved to another app is one we
          cannot see, cannot verify and cannot act on.
        </p>
        <p>
          <strong>You should know that messages are screened automatically.</strong> An
          automated check flags messages containing things like bank account numbers and
          payment requests, and a flagged message is put in front of our staff to
          review. It exists because asking somebody to pay outside the platform is the
          most common way people are defrauded in this market.
        </p>
        <p>
          We do not give staff casual access to private conversations. Staff read a
          conversation when a check has flagged it, when somebody reports it, or where
          the law requires it. You can block and report any other member.
        </p>
      </>
    ),
  },
  {
    title: "9. Inspections",
    body: (
      <p>
        You can request an inspection through the platform and the person who listed the
        property arranges it with you.{" "}
        <strong>
          {COMPANY_TRADING_NAME} is not present at an inspection and does not conduct it
        </strong>{" "}
        unless the listing explicitly says the property was physically inspected by us
        and gives the date. Take somebody with you, meet in daylight, and never pay
        before you have seen the property.
      </p>
    ),
  },
  {
    title: "10. The assistant and anything automated",
    body: (
      <p>
        {COMPANY_TRADING_NAME} includes an assistant and other automated features that
        generate text.{" "}
        <strong>
          Anything they produce is assistance, not advice. It is not a valuation, not
          legal advice and never a substitute for viewing a property in person.
        </strong>{" "}
        Generated answers can be wrong. Check anything that matters against the listing
        itself and against the person who posted it, and take professional advice before
        you commit money.
      </p>
    ),
  },
  {
    title: "11. Reviews and content",
    body: (
      <p>
        Reviews must reflect a genuine stay or visit, and you can only review a stay you
        actually had. You keep ownership of the content you post, and you grant{" "}
        {COMPANY_TRADING_NAME} a non-exclusive licence to host and display it on the
        platform and in connection with the service. We may remove content that is
        unlawful, abusive or misleading. The platform itself, its design, its software
        and its name remain ours.
      </p>
    ),
  },
  {
    title: "12. Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Post false, misleading or unlawful listings, reviews, posts or messages.</li>
          <li>
            Take a transaction or a payment off the platform, or ask anybody else to.
          </li>
          <li>Impersonate any person, or use another person&apos;s identity documents.</li>
          <li>Harass, threaten or discriminate against anybody, including our staff.</li>
          <li>
            Scrape the platform, interfere with its security, or use it to send spam.
          </li>
          <li>Hold more than one personal account, or try to claim a reserved handle.</li>
        </ul>
      </>
    ),
  },
  {
    title: "13. Our responsibility to you",
    body: (
      <>
        <p>
          We work hard to keep listings honest, but {COMPANY_TRADING_NAME} is a
          marketplace: we do not own, occupy, inspect daily or control the properties
          people list. To the extent Nigerian law allows:
        </p>
        <ul>
          <li>
            The platform is provided &quot;as is&quot;, and we do not guarantee it will
            always be uninterrupted or error free.
          </li>
          <li>
            We are not liable for losses caused by another user breaking their agreement
            with you, beyond the specific commitments in sections 5 and 6.
          </li>
          <li>
            Nothing in these terms excludes liability that cannot lawfully be excluded,
            including for fraud or for death or personal injury caused by negligence.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "14. Suspension, closing your account, and appealing",
    body: (
      <>
        <p>
          You may close your account at any time from settings or by contacting support.
          We may suspend or close an account that breaks these terms. Where we do, we
          tell you why and, where the breach can be fixed, give you the chance to fix
          it. Serious harm, fraud or a legal requirement may mean immediate suspension.
        </p>
        <p>
          <strong>You can appeal any suspension or closure.</strong> Reply to the notice
          or contact support, and a person who was not involved in the original decision
          reviews it. Money owed to you that is not connected to fraud is still paid out.
        </p>
      </>
    ),
  },
  {
    title: "15. The wallet",
    body: (
      <>
        <p>
          Your {COMPANY_TRADING_NAME} wallet is a record, in naira, of money you have
          funded or been refunded, and what you have spent on the platform. You can move
          it out to a Nigerian bank account in your own name.
        </p>
        <p>
          <strong>
            A wallet balance is not a bank deposit. It is not a savings account, it earns
            no interest, it is not insured by the Nigeria Deposit Insurance Corporation,
            and {COMPANY_TRADING_NAME} is not a bank or a licensed financial
            institution.
          </strong>{" "}
          Keep in it only what you intend to spend here.
        </p>
      </>
    ),
  },
  {
    title: "16. Privacy",
    body: (
      <p>
        How we handle personal data is described in our{" "}
        <Link href="/privacy" className="font-semibold text-[var(--nf-electric-300)] hover:underline">
          Privacy policy
        </Link>
        , which is written for the Nigeria Data Protection Act 2023 and forms part of
        these terms.
      </p>
    ),
  },
  {
    title: "17. Changes to these terms",
    body: (
      <p>
        We may update these terms as the platform grows. The date at the top of this
        page always shows the current version, and we will notify you through the
        product or by email before significant changes take effect. Continuing to use{" "}
        {COMPANY_TRADING_NAME} after a change means you accept the updated terms.
      </p>
    ),
  },
  {
    title: "18. Governing law and disputes",
    body: (
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria, and the
        Nigerian courts have jurisdiction over disputes arising from them. We would
        always rather resolve a problem directly first, so please contact support before
        anything else; most issues are settled that way.
      </p>
    ),
  },
  {
    title: "19. Contact",
    body: (
      <p>
        Questions about these terms go to{" "}
        <a href={SUPPORT_HREF} className="font-semibold text-[var(--nf-electric-300)] hover:underline">
          {SUPPORT_LABEL}
        </a>
        . We reply within one business day.
      </p>
    ),
  },
];
