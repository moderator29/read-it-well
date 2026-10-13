import { plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { UnitsSplit } from "@/lib/workspace/dashboard-model";
import { DashCard, EmptyNote, Unavailable } from "./DashCard";

const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

export type Arc = { key: "let" | "vacant" | "other"; length: number; offset: number };

/**
 * The ring's arcs from the three counts: each arc's length is its share of the
 * circumference and each starts where the one before ended. A part with none
 * has no arc. The lengths add up to the whole ring when there is anything,
 * and to nothing when there is not (the caller then draws no ring at all).
 */
export function donutArcs(split: Pick<UnitsSplit, "let" | "vacant" | "other">, circumference = CIRCUMFERENCE): Arc[] {
  const total = split.let + split.vacant + split.other;
  if (total <= 0) return [];
  const out: Arc[] = [];
  let offset = 0;
  for (const key of ["let", "vacant", "other"] as const) {
    const n = split[key];
    if (n <= 0) continue;
    const length = (n / total) * circumference;
    out.push({ key, length, offset });
    offset += length;
  }
  return out;
}

/**
 * The owner's units as a ring: let, live and vacant, and everything else
 * (a draft, in review). Built from `my_buildings`, so it counts the owner's
 * rental listings and whether a paid tenancy is running on each. No units is
 * an empty note with a door to add one, never a ring of nothing; a read that
 * failed says so.
 */
export function UnitsDonut({
  split,
  t,
  locale,
  area,
}: {
  split: UnitsSplit | null;
  t: Dictionary;
  locale: Locale;
  area?: string;
}) {
  const w = t.workspaceDash;
  const u = w.owner.units;
  const title = u.title;
  if (split === null) {
    return (
      <DashCard title={title} area={area} testId="wsd-units">
        <Unavailable text={w.common.unavailable} />
      </DashCard>
    );
  }
  if (split.total === 0) {
    return (
      <DashCard title={title} area={area} testId="wsd-units">
        <EmptyNote title={u.empty} body={u.emptyBody} cta={{ href: "/agent/list", label: u.cta }} />
      </DashCard>
    );
  }
  const parts = [
    { key: "let", label: u.let, n: split.let },
    { key: "vacant", label: u.vacant, n: split.vacant },
    { key: "other", label: u.other, n: split.other },
  ] as const;
  return (
    <DashCard title={title} action={{ href: "/agent/listings", label: w.common.viewAll }} area={area} testId="wsd-units">
      <div className="wsd-donut">
        <div className="wsd-donut__ring">
          <svg className="wsd-donut__svg" viewBox="0 0 120 120" role="img" aria-label={`${title}: ${parts.map((p) => `${p.label} ${p.n}`).join(", ")}`}>
            <circle className="wsd-donut__track" cx="60" cy="60" r={R} />
            {donutArcs(split).map((arc) => (
              <circle
                key={arc.key}
                className={`wsd-donut__arc wsd-donut__arc--${arc.key}`}
                cx="60"
                cy="60"
                r={R}
                strokeDasharray={`${arc.length.toFixed(2)} ${(CIRCUMFERENCE - arc.length).toFixed(2)}`}
                strokeDashoffset={(-arc.offset).toFixed(2)}
              />
            ))}
          </svg>
          <div className="wsd-donut__centre" aria-hidden="true">
            <span className="wsd-donut__label">{plural(split.total, u.total, locale)}</span>
          </div>
        </div>
        <ul className="wsd-donut__legend">
          {parts.map((p) => (
            <li key={p.key} className="wsd-donut__item">
              <span className={`wsd-donut__swatch wsd-donut__swatch--${p.key}`} aria-hidden="true" />
              {p.label}
              <span className="wsd-donut__count">{p.n}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashCard>
  );
}
