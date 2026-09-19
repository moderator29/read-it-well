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
import { GRACE_WINDOW_DAYS } from "@/lib/account-deletion/constants";
import {
  COMPANY_DOMAIN,
  COMPANY_FORMAL_NAME,
  COMPANY_NDPC_REGISTRATION,
  COMPANY_REGISTERED_OFFICE,
  COMPANY_TRADING_NAME,
  DATA_PROTECTION_OFFICER,
} from "./company";

export const PRIVACY_SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Who we are",
    body: (
      <>
        {/* This description is identity, not obligation. It said "stays,
            hotels, restaurants and experiences", the product's earlier scope,
            and omitted property entirely; it now matches how the terms of
            service section 2 describes the platform. No right or duty in this
            policy turns on the sentence. */}
        <p>
          {COMPANY_TRADING_NAME} is a marketplace for property in Nigeria: homes to
          rent, property for sale, land, shops and offices, and stays, hotels and
          restaurants listed by the people who run them
          {COMPANY_DOMAIN ? <>, on the web at {COMPANY_DOMAIN}</> : null}. It is operated
          by {COMPANY_FORMAL_NAME}, a private company limited by shares registered in
          Nigeria under the Companies and Allied Matters Act 2020, whose registered
          office is {COMPANY_REGISTERED_OFFICE}.
        </p>
        <p>
          For the purposes of the Nigeria Data Protection Act 2023 (the &quot;NDPA&quot;),{" "}
          <strong>{COMPANY_FORMAL_NAME}</strong> is the data controller for the personal
          data described in this policy. Where this policy says &quot;we&quot; or
          &quot;us&quot;, it means that company.
          {COMPANY_NDPC_REGISTRATION ? (
            <> It is registered with the Nigeria Data Protection Commission under
            registration number {COMPANY_NDPC_REGISTRATION}.</>
          ) : null}
        </p>
        <p>
          Our Data Protection Officer is {DATA_PROTECTION_OFFICER}. Questions about this
          policy, about the data we hold about you, or any request to exercise the rights
          in section 8, should go to{" "}
          <a href={SUPPORT_HREF} className="font-semibold text-[var(--nf-content-link)] hover:underline">
            {SUPPORT_LABEL}
          </a>
          , with Privacy as the subject. Requests sent that way reach the Data Protection
          Officer.
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
        <li>To process bookings, take payments, issue refunds and pay people out.</li>
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
            <strong>Agents and the people who contact them.</strong> When you book a
            stay, request an inspection, apply for a tenancy or enquire about a sale,
            the agent sees the details they need to answer you. When you list, the
            people who contact you see your public agent profile.
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
    /* Rewritten so the document and the code finally agree. The old version
       promised deletion "within a reasonable period", and the product could
       not perform one at all for anybody who had transacted: see
       docs/design/audits/r3/findings.md F-17. Every sentence below describes
       what lib/account-deletion actually does. */
    title: "7. How long we keep data, and what happens when you delete your account",
    body: (
      <>
        <p>
          We keep personal data only as long as we need it. While your account is open we
          keep your profile, your content and your records. When you delete your account,
          two different things happen to two different kinds of data, and this section
          says plainly which is which.
        </p>
        <p>
          <strong>You can delete your account yourself,</strong> in Settings then Account,
          in the app or on this website. You do not need to write to us and we do not do
          it by hand.
        </p>
        <p>
          <strong>Nothing is destroyed for {GRACE_WINDOW_DAYS} days.</strong> The moment
          you confirm, your account is signed out everywhere and deactivated: you cannot
          sign in and nobody can reach your profile. We email you the date the deletion
          runs and a code that stops it. If you use that code inside the window,
          everything is put back and nothing has been lost. At the end of the{" "}
          {GRACE_WINDOW_DAYS} days a scheduled job runs the deletion, and we email you
          again when it has finished.
        </p>
        <p>
          <strong>Destroyed outright.</strong> Your profile and the details in it, your
          photograph and cover picture, your posts, comments, stories and unpublished
          drafts, your saved properties, stays, tables, searches and interests, your
          search history, the devices you are signed in on, your notifications, your saved
          cards and bank accounts, and every file you have uploaded, including identity,
          agency and host documents. The files are removed from storage, not merely the
          records that point at them.
        </p>
        <p>
          <strong>Kept, with you removed from it.</strong> Vallo is registered with the
          Special Control Unit against Money Laundering and is subject to Nigeria&rsquo;s
          Money Laundering (Prevention and Prohibition) Act, which requires a business
          that moves money to retain its transaction records for at least five years after
          the transaction. So your bookings, reservations, wallet entries, payments,
          platform revenue lines, payout records, inspection requests and reviews are kept
          for that period. Your name, email address and telephone number are removed from
          every one of them, and what remains is an amount, a date and a reference that no
          longer identifies you. Messages you have sent stay in the other person&rsquo;s
          conversation so their side of the thread is still readable, with the sender
          shown as a deleted account.
        </p>
        <p>
          <strong>This is the retention exception to your right to erasure,</strong> and
          section 8 sets out how to exercise that right. The NDPA permits us to keep
          personal data where another law requires us to, and this is that case. It is
          limited to the records named above, for the period named above, and to nothing
          else.
        </p>
        <p>
          Verification documents are the clearest example of the line: while you are an
          agent or a host we keep them because the law requires us to hold them; when you
          delete your account we destroy the documents themselves and keep only the record
          that a check took place, with the document type and number removed.
        </p>
        <p>
          The full list of what is destroyed and what is kept, and the form that stops a
          deletion already running, are at{" "}
          <a
            href="/delete-account"
            className="font-semibold text-[var(--nf-content-link)] hover:underline"
          >
            the delete account page
          </a>
          .
        </p>
      </>
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
          <li>
            Delete your account yourself, in Settings then Account, which destroys
            everything except the records section 7 says we are required to keep.
          </li>
          <li>Ask us to delete other data we no longer have a lawful reason to keep.</li>
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
          Deletion is the one you do not have to ask us for: it is a control in the
          product, it takes effect immediately, and{" "}
          <a
            href="/delete-account"
            className="font-semibold text-[var(--nf-content-link)] hover:underline"
          >
            the delete account page
          </a>{" "}
          explains it in full. To exercise any of the others, write to us through{" "}
          <a href={SUPPORT_HREF} className="font-semibold text-[var(--nf-content-link)] hover:underline">
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
        {COMPANY_TRADING_NAME} is for adults. You must be at least 18 years old to create
        an account, book a stay or list a property. We do not knowingly collect personal
        data from children, and we delete any such data we discover.
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
