import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { getArea } from "@/lib/social/areas-queries";
import { getAreaFeed } from "@/lib/social/posts-queries";
import { POST_COPY } from "@/lib/social/posts-schema";
import { Feed } from "@/components/social/feed/Feed";
import { AroundFab } from "@/components/social/AroundFab";
import { AREA_COPY, AREA_KIND_LABEL } from "@/lib/social/areas-schema";
import { JoinButton } from "../JoinButton";
import { ModeratorApply } from "./ModeratorApply";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getArea(slug);
  if (!detail || detail === "unconfigured") return { title: "Around" };
  return {
    title: `Around ${detail.area.name}`,
    description:
      detail.area.blurb ??
      `What is happening around ${detail.area.name}, ${detail.area.city}.`,
  };
}

/**
 * One place.
 *
 * A place that has just opened has no posts in it, and that is the state this
 * page is designed around rather than the state it apologises for. The first
 * thing a visitor sees is what the place is, who is looking after it, and the
 * two things they can do: join it, or offer to help keep it. Posts land in the
 * next slice and the feed section already holds the shape they will fill.
 *
 * A slug that does not resolve renders the same not found whether the place
 * does not exist or is somebody else's private proposal. Distinguishing them
 * would tell a stranger that a private proposal exists, which is a disclosure
 * dressed up as a helpful error.
 */
export default async function AreaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getArea(slug);

  // Two different answers that used to look the same. No keys means the feature
  // is not switched on; null means this place genuinely is not there. A 404 for
  // the first one tells the owner we deleted their page.
  if (detail === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-3xl pb-24 pt-4">
        <PageHeader title="Around" fallback="/around" />
        <p className="nf-card p-5 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          Places switch on the moment the platform keys land. Nothing here is a
          mock up: there is simply nothing to read yet.
        </p>
      </div>
    );
  }
  if (!detail) notFound();

  const { area, viewer, moderators } = detail;
  const feed = await getAreaFeed(area.id);
  const isModerator = viewer.role === "MODERATOR";

  return (
    <div className="mx-auto w-full max-w-3xl pb-24 pt-4">
      <PageHeader
        title={`Around ${area.name}`}
        subtitle={`${AREA_KIND_LABEL[area.kind]} in ${area.city}`}
        fallback="/around"
        actions={
          area.status === "ACTIVE" ? (
            <JoinButton
              areaId={area.id}
              joined={viewer.member}
              signedIn={viewer.signedIn}
            />
          ) : null
        }
      />

      {area.status === "PROPOSED" ? (
        <p className="nf-card mb-5 border-[var(--nf-border-brand)] p-4 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          You suggested this place and it is still with us. {AREA_COPY.proposePending}
        </p>
      ) : null}

      {area.status === "PAUSED" ? (
        <p className="nf-card mb-5 p-4 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          {AREA_COPY.paused}
        </p>
      ) : null}

      <section className="nf-card mb-5 p-5">
        {area.blurb ? (
          <p className="text-base leading-relaxed text-[var(--nf-content-primary)]">
            {area.blurb}
          </p>
        ) : null}

        <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              Members
            </dt>
            <dd className="nf-numeric mt-0.5 text-lg font-bold text-[var(--nf-content-primary)]">
              {area.memberCount.toLocaleString("en-NG")}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              Posts
            </dt>
            <dd className="nf-numeric mt-0.5 text-lg font-bold text-[var(--nf-content-primary)]">
              {area.postCount.toLocaleString("en-NG")}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
              Looked after by
            </dt>
            <dd className="nf-numeric mt-0.5 text-lg font-bold text-[var(--nf-content-primary)]">
              {moderators.length}
            </dd>
          </div>
        </dl>

        {moderators.length > 0 ? (
          <p className="mt-4 text-xs leading-relaxed text-[var(--nf-content-muted)]">
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
            . They can hide a post while somebody reviews it, and they cannot
            delete anybody&rsquo;s post.
          </p>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            Nobody is looking after this place yet.
          </p>
        )}
      </section>

      {area.slowMode && area.status === "ACTIVE" ? (
        <p className="mb-5 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-4 py-3 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_COPY.slowMode}
        </p>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          What is happening
        </h2>
        <Feed
          initial={feed.posts}
          signedIn={viewer.signedIn}
          isMember={viewer.member}
          areaId={area.status === "ACTIVE" ? area.id : undefined}
          areaName={area.name}
          emptyMessage={
            viewer.signedIn ? POST_COPY.emptyFeed : POST_COPY.emptyFeedSignedOut
          }
        />
        {feed.ended && feed.posts.length > 0 ? (
          <p
            aria-live="polite"
            className="mt-5 text-center text-xs text-[var(--nf-content-muted)]"
          >
            {POST_COPY.endOfSession}
          </p>
        ) : null}
      </section>

      {viewer.member && !isModerator && area.status === "ACTIVE" ? (
        <ModeratorApply
          areaId={area.id}
          areaName={area.name}
          pendingApplication={viewer.moderatorApplicationStatus === "PENDING"}
        />
      ) : null}

      {isModerator ? (
        <div className="nf-card border-[var(--nf-border-brand)] p-4">
          <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
            You look after {area.name}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            Your name carries a moderator mark in this place and nowhere else.
            You can hide a post while somebody reviews it. You cannot delete one,
            and nobody expects you to be available at 2am.
          </p>
        </div>
      ) : null}

      {/* The dock travels with the social layer. Here it already knows the
          place, so Drop gist opens straight onto the composer. */}
      <AroundFab currentAreaId={area.status === "ACTIVE" ? area.id : undefined} />
    </div>
  );
}
