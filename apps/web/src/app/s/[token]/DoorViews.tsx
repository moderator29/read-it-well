import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import { AreaShareCard } from "@/components/share/AreaShareCard";
import type { ShareLines } from "@/lib/price-check/share-card";
import { doorSignInHref, type DoorCard, type DoorLines } from "@/lib/share/door";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DoorRetry } from "./DoorRetry";

/**
 * THE DOOR'S FACES (V-07), drawn from already-decided data.
 *
 * Kept apart from `page.tsx` so the harness at `/preview/door` can draw every
 * state against fixtures: the live door cannot show a real listing's card
 * until a real listing exists, and a card nobody has looked at is a card
 * nobody has checked for an address. These components take the card and its
 * already-worded lines; they read nothing and decide nothing.
 */

type Copy = Dictionary["frontDoor"]["door"];

function DoorCode({ code, copy }: { code: string; copy: Copy }) {
  return (
    <div className="nf-door__code">
      <span className="nf-caption text-[var(--nf-content-muted)]">{copy.codeLabel}</span>
      <span className="nf-numeric nf-door__code-value" data-testid="door-code">
        {code}
      </span>
      <span className="nf-caption text-[var(--nf-content-muted)]">{copy.codeHint}</span>
    </div>
  );
}

export function DoorListingView({
  card,
  lines,
  photo,
  copy,
}: {
  /** A listing, or a stay (V-07 carry-over), which has no code and no figure. */
  card: Extract<DoorCard, { kind: "listing" | "stay" }>;
  lines: DoorLines;
  photo: string | null;
  copy: Copy;
}) {
  return (
    /* The screen's one Island (door.css says why): the listing is the
       subject a stranger came for, so it alone gets the hero material. */
    <article className="nf-island nf-door__card" data-testid="door-card">
      <p className="nf-door__eyebrow">{copy.eyebrow}</p>
      <div className="nf-door__lead">
        {photo && (
          /* A plain img, small, and on purpose: the photograph is a thumbnail
             on a card, and routing it through the optimiser would add a
             second origin for no gain at 88px. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" width={88} height={88} className="nf-door__photo" loading="eager" />
        )}
        <div className="min-w-0">
          <h1 className="nf-door__title">{lines.title}</h1>
          {(card.place || lines.bedrooms) && (
            <p className="nf-door__place">{[lines.bedrooms, card.place].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </div>
      {lines.headline ? (
        <div className="nf-door__figure">
          <p className="nf-door__headline" data-testid="door-move-in">
            {lines.headline}
          </p>
          {lines.second && <p className="nf-door__second">{lines.second}</p>}
        </div>
      ) : (
        <p className="nf-door__second">{copy.askForPrice}</p>
      )}
      {card.kind === "listing" && card.reference && <DoorCode code={card.reference} copy={copy} />}
      <ButtonLink href={doorSignInHref(card)} variant="primary" full data-testid="door-sign-in">
        {copy.signIn}
      </ButtonLink>
      <p className="nf-door__note">
        <UiIcon name="shield-lock" size={16} />
        <span>{copy.areaOnly}</span>
      </p>
    </article>
  );
}

export function DoorExampleView({
  card,
  copy,
}: {
  card: Extract<DoorCard, { kind: "example" }>;
  copy: Copy;
}) {
  return (
    <article className="nf-panel nf-door__card" data-testid="door-card-example">
      <p className="nf-door__eyebrow">{copy.eyebrow}</p>
      <p className="nf-badge nf-badge--info nf-door__example">{card.stay ? copy.stay.example : copy.example}</p>
      <p className="nf-door__second">{card.stay ? copy.stay.exampleBody : copy.exampleBody}</p>
      {card.reference && <DoorCode code={card.reference} copy={copy} />}
      <ButtonLink href={doorSignInHref(card)} variant="primary" full data-testid="door-sign-in">
        {copy.signIn}
      </ButtonLink>
    </article>
  );
}

export function DoorAreaView({
  card,
  lines,
  copy,
}: {
  card: Extract<DoorCard, { kind: "price_area" }>;
  lines: ShareLines;
  copy: Copy;
}) {
  return (
    <div className="grid gap-block" data-testid="door-card-area">
      {/* The share card frame (spec section 10): the same card the unfurl
          image draws, so the page and the picture agree. */}
      <h1 className="sr-only">{lines.headline}</h1>
      <AreaShareCard lines={lines} chip={copy.areaEyebrow} />
      <ButtonLink href={doorSignInHref(card)} variant="primary" full data-testid="door-sign-in">
        {copy.signInArea}
      </ButtonLink>
    </div>
  );
}

/** Gone, missing and unreachable: each says what is true and offers one step. */
export function DoorStateView({
  state,
  copy,
  stay = false,
}: {
  state: "gone" | "missing" | "unreachable";
  copy: Copy;
  /** A stay that is gone says so in a stay's words. */
  stay?: boolean;
}) {
  if (state === "unreachable") {
    return (
      <div className="nf-panel nf-door__card" data-testid="door-unreachable">
        <EmptyState
          icon="alert-triangle"
          title={copy.unreachableTitle}
          body={copy.unreachableBody}
          action={<DoorRetry label={copy.retry} />}
        />
      </div>
    );
  }
  const gone = state === "gone";
  return (
    <div className="nf-panel nf-door__card" data-testid={gone ? "door-gone" : "door-missing"}>
      <EmptyState
        icon="home-search"
        title={gone ? (stay ? copy.stay.goneTitle : copy.goneTitle) : copy.missingTitle}
        body={gone ? (stay ? copy.stay.goneBody : copy.goneBody) : copy.missingBody}
        action={
          <ButtonLink href="/sign-in" variant="primary" full>
            {copy.goneAction}
          </ButtonLink>
        }
      />
    </div>
  );
}
