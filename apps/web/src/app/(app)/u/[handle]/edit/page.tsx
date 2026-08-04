import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileEditor } from "@/components/social/profile/ProfileEditor";
import { ProfileNotice } from "@/components/social/profile/ProfileNotice";
import { ProfilePhotos } from "@/components/social/profile/ProfilePhotos";
import { loadProfileEditor, normaliseHandle } from "@/lib/social/profiles-queries";

export const metadata: Metadata = { title: "Edit your profile" };

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
  const editor = await loadProfileEditor(raw);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={editor.state === "editing" ? "Edit your profile" : "Your profile"}
        subtitle={`@${handle}`}
        fallback={`/u/${handle}`}
      />

      {editor.state === "unconfigured" && (
        <ProfileNotice
          icon="user-check"
          title="Profiles switch on shortly"
          body="The platform keys are not in place yet, so a handle cannot be claimed from here. Nothing you typed was lost. Everything else in the app works as normal."
          primary={{ href: "/home", label: "Back to home" }}
        />
      )}

      {editor.state === "signed-out" && (
        <ProfileNotice
          icon="user-check"
          title="Sign in to claim your handle"
          body={`@${handle} is claimed from your own account, so people know a name belongs to one person. Sign in and it takes about a minute.`}
          primary={{ href: "/sign-in", label: "Sign in" }}
          secondary={{ href: `/u/${handle}`, label: "See the profile" }}
        />
      )}

      {editor.state === "taken" && (
        <ProfileNotice
          icon="shield-check"
          title={`@${handle} belongs to somebody else`}
          body="Handles are one to a person and they are never reassigned quietly. Pick another name and it is yours in one step."
          primary={{ href: `/u/${handle}`, label: `Visit @${handle}` }}
          secondary={{ href: "/profile", label: "Back to your account" }}
        />
      )}

      {editor.state === "not-yours" && (
        <ProfileNotice
          icon="user-verified"
          title="This is not your profile"
          body={`You already hold @${editor.ownHandle}. Edit that one, or visit @${handle} to see whose it is.`}
          primary={{ href: `/u/${editor.ownHandle}/edit`, label: "Edit your profile" }}
          secondary={{ href: `/u/${handle}`, label: `Visit @${handle}` }}
        />
      )}

      {editor.state === "claiming" && (
        <>
          <p className="mb-3 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            @{handle} is free. Take it and this becomes your address on RentMe.
          </p>
          <ProfileEditor profile={null} initialHandle={handle} areas={editor.areas} />
        </>
      )}

      {editor.state === "editing" && (
        <>
          {/* The photos write on their own, the moment one is chosen, and they
              sit outside the form for that reason: a picture is not something
              anybody expects to have to press Save for. */}
          <div className="mb-3">
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
