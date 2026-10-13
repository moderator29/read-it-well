import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
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
  return { title: getDictionary(await getLocale()).experienceSocial.follows.followingMeta.replace("{handle}", normaliseHandle(handle)) };
}

/** Who this person follows. The sibling of `followers`, same shell. */
export default async function FollowingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!(await isSocialEnabled())) return <SocialPaused title={`@${handle}`} />;
  return <FollowListPage handle={handle} direction="following" />;
}
