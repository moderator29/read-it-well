import Link from "next/link";
import { findMentions } from "@/lib/social/mentions-schema";
import { BOT_HANDLE } from "@/lib/social/bot-schema";

/**
 * The words in a post, with the handles in them turned into people.
 *
 * **`@aduke` used to be six plain characters.** This product has handles, a page
 * at `/u/[handle]` for every one of them, a follow graph and a `social`
 * notification kind, and a body of text was the one place none of it was
 * reachable: somebody wrote a name, the name did not link, and the person named
 * never found out. A conversation between people is mostly people addressing
 * each other, so this is not a nicety.
 *
 * **What it does, and where the other half lives.** This links, and it does not
 * notify, because notifying is not its job. Every social notification in this
 * product is written by a database trigger beside `notify_reaction` and
 * `notify_repost`, and `private.fan_out_post` has scanned bodies for `@handle`
 * since the notifications migration, capped at five per post, with the same for
 * story comments in `private.notify_story_event`. A second, application side
 * notifier would be one more place for the rules to drift.
 *
 * **Both ends now agree on what a mention is**, which they did not for a while:
 * the triggers matched `@handle` with nothing in front of it, so an email
 * address in a post notified a stranger and quoted the body at them, while this
 * renderer already refused to link it. Both sides read
 * `(^|[^A-Za-z0-9_@])@([a-z][a-z0-9_]{2,19})` now, and
 * `apps/web/tests/social-mentions.spec.mjs` proves the client half against
 * thirteen cases including that one.
 *
 * The parsing is deliberately dumb: handles, and nothing else. No markdown, no
 * autolinked bare URLs, no hashtags. A post body is somebody's sentence, not a
 * document, and every extra thing this recognises is another way for a
 * stranger's text to render as something its author did not type.
 *
 * A handle nobody holds still links, and `/u/[handle]` answers for it with the
 * designed page that offers to claim it. Checking every handle in every body
 * against the database first would be one query per card to prevent an outcome
 * that is already a designed page.
 *
 * **`@rentme` is the exception and it is not a link.** No account can ever hold
 * it: `private.validate_social_handle` refuses any handle containing `rentme`
 * outright, so a link would land somebody on a page offering them a name the
 * database will then refuse. It renders as a mark instead, which is also what it
 * is: the summon that brings the assistant into a thread.
 */
export function PostBody({ text, className }: { text: string; className?: string }) {
  const mentions = findMentions(text);
  if (mentions.length === 0) return <p className={className}>{text}</p>;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  mentions.forEach((mention, index) => {
    if (mention.start > cursor) nodes.push(text.slice(cursor, mention.start));
    const label = text.slice(mention.start, mention.end);
    nodes.push(
      mention.handle === BOT_HANDLE ? (
        <span key={`bot-${index}`} className="nf-post__summon">
          {label}
        </span>
      ) : (
        <Link
          key={`${mention.handle}-${index}`}
          href={`/u/${mention.handle}`}
          className="font-semibold text-[var(--nf-brand-secondary)]"
        >
          {label}
        </Link>
      ),
    );
    cursor = mention.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <p className={className}>{nodes}</p>;
}
