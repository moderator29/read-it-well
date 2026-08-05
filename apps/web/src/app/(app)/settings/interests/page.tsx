import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { loadInterestsState } from "@/lib/interests/queries";
import { InterestChoices } from "@/components/app/welcome/InterestChoices";

export const metadata: Metadata = {
  title: "What you are here for",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Changing your mind about what you came here for.
 *
 * `/welcome` asks the question once at the door. This is the backstop, and it
 * is the same nine cards from the same component rather than a second copy:
 * the enum can grow, and a person who edits their answer later must be offered
 * every option somebody arriving today is offered.
 *
 * Signed out, this explains what the screen is for and offers the way in,
 * rather than showing cards that cannot be saved. Same shape as
 * `/settings/place`, because it is the same situation.
 */
export default async function InterestsSettingsPage() {
  const state = await loadInterestsState();

  if (state.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title="What you are here for" fallback="/settings" />
        <div className="nf-card p-6 text-center sm:p-8">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="globe-pin" fill />
          </span>
          <h2 className="nf-h3 mt-4">This one belongs to your account</h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {state.state === "unconfigured"
              ? "Accounts switch on the moment the platform keys land. What you are here for is kept on your account, so it follows you to every device."
              : "What you are here for is kept on your account, so it follows you to every device and decides what we put in front of you first."}
          </p>
          {state.state === "signed-out" && (
            <Link href="/sign-in" className="nf-btn nf-btn--primary mt-5 w-full sm:w-auto">
              Sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg" data-testid="interests-settings">
      <PageHeader
        title="What you are here for"
        subtitle="Choose as many as you like, or none at all"
        fallback="/settings"
      />
      <div className="nf-card p-5 sm:p-6">
        <InterestChoices initial={state.interests} mode="settings" />
      </div>
    </div>
  );
}
