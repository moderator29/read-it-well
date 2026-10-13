/**
 * "OWNERSHIP SEEN": a small shield with a tick knocked through it, and the
 * words beside it.
 *
 * Kept deliberately apart from `TierBadge`'s scalloped seal: that seal means a
 * named member of staff checked the PERSON (docs/BADGES.md, section 1). This
 * mark says something narrower, that a reviewer has seen the owner's own
 * proof of ownership, and it must never be mistaken for the seal. Same family
 * (a quiet glyph at text size, no capsule, no fill behind the words), a
 * different object.
 *
 * Drawn only when `seenAt` is a date from `public.ownership_seen_at`, which is
 * derived from a reviewer's approval. No date, no mark, and no empty box.
 */
export function OwnershipSeenMark({
  seenAt,
  label,
  className,
}: {
  seenAt: string | null;
  /** "Ownership seen", from the dictionary. */
  label: string;
  className?: string;
}) {
  if (!seenAt) return null;
  return (
    <span
      className={`inline-flex items-center gap-2xstext-[length:var(--nf-text-caption)] font-semibold leading-none text-[var(--nf-content-secondary)]${className ? ` ${className}` : ""}`}
      data-testid="ownership-seen"
    >
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
        className="shrink-0 text-[var(--nf-state-success)]"
      >
        {/* A shield on the 16 grid, and the tick through it. */}
        <path
          d="M8 1.2 13.2 3v4.1c0 3.3-2.2 6-5.2 7.7C5 13.1 2.8 10.4 2.8 7.1V3Z"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M5.4 8.1 7.2 9.8 10.7 6.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}
