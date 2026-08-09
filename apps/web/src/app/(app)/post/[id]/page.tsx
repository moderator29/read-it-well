import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { getThread } from "@/lib/social/posts-queries";
import { AroundFab } from "@/components/social/AroundFab";
import { ThreadView } from "./ThreadView";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

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
    (thread.root.author?.handle ? `@${thread.root.author.handle}` : "RentMe");
  return {
    title: `${who} on Around`,
    description: thread.root.body?.slice(0, 160) ?? undefined,
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
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <PageHeader
        title="Thread"
        subtitle={thread.root.areaName ? `Around ${thread.root.areaName}` : undefined}
        fallback={thread.root.areaSlug ? `/around/${thread.root.areaSlug}` : "/around"}
      />
      <ThreadView thread={thread} signedIn={signedIn} openReply={wantsReply} />
      <AroundFab />
    </div>
  );
}
