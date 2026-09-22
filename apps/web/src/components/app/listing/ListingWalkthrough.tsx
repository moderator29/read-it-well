import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * THE WALKTHROUGH, WATCHED. The other half of the gap.
 *
 * The listing pipeline audit found every layer of video built and both of the
 * two a human touches missing: a lister could not upload one and a renter
 * could not watch one, while the approval email advertised walkthroughs as the
 * single best thing a lister can add. This is the watching half.
 *
 * WHY IT IS THE STRONGEST THING ON THE PAGE, IN THIS MARKET. Photographs are
 * routinely of a different flat, of the show unit, or five years old. A
 * continuous walk through a property is the cheapest thing a lister can offer
 * that is genuinely hard to fake, and the hardest thing for somebody relisting
 * another person's house to produce. So it sits high, above the photo grid,
 * and it is named for what it proves rather than for what it is.
 *
 * `preload="metadata"` and not `auto`: on a Nigerian mobile connection a page
 * that begins pulling fifty megabytes because somebody scrolled past is a page
 * that spends their data without asking. The poster is enough to decide on.
 *
 * The URL is signed and short lived, which is why this takes it as a prop from
 * the server read rather than building one: `listing-videos` is a private
 * bucket and the repository signs a whole page's worth in one call.
 */
export function ListingWalkthrough({
  videos,
  title,
}: {
  videos: { url: string; posterUrl: string | null; durationSeconds: number | null }[];
  title: string;
}) {
  if (videos.length === 0) return null;

  return (
    <ul className="space-y-row">
      {videos.map((video) => (
        <li key={video.url}>
          {/* A walk through an empty property carries no speech, so there is no
              track to caption and none is invented. */}
          <video
            src={video.url}
            poster={video.posterUrl ?? undefined}
            controls
            preload="metadata"
            playsInline
            aria-label={`Walkthrough of ${title}`}
            className="aspect-video w-full rounded-[var(--nf-radius-lg)] bg-[var(--nf-surface-inset)] object-cover"
          />
          <p className="nf-caption mt-inline-tight flex items-center gap-inline-tight text-[var(--nf-content-muted)]">
            <UiIcon name="views" size={14} aria-hidden />
            <span>
              Filmed by the lister
              {video.durationSeconds === null ? "" : `, ${clock(video.durationSeconds)}`}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** "1:04". Seconds alone read as a number rather than as a length. */
function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
