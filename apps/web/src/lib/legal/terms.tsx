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
 */

import { SUPPORT_HREF, SUPPORT_LABEL } from "@/lib/support-email";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

export const TERMS_SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. About these terms",
    body: (
      <p>
        These terms are an agreement between you and RentMe (&quot;RentMe&quot;,
        &quot;we&quot;, &quot;us&quot;) governing your use of the RentMe website,
        apps and services. By creating an account or using the platform you accept them.
        If you do not accept them, please do not use the platform.
      </p>
    ),
  },
  {
    title: "2. What RentMe is",
    body: (
      <p>
        RentMe is a marketplace that connects guests with independent agents who
        list stays, hotels, restaurants and experiences across Nigeria. We verify
        agents, host listings, carry messages and process payments. The accommodation
        or experience itself is provided by the agent, not by RentMe, and the
        booking contract for the stay is between you and the agent.
      </p>
    ),
  },
  {
    title: "3. Accounts and eligibility",
    body: (
      <ul>
        <li>You must be at least 18 years old to use RentMe.</li>
        <li>
          The information on your account must be accurate and kept up to date, and you
          may hold only one personal account.
        </li>
        <li>
          You are responsible for keeping your sign-in details secret and for activity
          on your account. Tell us immediately if you believe it has been compromised.
        </li>
      </ul>
    ),
  },
  {
    title: "4. Bookings and payments",
    body: (
      <ul>
        <li>
          All payments must go through the platform. The full price, in naira, is shown
          before you confirm a booking.
        </li>
        <li>
          Your payment is held securely by RentMe and released to the agent only
          after check-in, or after you confirm that an inspection matched the listing.
          Paying an agent in cash or by direct transfer outside the platform removes
          this protection, and we cannot help recover money paid that way.
        </li>
        <li>
          If a property is materially not as listed, report it to us before or at
          check-in and the payment stays held while we investigate.
        </li>
      </ul>
    ),
  },
  {
    title: "5. Cancellations and refunds",
    body: (
      <ul>
        <li>
          Each listing shows its cancellation window. Cancelling within it entitles you
          to a refund under that listing&apos;s policy.
        </li>
        <li>
          If an agent cancels, or a booking fails because a listing was misrepresented
          or unavailable, you receive a refund of what you paid for that booking.
        </li>
        <li>
          Refunds go back the way you paid, or to your RentMe wallet if you choose.
          Card and bank refunds typically arrive within three to ten business days.
        </li>
      </ul>
    ),
  },
  {
    title: "6. Agents and listings",
    body: (
      <ul>
        <li>
          Listing is free. RentMe charges agents a commission only when a booking
          completes; current rates are shown in the agent dashboard before you publish.
        </li>
        <li>
          Agents must complete identity verification, and business agents must provide
          their registration documents. Listings must be accurate, lawful, and yours to
          offer, with photographs of the actual property.
        </li>
        <li>
          Agent earnings are paid to the nominated Nigerian bank account after each
          completed stay.
        </li>
        <li>
          We may remove listings, withhold payouts connected to fraud, or suspend agent
          accounts that break these terms or put users at risk.
        </li>
      </ul>
    ),
  },
  {
    title: "7. Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Post false, misleading or unlawful listings, reviews or messages.</li>
          <li>Take bookings or payments off the platform, or ask others to.</li>
          <li>Impersonate any person, or use another person&apos;s identity documents.</li>
          <li>Harass, threaten or discriminate against guests, agents or staff.</li>
          <li>
            Scrape the platform, interfere with its security, or use it to send spam.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Reviews and content",
    body: (
      <p>
        Reviews must reflect a genuine stay or visit. You keep ownership of the content
        you post, and you grant RentMe a licence to display it on the platform and
        in connection with the service. We may remove content that is unlawful, abusive
        or misleading.
      </p>
    ),
  },
  {
    title: "9. Our responsibility to you",
    body: (
      <>
        <p>
          We work hard to keep listings honest and payments safe, but RentMe is a
          marketplace: we do not own, inspect daily, or control the properties and
          experiences agents list. To the extent Nigerian law allows:
        </p>
        <ul>
          <li>
            The platform is provided &quot;as is&quot;, and we do not guarantee it will
            always be uninterrupted or error free.
          </li>
          <li>
            We are not liable for losses caused by an agent&apos;s or guest&apos;s
            breach of their booking contract, beyond the protections described in
            sections 4 and 5.
          </li>
          <li>
            Nothing in these terms excludes liability that cannot lawfully be excluded,
            including for fraud.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "10. Suspension and closing your account",
    body: (
      <p>
        You may close your account at any time from settings or by contacting support.
        We may suspend or close accounts that break these terms, after telling you why
        and, where the breach can be fixed, giving you the chance to fix it. Serious
        harm, fraud or a legal requirement may mean immediate suspension. Money owed to
        you that is not connected to fraud is still paid out.
      </p>
    ),
  },
  {
    title: "11. Privacy",
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
    title: "12. Changes to these terms",
    body: (
      <p>
        We may update these terms as the platform grows. The date at the top of this
        page always shows the current version, and we will notify you through the
        product or by email before significant changes take effect. Continuing to use
        RentMe after a change means you accept the updated terms.
      </p>
    ),
  },
  {
    title: "13. Governing law and disputes",
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
    title: "14. Contact",
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
