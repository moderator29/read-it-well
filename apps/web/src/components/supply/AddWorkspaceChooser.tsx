"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { TYPE } from "@/components/app/Screen";
import { SUPPLY_DOOR_ORDER, STAYS_DOOR_ORDER } from "@/lib/supply/roles";
import type { Side } from "@/lib/side.constants";
import { hrefFor } from "./AddWorkspaceChooser.href";

export { hrefFor };

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
 * WHERE EACH DOOR GOES, STATED PLAINLY RATHER THAN IMPLIED
 *
 * All three property doors now open their own form: `GOVERNING-03` for the
 * owner, `04` for the agent, `05` for the firm. B1 wrote this comment when
 * only the first of those existed and the other two fell through to the
 * professional application, and it carried the chosen door forward in the URL
 * so that nothing here would have to change when they landed. They have
 * landed, and the answer is now the route rather than a query string.
 *
 * `/profile/setup/professional` is untouched and still serves the six step
 * application, which several older surfaces still link to.
 */

/**
 * THE OBJECT ON EACH DOOR'S PLATE, AND IT IS A GLASS OBJECT RATHER THAN A LINE
 * ICON.
 *
 * `GOVERNING-02` draws a lit three dimensional house, key and building sitting
 * on the three plates, which is the icon style the whole reference set is
 * built from. What shipped was the flat `UiIcon` outline, which is the right
 * mark in a row of text and the wrong one on a plate this size: the render's
 * door is an OBJECT you are being offered, and a 24px stroke drawing does not
 * read as one.
 *
 * NONE OF THE SIX HAS A LIGHT TWIN, and that is checked rather than assumed.
 * A row holding one twinned object and one untwinned one is two artwork
 * families side by side the moment somebody opens it in daylight, which is
 * exactly what `--twin-sweep` exists to catch. All six are untwinned, so the
 * set agrees with itself in both themes.
 */
const DOOR_OBJECT: Record<string, BrandIconName> = {
  owner: "home-ring",
  agent: "key-ring",
  firm: "apartment-block",
  hotel: "hotel",
  shortlet: "shortlet",
  /* The nearest object this set holds. There is no restaurant in the glass
     library and one needs commissioning; a bell on a desk is at least the
     right room, and it is untwinned like the five above it. */
  restaurant: "concierge-bell",
};

/**
 * THE OBJECT ON EACH OVERVIEW ROW.
 *
 * `GOVERNING-02` screen three draws a glass object on a plate beside every
 * line, and then a clock beside the timing. The clock is NOT in this list: the
 * timing is the calm panel below the rows, which is where the image puts it,
 * and an earlier pass had the clock landing on "a Nigerian bank account in
 * your own name" because the list was clamped to its last entry.
 *
 * The rows are free text and they differ per door, so this is positional and
 * approximate by construction: who you are, what proves who you are, what you
 * hold, and the account the money lands in. It is clamped to the document
 * rather than to the wallet, because a door with more rows than this is asking
 * for more paperwork and never for more accounts.
 *
 * All four are untwinned, like the six doors, so the column is one artwork
 * family in both themes.
 */
const OVERVIEW_OBJECTS: BrandIconName[] = [
  "user-check",
  /* `id-card-check` and not `person-card`: the latter is the library's flat
     outline family and stands beside three solid glass objects as a different
     material in both themes. It is the one twinned object in this column and
     that is a paper nuance rather than a both-themes fault, so it loses to
     the artwork family. See the note on the agent form's identity cards. */
  "id-card-check",
  "doc-shield",
  "wallet-naira",
];
const OVERVIEW_FALLBACK: BrandIconName = "doc-shield";

export function AddWorkspaceChooser({ t, side }: { t: Dictionary; side: Side }) {
  const router = useRouter();
  /*
   * UX-05: BOTH SETS OF DOORS, ALWAYS, in two labelled groups. The chooser
   * used to show the property doors or the stays doors depending on an
   * invisible side cookie, so a landlord who had last tapped a shortlet could
   * not find "I own the property". The current side's group comes first; the
   * other is never hidden.
   */
  const groups: { key: Side; title: string; doors: readonly string[] }[] = [
    { key: "property", title: t.supply.chooser.groupProperty, doors: SUPPLY_DOOR_ORDER },
    { key: "stays", title: t.supply.chooser.groupStays, doors: STAYS_DOOR_ORDER },
  ];
  if (side === "stays") groups.reverse();

  const [chosen, setChosen] = useState<string | null>(null);
  const [step, setStep] = useState<"choose" | "overview">("choose");

  const copy = t.supply.chooser;
  const doorCopy = (id: string) => t.supply.doors[id as keyof typeof t.supply.doors];

  function onContinue() {
    if (!chosen) return;
    if (step === "choose") {
      setStep("overview");
      return;
    }
    router.push(hrefFor(chosen));
  }

  const overviewRows = chosen
    ? doorCopy(chosen).needs.map((need, index) => ({
        /* The fourth row of the render is a clock over "it should not take
           long", so the fourth glyph is the clock whatever the fourth need
           says, and any fifth need takes the document glyph. */
        object: OVERVIEW_OBJECTS[index] ?? OVERVIEW_FALLBACK,
        label: need,
      }))
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      {/*
        THE HEADER THE IMAGE DRAWS, AND IT IS NOT THE ONE THIS PAGE HAD.

        `GOVERNING-02` puts a bare back control on its own row, then the
        progress row, then the screen's name in DISPLAY type, then one
        supporting line. The route used to hand that name to `PageHeader`,
        which sets it small on the top row beside the back square, so the
        loudest thing in the image was the quietest thing on the page, and the
        overview step then carried a second, smaller heading underneath it.

        So the chooser owns its whole top, exactly as `RegisterShell` owns the
        top of the three forms this screen leads into, and for the same reason:
        one anatomy across the four screens of one flow. ONE BACK CONTROL, and
        it steps back to the doors from the overview and leaves the chooser
        from the doors, which is what a person pressing it expects.
      */}
      <div className="mb-heading flex items-center">
        <button
          type="button"
          aria-label={copy.back}
          onClick={() => (step === "overview" ? setStep("choose") : router.push("/profile"))}
          className="nf-icon-btn nf-icon-btn--glass h-11 w-11 shrink-0"
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
      </div>

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

      <h1 className={`mt-heading ${TYPE.display}`}>
        {step === "overview" ? copy.overviewTitle : copy.title}
      </h1>
      <p className={`mt-inline-tight max-w-[52ch] ${TYPE.bodyLg}`}>
        {step === "overview" ? copy.overviewSub : copy.sub}
      </p>

      {step === "choose" ? (
        groups.map((group) => (
          <section key={group.key} aria-labelledby={`doors-${group.key}`} className="mt-heading">
            <h2 id={`doors-${group.key}`} className={TYPE.rowTitle}>
              {group.title}
            </h2>
            <ul className="mt-inline grid gap-group">
              {group.doors.map((id) => {
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
                        <BrandIcon name={DOOR_OBJECT[id] ?? "home-ring"} size={44} />
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className={`block ${TYPE.rowTitle}`}>{door.title}</span>
                        <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{door.blurb}</span>
                      </span>
                      {/* The tick replaces the chevron on the chosen one, exactly
                          as the render's second screen draws it. */}
                      {/* The circular badge and not the shield, for the reason
                          `ProfileSwitcher` gives: the shield means a checked
                          listing in this product and a mark means one thing. */}
                      <UiIcon
                        name={selected ? "verified-badge" : "chevron-right"}
                        size={selected ? "lg" : "sm"}
                        className={
                          selected
                            ? "shrink-0 text-[var(--nf-brand-primary)]"
                            : "shrink-0 text-[var(--nf-content-muted)]"
                        }
                        label={selected ? copy.selected : undefined}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      ) : (
        <>
          <ul className="mt-heading grid gap-group">
            {overviewRows.map((row) => (
              <li key={row.label} className="nf-door nf-door--calm">
                <span className="nf-door__mark" aria-hidden="true">
                  <BrandIcon name={row.object} size={44} />
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
          {/* The chevron the image draws on this control, and the same one the
              three forms it leads into carry on theirs. */}
          <Button onClick={onContinue} variant="primary" size="lg" full trailingIcon="arrow-right">
            {copy.continueLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
