import type { Dictionary } from "@naijafinds/i18n";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

/**
 * What a visitor sees at /agent/list when they are not an approved agent.
 *
 * Two honest variants of one design: sign in, or apply. Neither pretends the
 * wizard is one tap away, and both give the next step rather than a dead end.
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
    <div className="mx-auto max-w-lg py-6 text-center sm:py-10">
      <span
        className="mx-auto grid h-16 w-16 place-items-center rounded-[var(--nf-radius-lg)]"
        style={{ background: "var(--nf-gradient-agent)", color: "#fff" }}
      >
        <UiIcon name="key" size={32} />
      </span>

      <h1 className="nf-h2 mt-5">{copy.title}</h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-[var(--nf-content-secondary)]">
        {signedIn ? copy.bodySignedIn : copy.bodySignedOut}
      </p>

      <ul className="mt-7 space-y-3 text-left">
        {points.map((point) => (
          <li key={point.title} className="nf-card flex items-start gap-4 p-4">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--nf-radius-md)]"
              style={{ background: "var(--nf-surface-raised)", color: "var(--nf-electric-300)" }}
            >
              <UiIcon name={point.icon} size={20} />
            </span>
            <span className="min-w-0 leading-snug">
              <span className="block text-[0.9375rem] font-semibold">{point.title}</span>
              <span className="mt-1 block text-[0.8125rem] text-[var(--nf-content-secondary)]">
                {point.body}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-col gap-4">
        <ButtonLink href="/agents/apply" variant="primary">
          {copy.apply}
        </ButtonLink>
        {!signedIn && (
          <ButtonLink href="/sign-in" variant="secondary">
            {copy.signIn}
          </ButtonLink>
        )}
        <ButtonLink href="/agents" variant="secondary">
          {copy.how}
        </ButtonLink>
      </div>
    </div>
  );
}
