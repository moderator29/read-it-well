import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { STAYS_DOORS } from "@/lib/host/doors";

/**
 * ADD A WORKSPACE, ON THE STAYS SIDE. `GOVERNING-09` screen three.
 *
 * Three doors, each a glass mark on its plate, the operator's own words, one
 * supporting line and a chevron. The render draws them as the same object the
 * host's own standing page already uses for a choice, `nf-host-choice`, which
 * carries the lit top rim and the single soft bloom the whole set is built
 * from, so this inherits the register rather than inventing a second one.
 *
 * SERVER RENDERED, WITH NOTHING TO SELECT. The render shows no selected state
 * on this screen and there is nothing to confirm: a door IS the answer, so it
 * is a link and the next screen is the confirmation. That also means no
 * JavaScript has to arrive before a host can start, which on a Nigerian mobile
 * connection is the difference between starting and leaving.
 *
 * WHAT IS TRANSLATED RATHER THAN COPIED, per the folder's README. The render's
 * rows are drawn with soft ends; every one of them ships on
 * `--nf-radius-control` through `nf-host-choice`, whose 18px radius on a 64px
 * row is a ratio of 0.28 and reads as the rounded rectangle the shape law
 * requires. And the render's dock says "Explore" where the property side says
 * "Search": one word ships on both sides and the word is Search, so nothing
 * here draws or names that slot.
 */
export function StaysDoors() {
  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Add a workspace</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>What kind of stays business are you?</p>
        </div>
      </div>

      <nav className="mt-block flex flex-col gap-row" aria-label="What kind of stays business are you">
        {STAYS_DOORS.map((door) => (
          <Link key={door.id} href={`/host/apply?door=${door.id}`} className="nf-host-choice">
            <span className="nf-host-choice__mark" aria-hidden="true">
              <BrandIcon name={door.mark} fill />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${TYPE.rowTitle}`}>{door.title}</span>
              <span className={`block ${TYPE.rowMeta}`}>{door.meaning}</span>
            </span>
            <UiIcon
              name="chevron-right"
              size={20}
              className="shrink-0 text-[var(--nf-content-muted)]"
            />
          </Link>
        ))}
      </nav>

      {/*
        THE CALM EXPLANATORY PANEL the whole reference set carries, with its
        small round glyph. It says the one thing a person weighing three doors
        actually wants to know, and it says it honestly: the application is
        saved as it goes, and a human reads it. No promise about how long,
        because nothing in this product can produce that number yet.
      */}
      <aside className="nf-host-group mt-block flex items-start gap-sm">
        {/* The small round glyph the set carries on almost every screen. It is
            a bare mark on an existing ring and carries no text, which is the
            one shape the law leaves round. No new stylesheet rule: the panel is
            `nf-host-group`, the same plate every other group on these surfaces
            is drawn on, and the ring is `nf-host-choice__ring`. */}
        <span className="nf-host-choice__ring" aria-hidden="true">
          <UiIcon name="info" size={14} />
        </span>
        <p className={`min-w-0 flex-1 ${TYPE.rowMeta}`}>
          Whichever you pick, the application saves as you go and a person on our team reads it. You
          can change your answer on the next screen.
        </p>
      </aside>
    </>
  );
}
