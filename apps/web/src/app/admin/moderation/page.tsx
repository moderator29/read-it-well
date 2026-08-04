import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin, adminRefusal } from "@/lib/admin/guard";
import { getModerationQueue } from "@/lib/admin/moderation-queries";
import { HoldDecision } from "./HoldDecision";

export const metadata: Metadata = {
  title: "Held",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Everything the scanner is holding.
 *
 * Four queues on one screen, because they are one job: a post, a story, a
 * comment on a story, and a bio can each be held by the safety triggers, and
 * until this screen existed none of them could be released by anybody. A hold
 * with no reviewer is a deletion with extra steps, and the author is told their
 * words are "being checked" by somebody who does not exist.
 *
 * Oldest first in every queue. The longest wait is the one that matters.
 *
 * English literals, like the rest of the console. That is the standing decision
 * in R-107: an internal surface for a small team, and translating it would be
 * work with no reader.
 */
export default async function AdminModerationPage() {
  const access = await requireAdmin();
  if (access.state !== "admin") {
    return (
      <div className="nf-card p-6">
        <h1 className="text-lg font-semibold text-[var(--nf-content-primary)]">Held</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--nf-content-muted)]">
          {adminRefusal(access)}
        </p>
      </div>
    );
  }

  const queue = await getModerationQueue();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold text-[var(--nf-content-primary)]">Held</h1>
        <p className="mt-1 text-sm leading-relaxed text-[var(--nf-content-muted)]">
          Words the safety scan stopped before anybody else saw them. Every one
          of these has an author waiting to be told what happened.
        </p>
      </header>

      {queue.total === 0 ? (
        <p className="nf-card p-5 text-sm leading-relaxed text-[var(--nf-content-muted)]">
          Nothing is held. When the scanner stops a post, a story, a comment or a
          bio, it lands here and its author is told it is being checked.
        </p>
      ) : null}

      <Section title="Posts" count={queue.posts.length}>
        {queue.posts.map((post) => (
          <li key={post.id} className="nf-card p-4 sm:p-5">
            <Meta
              handle={post.author.handle}
              label={post.author.label}
              when={post.createdAt}
              place={post.areaName}
              tag={post.isReply ? "Reply" : post.kind}
            />
            <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-[var(--nf-border-brand)] pl-3 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
              {post.body || "This post carries no words, only an attachment."}
            </blockquote>
            {post.holdReason ? <Reason text={post.holdReason} /> : null}
            <p className="mt-2 text-xs">
              <Link
                href={`/post/${post.rootId}`}
                className="text-[var(--nf-brand-secondary)]"
              >
                Open the thread
              </Link>
            </p>
            <HoldDecision target="post" id={post.id} what="post" />
          </li>
        ))}
      </Section>

      <Section title="Stories" count={queue.stories.length}>
        {queue.stories.map((story) => (
          <li key={story.id} className="nf-card p-4 sm:p-5">
            <Meta
              handle={story.author.handle}
              label={story.author.label}
              when={story.createdAt}
              place={story.areaName ?? story.placeLabel}
              tag="Story"
            />
            <h3 className="mt-3 text-base font-semibold text-[var(--nf-content-primary)]">
              {story.headline}
            </h3>
            {story.standfirst ? (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--nf-content-secondary)]">
                {story.standfirst}
              </p>
            ) : null}
            {story.holdReason ? <Reason text={story.holdReason} /> : null}
            <p className="mt-2 text-xs">
              <Link href={`/stories/${story.id}`} className="text-[var(--nf-brand-secondary)]">
                Open the story
              </Link>
            </p>
            <HoldDecision target="story" id={story.id} what="story" />
          </li>
        ))}
      </Section>

      <Section title="Story comments" count={queue.comments.length}>
        {queue.comments.map((comment) => (
          <li key={comment.id} className="nf-card p-4 sm:p-5">
            <Meta
              handle={comment.author.handle}
              label={comment.author.label}
              when={comment.createdAt}
              place={comment.storyHeadline}
              tag="Comment"
            />
            <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-[var(--nf-border-brand)] pl-3 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
              {comment.body}
            </blockquote>
            <p className="mt-2 text-xs">
              <Link
                href={`/stories/${comment.storyId}`}
                className="text-[var(--nf-brand-secondary)]"
              >
                Open the story
              </Link>
            </p>
            <HoldDecision target="comment" id={comment.id} what="comment" />
          </li>
        ))}
      </Section>

      <Section title="Bios" count={queue.bios.length}>
        {queue.bios.map((bio) => (
          <li key={bio.userId} className="nf-card p-4 sm:p-5">
            <Meta
              handle={bio.handle}
              label={bio.label}
              when={bio.updatedAt}
              place={null}
              tag="Bio"
            />
            <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-[var(--nf-border-brand)] pl-3 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
              {bio.bio || "This bio is empty."}
            </blockquote>
            {bio.link ? (
              <p className="nf-numeric mt-2 break-all text-xs text-[var(--nf-content-muted)]">
                Link: {bio.link}
              </p>
            ) : null}
            <p className="mt-2 text-xs">
              <Link href={`/u/${bio.handle}`} className="text-[var(--nf-brand-secondary)]">
                Open the profile
              </Link>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-muted)]">
              Taking a bio down empties it. The profile itself stays exactly where
              it is.
            </p>
            <HoldDecision target="bio" id={bio.userId} what="bio" />
          </li>
        ))}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--nf-content-primary)]">
        {title}
        <span className="nf-numeric rounded-[var(--nf-radius-pill)] border border-[var(--nf-border-default)] px-2 py-0.5 text-xs text-[var(--nf-content-muted)]">
          {count}
        </span>
      </h2>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}

function Meta({
  handle,
  label,
  when,
  place,
  tag,
}: {
  handle: string | null;
  label: string | null;
  when: string;
  place: string | null;
  tag: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-sm font-semibold text-[var(--nf-content-primary)]">
        {label ?? (handle ? `@${handle}` : "A member")}
      </span>
      {handle ? (
        <Link href={`/u/${handle}`} className="text-xs text-[var(--nf-brand-secondary)]">
          @{handle}
        </Link>
      ) : null}
      <span className="text-xs uppercase tracking-wider text-[var(--nf-content-muted)]">
        {tag}
      </span>
      {place ? <span className="text-xs text-[var(--nf-content-muted)]">{place}</span> : null}
      <span className="nf-numeric text-xs text-[var(--nf-content-muted)]">{stamp(when)}</span>
    </div>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <p className="mt-2 text-xs leading-relaxed text-[var(--nf-state-warning)]">
      Held because: {text}
    </p>
  );
}

/** Lagos time, because that is the clock the operations team works to. */
function stamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(date);
}
