import Image from "next/image";
import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Words } from "@/components/site/Words";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * One account, and everything a property transaction needs inside it.
 *
 * THE SECOND HALF OF THE MARKETPLACE ARGUMENT. `MarketsBand` says what you can
 * find here; this says what you can DO here, and together they are the reason
 * somebody stays. A marketplace that only lists things is a noticeboard. What
 * makes this one is that the search, the conversation, the money, the
 * agreement and the record are the same account.
 *
 * EVERY LINE IS BUILT AND REACHABLE TODAY, and that is the whole discipline of
 * this section. The wallet, the pots, the assistant, the messaging, the
 * verification ladder and the four languages all exist in the tree. Crypto
 * top-ups exist too, through Yellow Card, and are feature-flagged, which is
 * why their line says "where it is switched on" rather than implying a button
 * everybody can already see. Nothing here describes a plan. The plan has its
 * own place, in the section below, clearly labelled as one.
 */
export function OneAccountBand({ t }: { t: Dictionary }) {
  const rows: { icon: BrandIconName; title: string; body: string }[] = [
    { icon: "wallet-secure", ...t.landing.oneAccount.points.wallet },
    { icon: "savings-pot", ...t.landing.oneAccount.points.savings },
    { icon: "bot", ...t.landing.oneAccount.points.assistant },
    { icon: "chat-duo", ...t.landing.oneAccount.points.messages },
    { icon: "user-verified", ...t.landing.oneAccount.points.verified },
    { icon: "contract-sign", ...t.landing.oneAccount.points.record },
  ];

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-oneaccount-title">
      <div className="grid gap-block lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal className="max-w-[52ch]">
          <span className="nf-overline">{t.landing.oneAccount.overline}</span>
          <h2 id="nf-oneaccount-title" className="nf-h1 mt-row">
            <Words text={t.landing.oneAccount.title} accentFrom={2} />
          </h2>
          <p className="nf-lede mt-group">{t.landing.oneAccount.body}</p>

          {/* The scene carries its own plinth: no card, no tile. */}
          <Image
            src="/brand/glass/hero/hero-app.png"
            alt=""
            aria-hidden="true"
            width={557}
            height={470}
            sizes="(max-width: 1024px) 280px, 400px"
            className="mt-block hidden h-auto w-full max-w-[400px] lg:block"
          />
        </Reveal>

        <ul className="grid gap-group sm:grid-cols-2">
          {rows.map((row, i) => (
            <Reveal as="li" key={row.title} delay={i * 45}>
              <div className="nf-card flex h-full items-start gap-group p-card">
                <span className="h-12 w-12 shrink-0">
                  <BrandIcon name={row.icon} fill />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                    {row.title}
                  </span>
                  <span className="mt-3xs block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {row.body}
                  </span>
                </span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
