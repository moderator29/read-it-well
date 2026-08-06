/**
 * Privacy policy, as content rather than as a page.
 *
 * These sections are rendered in two places and must never differ between
 * them: `(site)/privacy` for the public web, and `(app)/legal/privacy` for
 * somebody already inside the product. The in-product copy exists because the
 * marketing page is a different application shell: tapping Privacy policy in the
 * side navigation used to throw a signed-in person out of the product
 * entirely, and their back button then returned them to the marketing site
 * rather than to the screen they were reading a moment earlier.
 *
 * Two routes, one document. A legal text that says different things in two
 * places is not a legal text.
 */

import { SUPPORT_HREF, SUPPORT_LABEL } from "@/lib/support-email";

export const PRIVACY_SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Who we are",
    body: (
      <>
        <p>
          RentMe (&quot;RentMe&quot;, &quot;we&quot;, &quot;us&quot;) operates a
          Nigeria-first platform for discovering and booking stays, hotels, restaurants
          and experiences, on the web at rentme.ng. For the purposes of the Nigeria
          Data Protection Act 2023 (the &quot;NDPA&quot;), RentMe is the data
          controller for the personal data described in this policy.
        </p>
        <p>
          Questions about this policy or about your data should go to{" "}
          <a href={SUPPORT_HREF} className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            {SUPPORT_LABEL}
          </a>
          , with Privacy as the subject.
        </p>
      </>
    ),
  },
  {
    title: "2. The data we collect",
    body: (
      <>
        <p>We collect only what the platform needs to work:</p>
        <ul>
          <li>
            <strong>Account data.</strong> Your name, email address, phone number,
            password (stored only in hashed form) and language preference.
          </li>
          <li>
            <strong>Booking data.</strong> The listings you view, the bookings you make,
            dates, guests, messages you exchange with agents, and reviews you write.
          </li>
          <li>
            <strong>Payment data.</strong> Payment references, amounts, refund history
            and your wallet balance. Card details are handled by licensed Nigerian
            payment processors; we never store your full card number.
          </li>
          <li>
            <strong>Agent verification data.</strong> If you apply to become an agent,
            your government issued ID or NIN, business registration documents where
            applicable, and the bank account you nominate for payouts.
          </li>
          <li>
            <strong>Technical data.</strong> Device type, browser, IP address, and how
            you move through the product, used to keep the service working and secure.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "3. How we use your data",
    body: (
      <ul>
        <li>To create and run your account and show the platform in your language.</li>
        <li>To process bookings, hold and release payments, and pay agents out.</li>
        <li>To verify agent identities and keep fraudulent listings off the platform.</li>
        <li>To carry messages between guests and agents about listings and bookings.</li>
        <li>To answer support requests and investigate reports and disputes.</li>
        <li>To keep the service secure, prevent abuse and comply with Nigerian law.</li>
        <li>
          To send service messages about your bookings and account. Marketing messages
          are sent only with your consent, and every one includes a way to opt out.
        </li>
      </ul>
    ),
  },
  {
    title: "4. Our lawful bases under the NDPA",
    body: (
      <>
        <p>Every use of your data rests on a lawful basis recognised by the NDPA:</p>
        <ul>
          <li>
            <strong>Contract.</strong> Running your account, processing your bookings and
            paying agents are all necessary to provide the service you signed up for.
          </li>
          <li>
            <strong>Legal obligation.</strong> Identity verification, financial record
            keeping and responding to lawful requests from Nigerian authorities.
          </li>
          <li>
            <strong>Legitimate interest.</strong> Fraud prevention, platform security and
            improving the product, balanced against your rights.
          </li>
          <li>
            <strong>Consent.</strong> Marketing communications and any optional features
            that ask for it. Consent can be withdrawn at any time without affecting your
            use of the platform.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Who we share data with",
    body: (
      <>
        <p>We do not sell personal data. We share it only where the service requires:</p>
        <ul>
          <li>
            <strong>Agents and guests.</strong> When you book, the agent sees the details
            needed to host you. When you list, guests see your public agent profile.
          </li>
          <li>
            <strong>Payment processors.</strong> Licensed Nigerian providers that process
            payments, refunds and payouts on our behalf.
          </li>
          <li>
            <strong>Service providers.</strong> Hosting, analytics and communication
            providers who process data under contract and only on our instructions.
          </li>
          <li>
            <strong>Authorities.</strong> Where Nigerian law requires it, or to protect
            the safety of our users, and only to the extent required.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Storage and international transfers",
    body: (
      <p>
        Our infrastructure providers may store data on servers outside Nigeria. Where
        personal data leaves Nigeria we rely on the transfer mechanisms permitted by the
        NDPA, including transfers to jurisdictions providing adequate protection and
        contractual safeguards with our providers, so your data keeps the same level of
        protection wherever it is processed.
      </p>
    ),
  },
  {
    title: "7. How long we keep data",
    body: (
      <p>
        We keep personal data only as long as it is needed. Account data is kept while
        your account is active and deleted or anonymised within a reasonable period after
        you close it. Booking and payment records are kept for as long as Nigerian
        financial and tax rules require. Verification documents are kept while you remain
        an agent and for the period the law requires afterwards.
      </p>
    ),
  },
  {
    title: "8. Your rights under the NDPA",
    body: (
      <>
        <p>The NDPA gives you rights over your personal data. You can:</p>
        <ul>
          <li>Ask for a copy of the personal data we hold about you.</li>
          <li>Ask us to correct data that is inaccurate or incomplete.</li>
          <li>Ask us to delete data we no longer have a lawful reason to keep.</li>
          <li>Object to, or ask us to restrict, certain processing.</li>
          <li>Ask for your data in a portable format.</li>
          <li>Withdraw consent where processing is based on consent.</li>
        </ul>
        <p>
          {/* The sentence somebody reads when they want their data back or
              deleted. It has to point at a channel a person actually reads,
              which today is the contact form: it writes a support_tickets row
              an admin works in the console. It said support@rentme.ng, and
              that mailbox does not exist, so every NDPA request sent to it
              would have gone nowhere while the sender believed they had
              asked. */}
          To exercise any of these rights, write to us through{" "}
          <a href={SUPPORT_HREF} className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            {SUPPORT_LABEL}
          </a>
          . We respond within the timelines the NDPA sets. If you are not satisfied with
          our response, you have the right to complain to the Nigeria Data Protection
          Commission (NDPC).
        </p>
      </>
    ),
  },
  {
    title: "9. Cookies and similar technology",
    body: (
      <p>
        We use a small number of cookies and similar technologies: strictly necessary
        ones that keep you signed in and remember your language and theme, and analytics
        that help us understand how the product is used so we can improve it. We do not
        use cookies to sell your attention to third parties.
      </p>
    ),
  },
  {
    title: "10. Children",
    body: (
      <p>
        RentMe is for adults. You must be at least 18 years old to create an account,
        book a stay or list a property. We do not knowingly collect personal data from
        children, and we delete any such data we discover.
      </p>
    ),
  },
  {
    title: "11. Security",
    body: (
      <p>
        We protect personal data with encryption in transit, access controls, hashed
        passwords and payment processing through licensed providers. No system is
        perfectly secure, so if we ever discover a breach that puts your rights at risk
        we will notify the NDPC and affected users as the NDPA requires.
      </p>
    ),
  },
  {
    title: "12. Changes to this policy",
    body: (
      <p>
        When we change this policy we will update the date at the top of this page, and
        for significant changes we will tell you directly through the product or by
        email before they take effect.
      </p>
    ),
  },
];
