import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveSession } from "@/lib/actions/session";
import {
  getStory,
  getStoryComments,
  getStoryFaces,
  listStories,
} from "@/lib/social/stories-queries";
import { loadPublicProfile } from "@/lib/social/profiles-queries";
import { StoryViewer } from "@/components/social/story/StoryViewer";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const story = await getStory(id);
  if (!story) return { title: "Story" };
  return {
    title: story.headline,
    description: story.standfirst ?? undefined,
  };
}

/**
 * One story.
 *
 * `/stories/[id]` is the address every notification links to, so this route is
 * load bearing rather than convenient. A story that does not resolve renders
 * the designed not found, whether it never existed, was removed, sits in a
 * paused place, or belongs to somebody who has blocked this reader. Telling
 * those apart would leak the existence of each, and `private.can_see_story`
 * already refuses all four the same way.
 */
export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await isSocialEnabled())) return <SocialPaused title="Story" />;
  const [story, session] = await Promise.all([getStory(id), resolveSession()]);
  if (!story) notFound();

  const [faces, comments, more, author] = await Promise.all([
    getStoryFaces(story.id, story.likeCount),
    getStoryComments(story.id),
    listStories({ limit: 12 }),
    story.author.handle
      ? loadPublicProfile(story.author.handle)
      : Promise.resolve(null),
  ]);

  return (
    <StoryViewer
      story={story}
      faces={faces.faces}
      overflow={faces.overflow}
      comments={comments}
      more={more}
      signedIn={session.state === "signed-in"}
      viewerFollows={author?.state === "found" ? author.viewerFollows : false}
    />
  );
}
