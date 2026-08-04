import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { listMyAreas } from "@/lib/social/areas-queries";
import { StoryComposer } from "@/components/social/story/StoryComposer";
import { ProfileNotice } from "@/components/social/profile/ProfileNotice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Write a story" };

/**
 * Writing a story.
 *
 * Only places somebody has actually joined are offered. `stories_insert_self`
 * refuses a story into anything that is not ACTIVE, so listing a place a person
 * cannot write in would be offering them a refusal.
 */
export default async function NewStoryPage() {
  const session = await resolveSession();

  if (session.state === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
        <PageHeader title="Write a story" fallback="/around" />
        <ProfileNotice
          icon="camera"
          title="Stories switch on shortly"
          body="The platform keys are not in place yet, so nothing can be published from here. Everything else in the app works as normal."
          primary={{ href: "/home", label: "Back to home" }}
        />
      </div>
    );
  }

  const signedIn = session.state === "signed-in";
  const mine = signedIn ? await listMyAreas() : [];
  const areas = mine
    .filter((area) => area.status === "ACTIVE")
    .map((area) => ({ id: area.id, name: area.name, city: area.city }));

  return (
    <div className="mx-auto w-full max-w-2xl pb-24 pt-4">
      <PageHeader
        title="Write a story"
        subtitle="A picture, a headline, and a line or two. It stays up."
        fallback="/around"
      />
      <StoryComposer
        areas={areas}
        userId={signedIn ? session.user.id : null}
        signedIn={signedIn}
      />
    </div>
  );
}
