import type { ReactNode } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { StatusChip } from "@/components/ui/StatusChip";
import "./passport.css";

/**
 * THE PASSPORT'S HERO: the credential (north star 10 F, 14.4; directive D14).
 *
 * One Island, the screen's one hero container: the passport as an object the
 * member holds, with its state said in a word and a shape (`StatusChip`), and
 * the month they joined. Nothing on it is a number Vallo did not record.
 *
 * THE TIER SLOT. `tierSlot` is where the premium artefact card (W7's
 * component, reference 38 as a matte credential) goes when a tier exists.
 * None does for the renter passport today: `my_renter_passport` carries facts
 * and no tier, and a card artefact on a screen with one option is decoration
 * (north star 14.4: "where it is not: anywhere there is no tier"). So the slot
 * is empty and draws nothing, and filling it later is one prop, not a
 * restructure. Whatever fills it must not look like a bank card (D14): no
 * chip, no network mark, no long number.
 *
 * `action` is the one thing to do from the hero (open the share sheet).
 * Server-safe: the interactive parts arrive as props.
 */
type Copy = Dictionary["experienceAccount"]["passport"];

export function PassportCredential({
  copy,
  enabled,
  since,
  tierSlot,
  action,
}: {
  copy: Copy;
  enabled: boolean;
  /** "On Vallo since March 2026", already formatted, or null when unknown. */
  since: string | null;
  tierSlot?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="nf-island nf-credential" aria-label={copy.credentialLabel} data-testid="passport-credential">
      <div className="nf-credential__head">
        <span className="nf-credential__object" aria-hidden="true">
          <BrandIcon name="passport-book" size={88} priority />
        </span>
        <div className="nf-credential__text">
          <h2 className="nf-credential__title">{copy.credentialLabel}</h2>
          <StatusChip state={enabled ? "success" : "neutral"} live>
            {enabled ? copy.on : copy.off}
          </StatusChip>
          {since ? <p className="nf-credential__since">{since}</p> : null}
        </div>
      </div>
      {tierSlot ? <div className="nf-credential__tier">{tierSlot}</div> : null}
      {action ? <div className="nf-credential__action">{action}</div> : null}
    </section>
  );
}
