import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { sheetWordsOf } from "@/components/social/sheet-words";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { getThread } from "@/lib/social/posts-queries";
import { AroundFab } from "@/components/social/AroundFab";
import { ThreadView } from "./ThreadView";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return { title: "Post" };
  const who =
    thread.root.author?.displayLabel ??
    (thread.root.author?.handle ? `@${thread.root.author.handle}` : "Vallo");
  const title = `${who} on Around`;
  const description = thread.root.body?.slice(0, 160) ?? `A post on Around, on Vallo.`;
  const url = `${siteUrl().replace(/\/+$/, "")}/post/${id}`;
  /*
   * THE SHARE CARD (R3 finding F-10), AND WHY IT CARRIES NO POST PHOTOGRAPH.
   *
   * A post's media lives in the private `social-media` bucket and reaches the
   * page as a SIGNED url that expires. A signed url in an og:image is a card
   * that works for an hour and then shows a broken image for ever, which is
   * worse than the site card, so the root `opengraph-image.jpg` is left to do
   * this job. The author's avatar is not used either: on a text post it would
   * read as the subject of the link rather than as its author.
   */
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description, url },
    twitter: { card: "summary", title, description },
  };
}

/**
 * One post and everything under it.
 *
 * Opening a reply shows the whole thread from the top, so an answer always
 * arrives with the question rather than stranded on its own. That is what
 * `root_id` is denormalised for: the entire thread is one query, and the depth
 * cap of three means it is bounded and needs no pagination.
 *
 * A post that does not resolve renders the same not found whether it never
 * existed, was removed, sits in a paused place, or belongs to somebody who has
 * blocked this reader. Telling those apart would leak the existence of each.
 */
export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  /*
   * `?reply=1` means somebody arrived here by tapping the comment glyph on a
   * card rather than by tapping the card itself. The two are different
   * intentions and the page should answer the one they had: open with the
   * composer addressed and focused, under the whole conversation, so they can
   * see what they are joining and start typing without a second tap.
   *
   * In the address bar rather than in client state, so it survives a reload
   * and can be linked: "reply to this" is a shareable thing to hand somebody.
   */
  const wantsReply = (await searchParams).reply === "1";
  if (!(await isSocialEnabled())) return <SocialPaused title="Post" />;
  const [thread, session] = await Promise.all([getThread(id), resolveSession()]);
  if (!thread) notFound();

  const signedIn = session.state === "signed-in";

  return (
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
      <PageHeader
        title="Thread"
        subtitle={thread.root.areaName ? `Around ${thread.root.areaName}` : undefined}
        fallback={thread.root.areaSlug ? `/around/${thread.root.areaSlug}` : "/around"}
      />
      <ThreadView
        thread={thread}
        signedIn={signedIn}
        openReply={wantsReply}
        sheet={sheetWordsOf(getDictionary(await getLocale()))}
      />
      <AroundFab />
    </div>
  );
}
