import Link from "next/link";
import { findMentions } from "@/lib/social/mentions-schema";

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
 * **What it does and, precisely, what it does not.** It links. It does not
 * notify, and nothing on this screen claims it does. Every social notification
 * in this product is written by a database trigger beside `notify_reaction` and
 * `notify_repost`, and a second, application-side notifier would be one more
 * place for the rules to drift. The mention trigger does not exist yet;
 * `docs/SOCIAL_AUDIT.md` carries the exact shape it needs. Until it lands, a
 * mention is a link and only a link, which is a true thing rather than half of a
 * promise.
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
 */
export function PostBody({ text, className }: { text: string; className?: string }) {
  const mentions = findMentions(text);
  if (mentions.length === 0) return <p className={className}>{text}</p>;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  mentions.forEach((mention, index) => {
    if (mention.start > cursor) nodes.push(text.slice(cursor, mention.start));
    nodes.push(
      <Link
        key={`${mention.handle}-${index}`}
        href={`/u/${mention.handle}`}
        className="font-semibold text-[var(--nf-brand-secondary)]"
      >
        {text.slice(mention.start, mention.end)}
      </Link>,
    );
    cursor = mention.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <p className={className}>{nodes}</p>;
}
