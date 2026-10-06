import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { listMyAreas } from "@/lib/social/areas-queries";
import { StoryComposer } from "@/components/social/story/StoryComposer";
import { EmptyPanel } from "@/components/social/profile/EmptyPanel";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceSocial.newStory.title };
}

/**
 * Writing a story.
 *
 * Only places somebody has actually joined are offered. `stories_insert_self`
 * refuses a story into anything that is not ACTIVE, so listing a place a person
 * cannot write in would be offering them a refusal.
 */
export default async function NewStoryPage() {
  const words = getDictionary(await getLocale()).experienceSocial.newStory;
  if (!(await isSocialEnabled())) return <SocialPaused title={words.title} />;

  const session = await resolveSession();

  if (session.state === "unconfigured") {
    return (
      <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
        <PageHeader title={words.title} fallback="/around" />
        <EmptyPanel
          icon="camera"
          title={words.unreachableTitle}
          body={words.unreachableBody}
          action={{ href: "/home", label: words.backToHome }}
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
    <div className="mx-auto w-full max-w-2xl pb-4xl pt-md">
      <PageHeader
        title={words.title}
        subtitle={words.lede}
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
