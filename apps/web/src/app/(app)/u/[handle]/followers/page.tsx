import type { Metadata } from "next";
import { FollowListPage } from "@/components/social/profile/FollowListPage";
import { normaliseHandle } from "@/lib/social/profiles-queries";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `Followers of @${normaliseHandle(handle)}` };
}

/**
 * Who follows this person.
 *
 * `follows_select` is public and the counts on the profile are real, so this is
 * the page the Followers number points at. A count that leads nowhere is a dead
 * end wearing a number, which is the whole reason this route exists.
 */
export default async function FollowersPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!(await isSocialEnabled())) return <SocialPaused title={`@${handle}`} />;
  return <FollowListPage handle={handle} direction="followers" />;
}
