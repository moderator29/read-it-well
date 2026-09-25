import Link from "next/link";
import { formatNumber, type Locale } from "@vallo/i18n/core";
import type { AreaDetail, AreaSummary } from "@/lib/social/areas-queries";
import { AREA_COPY } from "@/lib/social/areas-schema";

/**
 * The quiet panels of one place (`/around/[slug]`): its status notes, what it
 * is and who looks after it, and the note a moderator sees. Lifted out of the
 * page so the orphans sweep's fixture harness draws the real markup; the page
 * still reads the place and decides which of these show.
 */
export function PlaceNotes({
  status,
  slowMode,
}: {
  status: AreaSummary["status"];
  slowMode: boolean;
}) {
  return (
    <>
      {status === "PROPOSED" ? (
        <p className="nf-panel nf-panel--card mb-md block text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          You suggested this place and it is still with us. {AREA_COPY.proposePending}
        </p>
      ) : null}

      {status === "PAUSED" ? (
        <p className="nf-panel nf-panel--card mb-md block text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {AREA_COPY.paused}
        </p>
      ) : null}

      {slowMode && status === "ACTIVE" ? (
        <p className="nf-panel nf-panel--card mb-md block px-md py-sm text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_COPY.slowMode}
        </p>
      ) : null}
    </>
  );
}

export function PlaceAbout({
  area,
  moderators,
  locale,
}: {
  area: Pick<AreaSummary, "blurb" | "memberCount" | "postCount">;
  moderators: AreaDetail["moderators"];
  locale: Locale;
}) {
  return (
    <section className="nf-panel nf-panel--card mb-md block p-lg">
      {area.blurb ? (
        <p className="text-[length:var(--nf-text-body)] leading-relaxed text-[var(--nf-content-primary)]">
          {area.blurb}
        </p>
      ) : null}

      <dl className="mt-md flex flex-wrap gap-x-lg gap-y-sm">
        <div>
          <dt className="nf-overline text-[var(--nf-content-muted)]">Members</dt>
          <dd className="nf-numeric mt-3xs text-[length:var(--nf-text-body-lg)] font-bold text-[var(--nf-content-primary)]">
            {formatNumber(area.memberCount, locale)}
          </dd>
        </div>
        <div>
          <dt className="nf-overline text-[var(--nf-content-muted)]">Posts</dt>
          <dd className="nf-numeric mt-3xs text-[length:var(--nf-text-body-lg)] font-bold text-[var(--nf-content-primary)]">
            {formatNumber(area.postCount, locale)}
          </dd>
        </div>
        <div>
          <dt className="nf-overline text-[var(--nf-content-muted)]">Looked after by</dt>
          <dd className="nf-numeric mt-3xs text-[length:var(--nf-text-body-lg)] font-bold text-[var(--nf-content-primary)]">
            {moderators.length}
          </dd>
        </div>
      </dl>

      {moderators.length > 0 ? (
        <p className="mt-md text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          Kept by{" "}
          {moderators.map((mod, index) => (
            <span key={mod.userId}>
              {index > 0 ? ", " : ""}
              {mod.handle ? (
                <Link
                  href={`/u/${mod.handle}`}
                  className="font-semibold text-[var(--nf-brand-secondary)]"
                >
                  @{mod.handle}
                </Link>
              ) : (
                "a member"
              )}
            </span>
          ))}
          . They can hide a post while somebody reviews it, and they cannot delete anybody&rsquo;s
          post.
        </p>
      ) : (
        <p className="mt-md text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          Nobody is looking after this place yet.
        </p>
      )}
    </section>
  );
}

export function ModeratorNote({ areaName }: { areaName: string }) {
  return (
    <div className="nf-panel nf-panel--card block">
      <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
        You look after {areaName}
      </p>
      <p className="mt-2xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
        Your name carries a moderator mark in this place and nowhere else. You can hide a post while
        somebody reviews it. You cannot delete one, and nobody expects you to be available at 2am.
      </p>
    </div>
  );
}
