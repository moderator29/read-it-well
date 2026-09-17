import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { requireAdmin, adminRefusal } from "@/lib/admin/guard";
import { getModerationQueue } from "@/lib/admin/moderation-queries";
import { adminUi } from "../_components/ui";
import { QueueFilters, queueNoMatch, readQueueQuery } from "../_components/QueueFilters";
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
const LEDE =
  "Words the safety scan stopped before anybody else saw them. Every one of these has an author waiting to be told what happened.";

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const common = t.admin.common;

  if (access.state !== "admin") {
    return (
      <div className="nf-card p-lg">
        <h1 className="text-[var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">Held</h1>
        <p className="mt-xs text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
          {adminRefusal(access)}
        </p>
      </div>
    );
  }

  const query = readQueueQuery(await searchParams);
  const queue = await getModerationQueue({
    ...(query.q ? { q: query.q } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  });
  const noMatch = queueNoMatch(common);

  return (
    /*
      THE ONE QUEUE THAT WAS NOT IN THE CONSOLE.

      This page hand-rolled its own header at `text-[var(--nf-text-h4)]` and its
      own empty state in a card, outside `ui.QueueHeader` and `ui.QueueEmpty`
      that every other destination uses, and it sat in a bare flex column rather
      than in `.nf-console`. So the screen where a moderator decides whether
      somebody's words come back was the one screen that did not look like the
      console it is part of.

      Bringing it in was held back for one sprint on purpose: a filter bar above
      a header that does not match is worse than no filter bar. The header
      matches now, so the filter bar can land with it. F2-055, F2-062.

      THE ENGLISH STAYS, and that is R-107 rather than an oversight: the console
      is an internal surface for a small team. What comes from the dictionary is
      the shared console furniture, which is translated because it is shared,
      and the four sections' own words are not.
    */
    <div className="nf-console">
      <ui.QueueHeader title="Held" lede={LEDE} count={queue.total} />

      {/* No status chips: every row on all four tables is HELD by definition,
          and a control offering one value is not a filter. */}
      <QueueFilters
        base="/admin/moderation"
        query={query}
        common={common}
        searchLabel="Find held words"
        searchPlaceholder="A phrase from the post, story, comment or bio"
      />

      {queue.total === 0 ? (
        <ui.QueueEmpty
          title={queue.narrowed ? noMatch.title : "Nothing is held"}
          body={
            queue.narrowed
              ? noMatch.body
              : "When the scanner stops a post, a story, a comment or a bio, it lands here and its author is told it is being checked."
          }
          /* Three states, not two. Narrowed, this is the result of the
             operator's own filter and is drawn as one; unnarrowed, nothing has
             ever been held here. Neither is a clearance, so neither gets the
             tick. See `QueueEmpty`. */
          state={queue.narrowed ? "no-match" : "never"}
        />
      ) : null}

      <Section title="Posts" count={queue.posts.length}>
        {queue.posts.map((post) => (
          <li key={post.id} className="nf-card p-md sm:p-lg">
            <Meta
              handle={post.author.handle}
              label={post.author.label}
              when={post.createdAt}
              place={post.areaName}
              tag={post.isReply ? "Reply" : post.kind}
            />
            <blockquote className="mt-sm whitespace-pre-wrap border-l-2 border-[var(--nf-border-brand)] pl-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              {post.body || "This post carries no words, only an attachment."}
            </blockquote>
            {post.holdReason ? <Reason text={post.holdReason} /> : null}
            <p className="mt-xs text-[var(--nf-text-overline)]">
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
          <li key={story.id} className="nf-card p-md sm:p-lg">
            <Meta
              handle={story.author.handle}
              label={story.author.label}
              when={story.createdAt}
              place={story.areaName ?? story.placeLabel}
              tag="Story"
            />
            <h3 className="mt-sm text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
              {story.headline}
            </h3>
            {story.standfirst ? (
              <p className="mt-2xs whitespace-pre-wrap text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
                {story.standfirst}
              </p>
            ) : null}
            {story.holdReason ? <Reason text={story.holdReason} /> : null}
            <p className="mt-xs text-[var(--nf-text-overline)]">
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
          <li key={comment.id} className="nf-card p-md sm:p-lg">
            <Meta
              handle={comment.author.handle}
              label={comment.author.label}
              when={comment.createdAt}
              place={comment.storyHeadline}
              tag="Comment"
            />
            <blockquote className="mt-sm whitespace-pre-wrap border-l-2 border-[var(--nf-border-brand)] pl-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              {comment.body}
            </blockquote>
            {comment.holdReason ? <Reason text={comment.holdReason} /> : null}
            <p className="mt-xs text-[var(--nf-text-overline)]">
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
          <li key={bio.userId} className="nf-card p-md sm:p-lg">
            <Meta
              handle={bio.handle}
              label={bio.label}
              when={bio.updatedAt}
              place={null}
              tag="Bio"
            />
            <blockquote className="mt-sm whitespace-pre-wrap border-l-2 border-[var(--nf-border-brand)] pl-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              {bio.bio || "This bio is empty."}
            </blockquote>
            {bio.link ? (
              <p className="nf-numeric mt-xs break-all text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                Link: {bio.link}
              </p>
            ) : null}
            <p className="mt-xs text-[var(--nf-text-overline)]">
              <Link href={`/u/${bio.handle}`} className="text-[var(--nf-brand-secondary)]">
                Open the profile
              </Link>
            </p>
            <p className="mt-xs text-[var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
              Taking a bio down empties it. The profile itself stays exactly where
              it is.
            </p>
            <HoldDecision target="bio" id={bio.userId} what="bio" />
          </li>
        ))}
      </Section>

      {/*
        THE CAP, SAID OUT LOUD.

        Each of the four reads is capped at fifty and they cannot share a pager:
        one offset across four independent tables would mean the forty-first
        post AND the forty-first bio, and a Next link offered whenever any one
        of them came back full would walk the other three past rows nobody had
        seen. So the cap stays and it is stated, because fifty rows that look
        like all of them is how the oldest thing in a queue rots while the count
        looks healthy. The search and the date range above are what reaches past
        it, which is exactly what they are for.
      */}
      {(queue.posts.length >= 50 ||
        queue.stories.length >= 50 ||
        queue.comments.length >= 50 ||
        queue.bios.length >= 50) && (
        <p
          role="status"
          className="nf-body-sm mt-block rounded-[var(--nf-radius-lg)] border border-[color-mix(in_oklab,var(--nf-status-pending)_45%,transparent)] bg-[var(--nf-status-pending-surface)] p-row leading-relaxed text-[var(--nf-content-secondary)]"
        >
          A section above has reached fifty rows, which is as many as this screen
          reads at once. There are more waiting than are shown. Narrow by a phrase
          or a date to reach them.
        </p>
      )}
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
      <h2 className="mb-sm flex items-center gap-xs text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
        {title}
        <span className="nf-numeric rounded-[var(--nf-radius-control)] border border-[var(--nf-border-default)] px-xs py-3xs text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {count}
        </span>
      </h2>
      <ul className="flex flex-col gap-sm">{children}</ul>
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
    <div className="flex flex-wrap items-baseline gap-x-xs gap-y-2xs">
      <span className="text-[var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
        {label ?? (handle ? `@${handle}` : "A member")}
      </span>
      {handle ? (
        <Link href={`/u/${handle}`} className="text-[var(--nf-text-overline)] text-[var(--nf-brand-secondary)]">
          @{handle}
        </Link>
      ) : null}
      <span className="text-[var(--nf-text-overline)] uppercase tracking-wider text-[var(--nf-content-muted)]">
        {tag}
      </span>
      {place ? <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">{place}</span> : null}
      <span className="nf-numeric text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">{stamp(when)}</span>
    </div>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <p className="mt-xs text-[var(--nf-text-overline)] leading-relaxed text-[var(--nf-state-warning)]">
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
