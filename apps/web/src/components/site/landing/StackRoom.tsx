import Image from "next/image";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";
import { photo } from "@/lib/site/photos";
import { DemoStack, type StackCard } from "./DemoStack";
import { SectionHead } from "./SectionHead";

/**
 * "Hands on": four moments of a move, drawn from the product's own screens,
 * as a deck you can move by hand (`DemoStack`; the founder's reference 40).
 *
 * EVERY MOMENT SAYS "EXAMPLE". The listing, the viewing slots, the agent
 * and the move-in figures are illustrations of what the screens show, not
 * inventory, not a person and not a price anybody is asking; each carries
 * the Example mark in its own head, as every example card in the product
 * does (spec section 0, rule 5). The sentences under them are the product's
 * facts: two are the money constants verbatim (`NO_INSPECTION_FEE`,
 * `PAYMENT_GATE_SENTENCE`), the others say what the listing card and the
 * agent review already do.
 *
 * The move-in figures add up (N2.5m rent plus the four fees the listing
 * would state), so the example teaches the arithmetic honestly.
 */
const RENT = 2_500_000_00;
const FEES = { caution: 250_000_00, agency: 250_000_00, legal: 250_000_00, agreement: 50_000_00 } as const;
const TOTAL = RENT + FEES.caution + FEES.agency + FEES.legal + FEES.agreement;

export function StackRoom({ t, locale }: { t: Dictionary; locale: Locale }) {
  const s = t.landingRooms.stack;
  const u = s.ui;
  const naira = (minor: number) => <Amount minorUnits={minor} locale={locale} currency="NGN" className="nf-numeric" />;
  const example = (
    <span className="nf-badge nf-badge--example nf-mo__example">
      <UiIcon name="info" size={12} aria-hidden />
      {u.example}
    </span>
  );

  const parts: { key: keyof typeof FEES | "rent"; label: string; minor: number }[] = [
    { key: "rent", label: u.rent, minor: RENT },
    { key: "caution", label: u.caution, minor: FEES.caution },
    { key: "agency", label: u.agency, minor: FEES.agency },
    { key: "legal", label: u.legal, minor: FEES.legal },
    { key: "agreement", label: u.agreement, minor: FEES.agreement },
  ];

  const cards: StackCard[] = [
    {
      key: "listing",
      title: s.cards.listing.title,
      body: s.cards.listing.body,
      moment: (
        <div className="nf-mo nf-mo--listing">
          <div className="nf-mo__photo">
            <Image src={photo("villa-exterior-gate")} alt="" fill sizes="(max-width: 40rem) 70vw, 320px" draggable={false} />
            {example}
          </div>
          <div className="nf-mo__pad">
            <p className="nf-mo__title">{u.listingTitle}</p>
            <p className="nf-mo__meta">
              <UiIcon name="location" size={12} aria-hidden />
              {u.place}
            </p>
            <dl className="nf-mo__lines">
              <div>
                <dt>{u.rent}</dt>
                <dd>
                  {naira(RENT)}
                  <span className="nf-mo__per">{u.perYear}</span>
                </dd>
              </div>
              <div className="nf-mo__strong">
                <dt>{u.moveIn}</dt>
                <dd>{naira(TOTAL)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ),
    },
    {
      key: "viewing",
      title: s.cards.viewing.title,
      body: NO_INSPECTION_FEE,
      moment: (
        <div className="nf-mo nf-mo--pad">
          <div className="nf-mo__head">
            <p className="nf-mo__title">{u.viewing}</p>
            {example}
          </div>
          <p className="nf-mo__meta">
            <UiIcon name="calendar-booking" size={12} aria-hidden />
            {u.date}
          </p>
          <ul className="nf-mo__slots">
            {u.slots.map((slot, i) => (
              <li key={slot} data-chosen={i === 0 ? "true" : undefined}>
                <span className="nf-numeric">{slot}</span>
                <span>{i === 0 ? u.chosen : u.open}</span>
              </li>
            ))}
          </ul>
          <p className="nf-mo__ok">
            <UiIcon name="circle-check" size={16} aria-hidden />
            {u.noFee}
          </p>
        </div>
      ),
    },
    {
      key: "agent",
      title: s.cards.agent.title,
      body: s.cards.agent.body,
      moment: (
        <div className="nf-mo nf-mo--pad">
          <div className="nf-mo__head">
            <span className="nf-mo__person">
              <span className="nf-mo__avatar" aria-hidden="true">
                {u.agentInitials}
              </span>
              <span>
                <span className="nf-mo__title">{u.agentName}</span>
                <span className="nf-mo__meta">{u.agentRole}</span>
              </span>
            </span>
            {example}
          </div>
          <p className="nf-mo__ok">
            <UiIcon name="user-check" size={16} aria-hidden />
            {u.reviewed}
          </p>
          <ul className="nf-mo__rows">
            <li>
              <UiIcon name="home" size={16} aria-hidden />
              {u.named}
            </li>
            <li>
              <UiIcon name="messages" size={16} aria-hidden />
              {u.record}
            </li>
          </ul>
        </div>
      ),
    },
    {
      key: "pay",
      title: s.cards.pay.title,
      body: PAYMENT_GATE_SENTENCE,
      moment: (
        <div className="nf-mo nf-mo--pad">
          <div className="nf-mo__head">
            <p className="nf-mo__label">{u.moveIn}</p>
            {example}
          </div>
          <p className="nf-mo__figure">{naira(TOTAL)}</p>
          {/* The segmented bar (spec section 9): each segment its real share
              of the total, the rent in the brand blue and the fees in steps
              of it. */}
          <div className="nf-mo__bar" aria-hidden="true">
            {parts.map((p) => (
              <span key={p.key} data-part={p.key} style={{ flexGrow: p.minor }} />
            ))}
          </div>
          <ul className="nf-mo__legend">
            {parts.map((p) => (
              <li key={p.key} data-part={p.key}>
                <span className="nf-mo__dot" aria-hidden="true" />
                {p.label}
              </li>
            ))}
          </ul>
          <p className="nf-mo__ok">
            <UiIcon name="bank" size={16} aria-hidden />
            {u.bank}
          </p>
        </div>
      ),
    },
  ];

  return (
    <section className="nf-shell nf-room" data-chapter="stack" aria-labelledby="nf-landing-stack-title">
      {/* Centred over the deck on a phone; from 64rem the head sits to the
          left of the deck, top-aligned, so the room is one screen tall. */}
      <div className="nf-stack-room">
        <SectionHead id="nf-landing-stack-title" eyebrow={s.overline} title={s.title} lede={s.body} align="center" />
        <DemoStack
          cards={cards}
          labels={{ region: s.title, prev: s.prev, next: s.next, position: s.position, hint: s.hint }}
        />
      </div>
    </section>
  );
}
