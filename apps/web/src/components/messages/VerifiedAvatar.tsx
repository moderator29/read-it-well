import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * A person's avatar in messaging, with the verified mark on it.
 *
 * The badge overlaps the bottom right of the circle, which is where every
 * platform that has one puts it, and it is drawn with a ring in the surface
 * colour so it reads as sitting ON the avatar rather than beside it.
 *
 * ---------------------------------------------------------------------------
 * IT IS A FACT, NOT A DECORATION, AND THE TYPE ENFORCES THAT.
 *
 * `verified` is required and has no default. A call site that has not resolved
 * the counterpart's real verification state cannot render this component at
 * all - it will not compile - and that is the whole reason the prop is not
 * optional. A verified tick that appears because somebody forgot to pass a
 * prop is worse than no tick anywhere: it is the one mark on the platform that
 * a person is going to weigh before sending money to a stranger.
 *
 * WHERE THE TRUTH COMES FROM. `agents.verified`, resolved in
 * `lib/messages/live.ts` and carried through as `counterpartVerified`. Not from
 * "is this person an agent", which is a different and much weaker fact: an
 * unapproved agent has a row in that table too. Not from the LISTING's verified
 * flag either, which is about the property.
 *
 * IT CANNOT APPEAR ON SEED CONTENT. The seed message repository has no agents
 * table behind it, so nothing there resolves an identity and `counterpartName`
 * falls back with `verified` false. Demo content therefore carries no mark,
 * which is correct: the badge means a person was checked, and nobody checked a
 * fixture.
 *
 * A server component wherever it is allowed to be. It renders in the client
 * inbox too, which is fine - it holds no state and no effects.
 */

export type AvatarSize = "sm" | "md" | "lg";

const SHELL: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-[0.875rem]",
  md: "h-11 w-11 text-[1rem]",
  lg: "h-12 w-12 text-[1.0625rem]",
};

/** The badge scales with the avatar, never below 14px where the tick fails. */
const BADGE: Record<AvatarSize, string> = {
  sm: "h-4 w-4",
  md: "h-[1.125rem] w-[1.125rem]",
  lg: "h-5 w-5",
};

const GLYPH: Record<AvatarSize, number> = { sm: 12, md: 12, lg: 16 };

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}

export function VerifiedAvatar({
  name,
  verified,
  photoUrl,
  size = "md",
  /**
   * What this person is, when there is no badge to show.
   *
   * The bottom-right corner of an avatar is one slot and it may carry ONE
   * meaning at a time. When somebody is verified, that is the meaning. When
   * they are not, the corner falls back to saying whether they are a host or
   * another member, which is the next most useful thing about the person whose
   * message you are reading. Two marks stacked in one corner is how a badge
   * stops being read at all.
   */
  kind,
  className,
}: {
  name: string;
  /** The counterpart's REAL verification state. Never defaulted. */
  verified: boolean;
  photoUrl?: string;
  size?: AvatarSize;
  kind?: "agent" | "member";
  className?: string;
}) {
  return (
    <span className={`relative inline-block shrink-0 ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className={`flex items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] font-bold text-[var(--nf-content-primary)] ${SHELL[size]}`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initialOf(name)
        )}
      </span>

      {verified ? (
        /*
          Labelled, not aria-hidden. This is the one mark in a conversation
          carrying information a screen reader user needs as much as anybody:
          it is the difference between a stranger and a stranger the platform
          has checked.
        */
        <span
          className={`absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full border-2 border-[var(--nf-surface-primary)] bg-[var(--nf-status-verified)] text-[var(--nf-content-on-brand)] ${BADGE[size]}`}
        >
          <UiIcon name="verified" size={GLYPH[size]} filled label={VERIFIED_LABEL} />
        </span>
      ) : (
        kind && (
          /* The fallback meaning. A dot, deliberately not a green "online"
             light: nothing maintains presence here and a light nobody is
             maintaining is a lie. */
          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-[var(--nf-surface-primary)] ${
              kind === "agent"
                ? "bg-[var(--nf-brand-primary)]"
                : "bg-[var(--nf-content-muted)]"
            } ${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}`}
          />
        )
      )}
    </span>
  );
}

const VERIFIED_LABEL = "Verified";
