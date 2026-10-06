import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { intlTag } from "@vallo/i18n/core";
import { CountUp } from "@/components/motion/CountUp";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { panelClass } from "@/components/ui/Panel";
import { ConsoleStatus } from "./chip-state";
import { DESKS, type OverviewCounts } from "./ConsoleOverview";
import "./admin-material.css";

/**
 * WHAT IS WAITING ON A PERSON: THE OVERVIEW'S FIRST ANSWER (north star 10 I
 * and 16.6, "Admin desk: queue counts" before "each queue").
 *
 * An overview answers "what needs me". So it leads with the queues as figures:
 * one tile per desk, the count as the biggest thing on the tile, counting up
 * once as the page arrives (620ms, `glide`, off under reduced motion), the
 * desk's own name above it and a status chip under it that says, in a word and
 * a shape and a colour, whether anything is waiting. The whole tile is one
 * link into the desk that clears it, so a thumb has one 44px-or-taller target
 * per queue and nothing smaller.
 *
 * EVERY NUMBER IS A DATABASE COUNT. The counts are `getQueueCounts`, the same
 * exact reads the rail's badges draw, so the tiles and the rail cannot
 * disagree. Nothing here sums anything the read did not return except the one
 * total, which is the arithmetic of the tiles beside it printed once. A zero
 * is drawn as a zero with the neutral "nothing waiting" chip: it is a fact an
 * operator wants, and it does not claim a queue was cleared (that is
 * `queue-empty.ts`'s distinction, and a count cannot tell which it is).
 *
 * When the counts could not be read the section says so in words and draws no
 * figures, because an operator who sees eight zeros goes home.
 *
 * MATERIAL. Card tier at the figure radius (22), one hairline edge, no glow.
 * The total leads as the one larger tile; no Island here, because the overview
 * already has its one lit surface in the strip below.
 */
export function QueueFigures({
  t,
  locale,
  counts,
}: {
  t: Dictionary;
  locale: Locale;
  counts: OverviewCounts | null;
}) {
  const o = t.admin.overview;
  const x = t.experienceAdmin.shell;
  const tag = intlTag[locale];
  const total = counts ? DESKS.reduce((sum, desk) => sum + counts[desk.key], 0) : 0;

  return (
    <section aria-labelledby="ov-waiting-title" className="nf-admin-figures">
      <header className="nf-admin-figures__head">
        <h2 id="ov-waiting-title" className="nf-admin-panel__title">
          {x.overviewLead}
        </h2>
        <p className="nf-admin-figures__note">{counts ? x.overviewLeadBody : x.overviewUnread}</p>
      </header>
      {counts ? (
        <ul className="nf-admin-figures__grid">
          <li className="nf-admin-figures__lead">
            <div className={panelClass({ variant: "card", className: "nf-panel--figure nf-admin-figure nf-admin-figure--total" })}>
              <p className="nf-overline">{x.overviewWaiting}</p>
              <p className="nf-admin-figure__value">
                {total > 0 ? <CountUp value={total} tag={tag} eager /> : <span className="nf-numeric">0</span>}
              </p>
              <p className="nf-admin-figure__lede">
                {total > 0 ? x.overviewTotal.replace("{count}", new Intl.NumberFormat(tag).format(total)) : x.overviewTotalNone}
              </p>
            </div>
          </li>
          {DESKS.map((desk) => {
            const copy = o.tiles[desk.key];
            const count = counts[desk.key];
            return (
              <li key={desk.key}>
                <Link
                  href={desk.href}
                  className={panelClass({ variant: "card", className: "nf-panel--figure nf-admin-figure nf-admin-figure--link" })}
                >
                  <span className="nf-admin-figure__top">
                    <UiIcon name={desk.icon} size={20} className="nf-admin-figure__glyph" />
                    <span className="nf-admin-figure__label">{copy.label}</span>
                  </span>
                  <span className="nf-admin-figure__value">
                    {count > 0 ? <CountUp value={count} tag={tag} eager /> : <span className="nf-numeric">0</span>}
                  </span>
                  <span className="nf-admin-figure__foot">
                    <ConsoleStatus tone={count > 0 ? "warning" : "neutral"} size="xs">
                      {count > 0 ? x.overviewWaiting : x.overviewClear}
                    </ConsoleStatus>
                    <UiIcon name="chevron-right" size={16} className="nf-admin-figure__chev" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
