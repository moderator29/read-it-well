import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileEditor } from "@/components/social/profile/ProfileEditor";
/* ONE empty-state anatomy across the whole product. See EmptyPanel. */
import { EmptyPanel } from "@/components/social/profile/EmptyPanel";
import { ProfilePhotos } from "@/components/social/profile/ProfilePhotos";
import { loadProfileEditor, normaliseHandle } from "@/lib/social/profiles-queries";
import { SocialPaused } from "@/components/social/SocialPaused";
import { isSocialEnabled } from "@/lib/social/flag";
import { withNext } from "@/lib/auth/next-link";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceSocial.editProfile.title };
}

/**
 * `/u/[handle]/edit`: the profile editor, as a full page.
 *
 * Full page and never a partial drawer, because this is where somebody chooses
 * the name they will be known by and writes the sentence that introduces them.
 * That deserves the whole screen.
 *
 * The route is deliberately reachable for a handle nobody holds yet. That is
 * how a first claim happens: `/u/tolu` tells a visitor the name is free, and
 * this is where it is taken. Every other outcome is designed rather than
 * redirected, so nobody arrives at a screen that simply refuses.
 */
export default async function EditSocialProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handle = normaliseHandle(raw);
  const w = getDictionary(await getLocale()).experienceSocial.editProfile;
  const h = (text: string) => text.replaceAll("{handle}", handle);
  if (!(await isSocialEnabled())) return <SocialPaused title={`@${handle}`} />;
  const editor = await loadProfileEditor(raw);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={editor.state === "editing" ? w.title : w.yourProfile}
        subtitle={`@${handle}`}
        fallback={`/u/${handle}`}
      />

      {editor.state === "unconfigured" && (
        <EmptyPanel
          icon="user-check"
          title={w.unreachableTitle}
          body={w.unreachableBody}
          action={{ href: "/home", label: w.backToHome }}
        />
      )}

      {editor.state === "signed-out" && (
        <EmptyPanel
          icon="user-check"
          title={w.signedOutTitle}
          body={h(w.signedOutBody)}
          action={{ href: withNext("/sign-in", `/u/${encodeURIComponent(handle)}/edit`), label: w.signIn }}
          secondary={{ href: `/u/${handle}`, label: w.seeProfile }}
        />
      )}

      {editor.state === "taken" && (
        <EmptyPanel
          icon="shield-check"
          title={h(w.takenTitle)}
          body={w.takenBody}
          action={{ href: `/u/${handle}`, label: h(w.visit) }}
          secondary={{ href: "/profile", label: w.backToAccount }}
        />
      )}

      {editor.state === "not-yours" && (
        <EmptyPanel
          icon="user-verified"
          title={w.notYoursTitle}
          body={h(w.notYoursBody).replace("{own}", editor.ownHandle)}
          action={{ href: `/u/${editor.ownHandle}/edit`, label: w.title }}
          secondary={{ href: `/u/${handle}`, label: h(w.visit) }}
        />
      )}

      {editor.state === "claiming" && (
        <>
          <p className="mb-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {h(w.free)}
          </p>
          <ProfileEditor profile={null} initialHandle={handle} areas={editor.areas} />
        </>
      )}

      {editor.state === "editing" && (
        <>
          {/* The photos write on their own, the moment one is chosen, and they
              sit outside the form for that reason: a picture is not something
              anybody expects to have to press Save for. */}
          <div className="mb-sm">
            <ProfilePhotos
              userId={editor.profile.userId}
              handle={editor.profile.handle}
              coverUrl={editor.profile.coverUrl}
              avatarUrl={editor.profile.avatarUrl}
              displayName={editor.profile.displayLabel}
            />
          </div>
          <ProfileEditor
            profile={editor.profile}
            initialHandle={editor.profile.handle}
            areas={editor.areas}
          />
        </>
      )}
    </div>
  );
}
