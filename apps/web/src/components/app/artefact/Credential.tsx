import "./artefact.css";
import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * A CREDENTIAL ARTEFACT (north star 14.4, founder directive D14).
 *
 * The object a member holds for a tier: the Space Passport's tier, a trust
 * tier, a Pro plan, a promotion tier. Reference 38's fanned cards, taken as
 * MATTE credentials rather than mirror-finished cards, because a mirror
 * finish reads as a crypto product here.
 *
 * THE ONE HARD LIMIT: VALLO ISSUES NO PAYMENT CARD. So this is built to fail
 * the "is it a bank card?" glance on purpose:
 *
 *   - no chip, no contactless mark, no network mark, no long number, no
 *     expiry, no cardholder line. There is no prop that could draw any of
 *     them: the face takes an eyebrow, a title, one line, a state and a line
 *     glyph, all words;
 *   - not the bank-card proportion (1.586). It is 7 by 5, closer to a plaque
 *     or an ID page than to anything that goes in a wallet slot;
 *   - the title is set large in display type, because a credential is named,
 *     and a bank card is numbered.
 *
 * THE MATERIAL is a quiet difference per tier, never a colour scheme (14.4):
 * matte navy, then royal, then matte navy with one thin warm edge line (the
 * screen's one warm spark, D33). Dark in both themes, so its ink is the
 * on-brand white in both; on paper it lifts on the blue-tinted shadow and on
 * night on the floating elevation. One edge treatment: the shadow, which also
 * draws the 2px of thickness under it so the slab reads as an object.
 *
 * Presentational and server-safe. `CredentialFan` arranges several.
 */
export type CredentialMaterial = "navy" | "royal" | "edge";

export type CredentialFace = {
  material: CredentialMaterial;
  /** Small, above: "Tier 2". */
  eyebrow: string;
  /** The credential's name: "Address verified". */
  title: string;
  /** One line saying what it means. */
  line?: string;
  /** Whether the member holds it, in words ("Held", "Not yet"). Never a tick alone. */
  state?: ReactNode;
  /** One line glyph, top right. A symbol for the idea, never a logo. */
  glyph?: UiIconName;
};

export function Credential({
  face,
  className,
  "aria-hidden": hidden,
}: {
  face: CredentialFace;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      className={["nf-cred", className ?? ""].filter(Boolean).join(" ")}
      data-material={face.material}
      aria-hidden={hidden || undefined}
    >
      <div className="nf-cred__top">
        <span className="nf-cred__eyebrow">{face.eyebrow}</span>
        {face.glyph ? <UiIcon name={face.glyph} size={20} className="nf-cred__glyph" /> : null}
      </div>
      <div className="nf-cred__foot">
        <p className="nf-cred__title">{face.title}</p>
        {face.line ? <p className="nf-cred__line">{face.line}</p> : null}
        {face.state ? <p className="nf-cred__state">{face.state}</p> : null}
      </div>
    </div>
  );
}
