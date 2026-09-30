import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DisclosureInline } from "@/components/app/DisclosureInline";
import { ListGroup } from "@/components/ui/ListGroup";
import { structuredDataJson } from "@/lib/listings/syndication";
import { faqItems } from "./faq-items";
import { SectionHead } from "./SectionHead";

/**
 * The landing FAQ (Track M). Every money answer is a `lib/money/copy.ts`
 * constant, verbatim (faq-items.ts). Each question is the shared inline
 * disclosure (`DisclosureInline`, plan item 30): a `<details>` that opens
 * with scripts off, its panel easing over 240ms while the chevron turns, on
 * the one motion in list-group.css; reduced motion, Calm and Off are
 * instant. Each group is one `ListGroup` card with inset dividers.
 *
 * The same questions go out as FAQPage structured data, so what a search
 * engine quotes is exactly what the page says. The block carries the CSP
 * nonce for the reason the listing page gives: `script-src` is nonce-based.
 */
/**
 * The three groups, by the items' keys. A key missing from every group
 * would drop a question, so the last group takes whatever is left over
 * (`leftovers` below keeps the list complete if a question is added).
 */
const FAQ_GROUP_KEYS = {
  property: ["what", "inspection", "lister", "list"],
  stays: ["stays", "ai", "apps"],
  money: ["pay", "guarantee", "payout", "refund", "report"],
} as const;

type FaqGroupId = keyof typeof FAQ_GROUP_KEYS;

const GROUPED: ReadonlySet<string> = new Set(Object.values(FAQ_GROUP_KEYS).flat());

export function LandingFaq({ t, nonce }: { t: Dictionary; nonce?: string }) {
  const f = t.landingRooms.faq;
  const items = faqItems(t);
  const leftovers = items.filter((item) => !GROUPED.has(item.key)).map((item) => item.key);
  const FAQ_GROUPS: { id: FaqGroupId; keys: readonly string[] }[] = [
    { id: "property", keys: FAQ_GROUP_KEYS.property },
    { id: "stays", keys: FAQ_GROUP_KEYS.stays },
    { id: "money", keys: [...FAQ_GROUP_KEYS.money, ...leftovers] },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <section className="nf-shell nf-room" data-chapter="faq" aria-labelledby="nf-landing-faq-title">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: structuredDataJson(jsonLd) }} />
      <div className="nf-faq-room">
        <div className="nf-faq-head">
          <SectionHead id="nf-landing-faq-title" eyebrow={f.overline} title={f.title} lede={f.body}>
            <Link href="/help" prefetch={false} className="nf-room-link mt-heading">
            {f.help}
            <UiIcon name="arrow-right" size={16} aria-hidden />
          </Link>
          </SectionHead>
        </div>
        {/* ONE LISTGROUP CARD PER GROUP, INSET DIVIDERS (UIUX items 11 and
            30): the twelve questions under three labels taken from the items'
            own keys. The structured data above is the flat list, unchanged. */}
        <MotionReveal className="nf-faq-groups">
          {FAQ_GROUPS.map((group) => {
            const rows = group.keys
              .map((key) => items.find((item) => item.key === key))
              .filter((item): item is (typeof items)[number] => Boolean(item));
            if (rows.length === 0) return null;
            return (
              <ListGroup key={group.id} label={f.groups[group.id]} className="nf-faq-group">
                {rows.map((item) => (
                  <li key={item.key} className="nf-list-item">
                    <DisclosureInline title={item.q} titleClassName="nf-faq-q" className="nf-faq-item">
                      <p className="nf-faq-a">{item.a}</p>
                    </DisclosureInline>
                  </li>
                ))}
              </ListGroup>
            );
          })}
        </MotionReveal>
      </div>
    </section>
  );
}
