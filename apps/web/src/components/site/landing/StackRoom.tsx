import Image from "next/image";
import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { IconPlate } from "@/components/ui/IconPlate";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { passportLines, type PassportFacts, type PassportLine } from "@/lib/trust/passport";
import { SUPPLY_DOORS } from "@/lib/site/supply-doors";
import { photo } from "@/lib/site/photos";
import { EXAMPLE_MOVE_IN } from "./example-move-in";

/**
 * THE LANDING'S EXAMPLE MOMENTS: what the product's own screens show, drawn
 * with the product's own components, one per layer of the platform band
 * (`SpaceOsBand.tsx`).
 *
 * This file used to be "Hands on", a deck of four moments you moved by hand.
 * The deck is gone with the platform band, which shows the same moments one
 * layer at a time at a fraction of the height (the landing's height ceiling
 * is a ratchet, perf-budget.json). The name stays because
 * `components/app/listing/example-notice.test.ts` reads this file to prove
 * the rule that matters here, and the rule is unchanged:
 *
 * EVERY MOMENT SAYS "EXAMPLE". The flat, the passport, the conversation, the
 * gate and the desk are illustrations of what the screens show, not
 * inventory, not a person and not a price anybody is asking; each carries the
 * Example mark in its own head, as every example card in the product does
 * (spec section 0, rule 5). They are built from what is real: the passport's
 * lines come out of `passportLines`, the function the real passport is drawn
 * with, fed example facts; the desk's rows are the supply page's example
 * desk; the figures are the one example flat (`example-move-in.ts`); the
 * gate's words are the journey's product labels. No trust signal is drawn on
 * an example: no Verified mark anywhere in this file.
 */

/* The example renter's facts: activity only (attended inspections, a tenancy,
   a member-since date). NO IDENTITY SIGNAL is drawn for an invented person
   (D24): no phone confirmed and no NIMC match, so the example never shows a
   check a person did not earn. Labelled Example on the credential. */
const EXAMPLE_PASSPORT: PassportFacts = {
  phoneConfirmed: false,
  nimcMatchedAt: null,
  inspectionsAttended: 3,
  tenancies: 1,
  memberSince: "2026-03-02T09:00:00Z",
};

const PASSPORT_GLYPH: Record<PassportLine["key"], UiIconName> = {
  phone: "phone",
  nimc: "id-card",
  attended: "calendar-check",
  tenancies: "house",
  since: "clock",
};

/* The example desk's states (`lib/site/supply-doors.ts` words them), as the
   chip's state: waiting on somebody is pending, done is success, a draft is
   no state yet. A word not listed here is drawn neutral, never green. */
const DESK_STATE: Record<string, ChipState> = { New: "pending", Booked: "success", Confirmed: "success", Draft: "neutral" };

export type LandingMoments = Record<"discover" | "trust" | "intelligence" | "transactions" | "operations", ReactNode>;

export function landingMoments(t: Dictionary, locale: Locale): LandingMoments {
  const u = t.landingRooms.stack.ui;
  const j = t.landingRooms.journey.screen;
  const ai = t.landingRooms.ai;
  const example = (
    <span className="nf-badge nf-badge--example nf-mo__example">
      <UiIcon name="info" size={12} aria-hidden />
      {u.example}
    </span>
  );
  const passport = t.trustVisible.passport;
  const lines = passportLines(EXAMPLE_PASSPORT, passport, locale);
  const [script] = ai.scripts;
  const desk = SUPPLY_DOORS.agent.example;

  const moments: { key: keyof LandingMoments; moment: ReactNode }[] = [
    {
      key: "discover",
      moment: (
        <div className="nf-mo nf-mo--listing">
          <div className="nf-mo__photo">
            <Image src={photo("villa-exterior-gate")} alt="" fill sizes="(max-width: 40rem) 80vw, 340px" />
            {example}
          </div>
          <div className="nf-mo__pad">
            <p className="nf-mo__title">{u.listingTitle}</p>
            <p className="nf-mo__meta">
              <UiIcon name="location" size={12} aria-hidden />
              {u.place}
            </p>
            {/* The product's order: the move-in total leads, the rent is
                beneath it (north star 10 B and C). */}
            <dl className="nf-mo__lines">
              <div className="nf-mo__strong">
                <dt>{u.moveIn}</dt>
                <dd>
                  <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" />
                </dd>
              </div>
              <div>
                <dt>{u.rent}</dt>
                <dd>
                  <Amount minorUnits={EXAMPLE_MOVE_IN.rent} locale={locale} currency="NGN" className="nf-numeric" />
                  <span className="nf-mo__per">{u.perYear}</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ),
    },
    {
      key: "trust",
      /* THE SPACE PASSPORT, DEMONSTRATED (north star 14.4; D14). A credential
         at the plate proportion, matte navy, radius 18: never a bank card, so
         no chip, no network mark and no long number. Its facts are dates and
         counts, never ticks (north star 12, point 15). */
      moment: (
        <div className="nf-mo nf-mo--passport">
          <div className="nf-mo__head">
            <span className="nf-mo__person">
              <span className="nf-mo__seal" aria-hidden="true">
                <LogoMark size={22} />
              </span>
              <span>
                <span className="nf-mo__title">{passport.title}</span>
                <span className="nf-mo__meta">{passport.subtitle}</span>
              </span>
            </span>
            {example}
          </div>
          <ul className="nf-mo__facts">
            {lines.map((line) => (
              <li key={line.key}>
                <IconPlate size="sm" shape="round" tone="brand">
                  <UiIcon name={PASSPORT_GLYPH[line.key]} size={16} />
                </IconPlate>
                <span>{line.text}</span>
              </li>
            ))}
          </ul>
          <p className="nf-mo__foot">
            <UiIcon name="lock" size={16} aria-hidden />
            {t.experienceLanding.os.passportShown}
          </p>
        </div>
      ),
    },
    {
      key: "intelligence",
      /* The assistant's first example exchange, still: the question, then the
         answer, which says only what the assistant is told to do. Nothing
         types itself or loops (MOTION_SYSTEM section 1, principle 10). */
      moment: (
        <div className="nf-mo nf-mo--pad nf-mo--chat">
          <div className="nf-mo__head">
            <p className="nf-mo__label">{ai.caption}</p>
            {example}
          </div>
          <p className="nf-mo__bubble nf-mo__bubble--you">
            <span className="sr-only">{ai.you}: </span>
            {script?.user}
          </p>
          <div className="nf-mo__reply">
            <span className="nf-mo__bot" aria-hidden="true">
              <UiIcon name="bot" size={16} />
            </span>
            <p className="nf-mo__bubble">
              <span className="nf-mo__who">{ai.name}</span>
              {script?.reply}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "transactions",
      /* THE GATE, AS A PATH WITH STATES (reference 7110's progress path):
         each step's state as a StatusChip (word, shape and colour), then the
         move-in total and where the money goes. A drawing of the order the
         product enforces, not a live payment, so nothing ticks on a timer. */
      moment: (
        <div className="nf-mo nf-mo--pad">
          <div className="nf-mo__head">
            <p className="nf-mo__label">{u.moveIn}</p>
            {example}
          </div>
          <ol className="nf-mo__path">
            <li>
              <span className="nf-mo__step">
                <UiIcon name="calendar-booking" size={16} aria-hidden />
                {j.inspection}
              </span>
              <StatusChip state="success">{j.booked}</StatusChip>
            </li>
            <li>
              <span className="nf-mo__step">
                <UiIcon name="document" size={16} aria-hidden />
                {`${j.you} · ${j.owner}`}
              </span>
              <StatusChip state="success">{j.approved}</StatusChip>
            </li>
            <li>
              <span className="nf-mo__step">
                <UiIcon name="banknote" size={16} aria-hidden />
                <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" />
              </span>
              <StatusChip state="success">{j.paid}</StatusChip>
            </li>
          </ol>
          <p className="nf-mo__ok">
            <UiIcon name="bank" size={16} aria-hidden />
            {j.theirBank}
          </p>
        </div>
      ),
    },
    {
      key: "operations",
      /* The supply page's example desk, the same rows: what needs the lister
         today, each with its state as a word. */
      moment: (
        <div className="nf-mo nf-mo--pad">
          <div className="nf-mo__head">
            <p className="nf-mo__label">{t.experienceLanding.os.deskLabel}</p>
            {example}
          </div>
          <ul className="nf-mo__desk">
            {desk.map((row) => (
              <li key={row.title}>
                <IconPlate size="sm" tone="neutral">
                  <UiIcon name="document" size={16} />
                </IconPlate>
                <span className="nf-mo__desk-text">
                  <span className="nf-mo__desk-title">{row.title}</span>
                  <span className="nf-mo__meta">{row.sub}</span>
                </span>
                <StatusChip state={DESK_STATE[row.value] ?? "neutral"}>{row.value}</StatusChip>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  return Object.fromEntries(moments.map((m) => [m.key, m.moment])) as LandingMoments;
}
