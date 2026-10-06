import "./streaks.css";
import type { Dictionary } from "@vallo/i18n/core";
import { CountUp } from "@/components/motion/CountUp";
import { keptCount, STREAK_UNIT, visibleMarks, type Streak } from "./streak-model";

/**
 * THE STREAK TILE (north star 15.1, D17): on the dashboard and the passport.
 *
 * The streak's name, quiet, above; the count as a figure that counts up once
 * on arrival (motion 4, `CountUp`); the unit beneath it in words; the current
 * window as a row of small marks; the best run, quietly, beside.
 *
 *   kept     a filled mark
 *   missed   a hollow mark, the same ink. A break is quiet: no red, no
 *            flame, no animation of loss. The count simply restarts.
 *   open     a dashed mark: a window still to come
 *
 * PAUSED SAYS PAUSED. A paused streak keeps its count on screen, carries the
 * word Paused beside its name, and one line saying the record is kept, because
 * not needing a home this month is not a failure.
 *
 * Rendered only where a page holds a real `Streak` from Session 2 (W7-R6),
 * which today is nowhere. A Card at the figure radius, one edge (the tier
 * shadow). Server-safe; `CountUp` is the only client leaf.
 */
export function StreakTile({
  streak,
  t,
  tag,
}: {
  streak: Streak;
  t: Dictionary;
  tag: string;
}) {
  const s = t.experienceFeatures.streaks;
  const paused = streak.state === "paused";
  const marks = visibleMarks(streak.window);
  const { kept, total } = keptCount(streak.window);
  return (
    <article className="nf-streak" data-paused={paused ? "" : undefined}>
      <header className="nf-streak__head">
        <h3 className="nf-streak__name">{s.name[streak.kind]}</h3>
        {paused ? <span className="nf-streak__paused">{s.paused}</span> : null}
      </header>
      <p className="nf-streak__figure">
        <CountUp value={streak.current} tag={tag} />
      </p>
      <p className="nf-streak__unit">{s.unit[STREAK_UNIT[streak.kind]]}</p>
      {marks.length > 0 ? (
        <ol
          className="nf-streak__marks"
          aria-label={s.window.replace("{kept}", String(kept)).replace("{total}", String(total))}
        >
          {marks.map((mark, index) => (
            <li key={index} className="nf-streak__mark" data-mark={mark} />
          ))}
        </ol>
      ) : null}
      <p className="nf-streak__foot">
        {paused ? s.pausedWhy : s.best.replace("{count}", new Intl.NumberFormat(tag).format(streak.best))}
      </p>
    </article>
  );
}
