import type { Dictionary } from "@vallo/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { ICON, Row, RowList, TYPE } from "@/components/app/Screen";

/**
 * What a visitor sees at /agent/list when they are not an approved agent.
 *
 * Two honest variants of one design: sign in, or set up the profile. Neither
 * pretends the wizard is one tap away, and both give the next step rather than
 * a dead end.
 *
 * THREE CARDS BECAME THREE ROWS. The three selling points were three `.nf-card`
 * boxes stacked down a phone, each holding a 40px tinted tile, for one list of
 * three things. One surface, hairlines between, one tinted mark per row: the
 * switch-profile sheet's shape, which is now the product's shape.
 *
 * THE THIRD BUTTON WENT WITH THE PITCH PAGE. "How it works" pointed at
 * `/agents`, a marketing destination that no longer exists; setting up the
 * profile now carries its own explanation in the sheet that starts it, so
 * there is nothing left for a second link to add. One primary action, and the
 * sign-in door when there is no session.
 *
 * Every string arrives as a dictionary slice from the page, which is where the
 * locale is resolved. The icons stay here because a glyph is not copy.
 */
export type PitchCopy = Dictionary["agentListings"]["pitch"];

export function ListingPitch({ copy, signedIn }: { copy: PitchCopy; signedIn: boolean }) {
  const points: { icon: UiIconName; title: string; body: string }[] = [
    { icon: "verified", ...copy.points.verified },
    { icon: "chat-bubble", ...copy.points.inside },
    { icon: "wallet", ...copy.points.keep },
  ];

  return (
    <div className="mx-auto max-w-lg py-section-tight text-center">
      {/* `--nf-content-on-brand` rather than `#fff`. The mark sits on the agent
          gradient in both themes and the token is what follows the theme; the
          literal was a dark-only assumption that happened to look right. */}
      <span
        className="mx-auto grid h-16 w-16 place-items-center rounded-[var(--nf-radius-lg)]"
        style={{
          background: "var(--nf-gradient-agent)",
          color: "var(--nf-content-on-brand)",
        }}
      >
        <UiIcon name="key" size={32} />
      </span>

      <h1 className="nf-h2 mt-heading">{copy.title}</h1>
      <p className={`mx-auto mt-row max-w-[44ch] ${TYPE.bodyLg}`}>
        {signedIn ? copy.bodySignedIn : copy.bodySignedOut}
      </p>

      <RowList boxed className="mt-block text-left">
        {points.map((point) => (
          <Row key={point.title} className="items-start">
            <span className="nf-role-mark mt-inline-tight" aria-hidden="true">
              <UiIcon name={point.icon} size={ICON.row} />
            </span>
            <span className="min-w-0">
              <span className={`block ${TYPE.rowTitle}`}>{point.title}</span>
              <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{point.body}</span>
            </span>
          </Row>
        ))}
      </RowList>

      <div className="mt-block flex flex-col gap-md">
        <ButtonLink href="/profile/setup/owner" variant="primary">
          {copy.apply}
        </ButtonLink>
        {!signedIn && (
          <ButtonLink href="/sign-in" variant="secondary">
            {copy.signIn}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
