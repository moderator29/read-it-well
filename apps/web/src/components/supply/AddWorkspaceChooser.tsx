"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { TYPE } from "@/components/app/Screen";
import { SUPPLY_DOOR_ORDER, STAYS_DOOR_ORDER } from "@/lib/supply/roles";
import type { Side } from "@/lib/side.constants";

/**
 * ADD A WORKSPACE, and it is the door this platform did not have.
 *
 * `GOVERNING-02` is the target, all three screens: the three supplier doors,
 * the selected state with its one primary control, and the "what we will ask
 * you for" overview.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS REPLACES A CHOOSER THAT ALREADY EXISTED
 *
 * `/profile/setup` offered TWO cards, "List or sell your own property" and
 * "Work as an agent or estate manager", and the navigation offered one row
 * into it reading "Become an agent". A landlord with one flat in Bwari is not
 * becoming an agent and never will be, and the product was correctly showing
 * him the door rather than the room: there is exactly one `agents` row in the
 * whole database and it is the example lister.
 *
 * So the doors are named in the first person, as a person would say them about
 * themselves, and the owner is FIRST, because owner direct supply is the thing
 * this direction exists to build.
 *
 * ---------------------------------------------------------------------------
 * WHAT WE WILL ASK YOU FOR, BEFORE ANYTHING IS ASKED
 *
 * The second screen is a checklist and that is deliberate. "A short
 * application, then a government issued ID and proof the property is yours" is
 * a sentence somebody skims; the same facts as four rows is a list somebody can
 * look at their desk and CHECK against, which is the actual decision being
 * made here: do I have this to hand now, or do I come back later.
 *
 * The owner's list says there is an honest answer for somebody who holds no
 * document, because over nine in ten Nigerian landlords hold none and a form
 * that does not say so is a form they abandon. No figure is printed: both
 * titling numbers rest on a search summary rather than a primary source and a
 * lawyer confirms them before any number becomes copy.
 *
 * ---------------------------------------------------------------------------
 * WHERE EACH DOOR GOES TODAY, STATED PLAINLY RATHER THAN IMPLIED
 *
 * The owner door opens the owner application. THE AGENT AND FIRM DOORS BOTH
 * OPEN THE PROFESSIONAL APPLICATION, and that is the ruling rather than a
 * shortcut: a firm's proof set is a SUPERSET of an individual agent's, and a
 * superset is a branch inside one form. That form already asks "do you have a
 * registered business?" and grows from five steps to six on a yes. The three
 * forms drawn in `GOVERNING-03`, `04` and `05` are the next piece of this
 * track and are not built; the chooser carries the answer forward in the URL
 * so that when they are, nothing here changes.
 */

const DOOR_ICON: Record<string, UiIconName> = {
  owner: "home",
  agent: "key",
  firm: "building-apartment",
  hotel: "building-hotel",
  shortlet: "bed",
  restaurant: "utensils",
};

/** The overview's four rows, which are the same four questions for every door. */
const OVERVIEW_ICONS: UiIconName[] = ["user", "location", "document", "history"];

export function AddWorkspaceChooser({ t, side }: { t: Dictionary; side: Side }) {
  const router = useRouter();
  const doors: readonly string[] =
    side === "stays" ? STAYS_DOOR_ORDER : SUPPLY_DOOR_ORDER;

  const [chosen, setChosen] = useState<string | null>(null);
  const [step, setStep] = useState<"choose" | "overview">("choose");

  const copy = t.supply.chooser;
  const doorCopy = (id: string) =>
    t.supply.doors[id as keyof typeof t.supply.doors];

  function onContinue() {
    if (!chosen) return;
    if (step === "choose") {
      setStep("overview");
      return;
    }
    router.push(hrefFor(chosen, side));
  }

  const overviewRows = chosen
    ? doorCopy(chosen).needs.map((need, index) => ({
        /* The fourth row of the render is a clock over "it should not take
           long", so the fourth glyph is the clock whatever the fourth need
           says, and any fifth need takes the document glyph. */
        icon: OVERVIEW_ICONS[Math.min(index, OVERVIEW_ICONS.length - 1)] ?? "document",
        label: need,
      }))
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      {/*
        THE PROGRESS ROW: small filled rectangles, which is how every screen in
        the governing set draws progress. Rectangles and not dots, because the
        set draws rectangles, and `aria-hidden` because the heading below
        already says where you are and a screen reader counting bars is noise.
      */}
      <div className="nf-steprow" aria-hidden="true">
        <span className="nf-steprow__bar" data-on="true" />
        <span className="nf-steprow__bar" data-on={step === "overview" || undefined} />
        <span className="nf-steprow__bar" />
      </div>

      {/* The page's own `PageHeader` carries the h1, so this is the second
          level: the overview is a step WITHIN "Add a workspace" rather than a
          separate page, and two h1s on one screen is a heading order a screen
          reader cannot make sense of. */}
      {step === "overview" && (
        <h2 className={`mt-heading ${TYPE.sectionTitle}`}>{copy.overviewTitle}</h2>
      )}
      <p className={`mt-inline-tight max-w-[52ch] ${TYPE.body}`}>
        {step === "overview" ? copy.overviewSub : copy.sub}
      </p>

      {step === "choose" ? (
        <ul className="mt-heading grid gap-group">
          {doors.map((id) => {
            const door = doorCopy(id);
            const selected = chosen === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setChosen(id)}
                  aria-pressed={selected}
                  className="nf-door"
                  data-on={selected || undefined}
                >
                  <span className="nf-door__mark" aria-hidden="true">
                    <UiIcon name={DOOR_ICON[id] ?? "home"} size="lg" />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className={`block ${TYPE.rowTitle}`}>{door.title}</span>
                    <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{door.blurb}</span>
                  </span>
                  {/* The tick replaces the chevron on the chosen one, exactly
                      as the render's second screen draws it. */}
                  <UiIcon
                    name={selected ? "verified" : "chevron-right"}
                    size={selected ? "md" : "sm"}
                    filled={selected || undefined}
                    className={
                      selected
                        ? "shrink-0 text-[var(--nf-status-verified)]"
                        : "shrink-0 text-[var(--nf-content-muted)]"
                    }
                    label={selected ? copy.selected : undefined}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <ul className="mt-heading grid gap-group">
            {overviewRows.map((row) => (
              <li key={row.label} className="nf-door nf-door--calm">
                <span className="nf-door__mark" aria-hidden="true">
                  <UiIcon name={row.icon} size="md" />
                </span>
                <span className={`min-w-0 flex-1 ${TYPE.body}`}>{row.label}</span>
              </li>
            ))}
          </ul>

          {/*
            THE CALM EXPLANATORY PANEL with its small round glyph, which
            appears on almost every screen in the governing set. It is the one
            round thing on this surface and it is a GLYPH, not a control, so
            the shape law does not reach it.
          */}
          {chosen && (
            <div className="nf-calmpanel">
              <span className="nf-calmpanel__glyph" aria-hidden="true">
                <UiIcon name="history" size="sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>{copy.howLongTitle}</span>
                <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>
                  {doorCopy(chosen).howLong}
                </span>
              </span>
            </div>
          )}
        </>
      )}

      {/* The primary appears only once a door is chosen, which is the render's
          own second screen: three quiet cards, then one lit control. */}
      {chosen && (
        <div className="mt-heading flex flex-col gap-inline">
          <Button onClick={onContinue} variant="primary" size="lg" full>
            {copy.continueLabel}
          </Button>
          {step === "overview" && (
            <Button onClick={() => setStep("choose")} variant="ghost" size="md" full>
              {copy.back}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Where a door goes, in one function, so the chooser and any later caller
 * cannot disagree about it.
 *
 * The answer is carried in the URL for the two property doors that share one
 * form, so the form can branch on it the day the three forms land without the
 * chooser changing.
 */
export function hrefFor(door: string, side: Side): string {
  if (side === "stays") return `/host/apply?door=${door}`;
  if (door === "owner") return "/profile/setup/owner";
  return `/profile/setup/professional?door=${door}`;
}
