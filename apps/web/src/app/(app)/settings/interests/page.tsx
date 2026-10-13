import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import Link from "next/link";
import { withNext } from "@/lib/auth/next-link";
import { PageHeader } from "@/components/app/PageHeader";
import { loadInterestsState } from "@/lib/interests/queries";
import { InterestChoices } from "@/components/app/welcome/InterestChoices";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";

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
  const t = getDictionary(await getLocale());
  const state = await loadInterestsState();

  if (state.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title={t.interests.screenTitle} fallback="/settings" />
        <div className="nf-panel nf-panel--card block p-lg text-center sm:p-xl">
          <IconPlate size="lg" className="mx-auto">
            <UiIcon name="user" size={24} />
          </IconPlate>
          <h2 className="nf-h3 mt-md">{t.interests.accountTitle}</h2>
          <p className="mx-auto mt-xs max-w-[42ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            {state.state === "unconfigured"
              ? t.interests.accountBodyUnconfigured
              : t.interests.accountBodySignedOut}
          </p>
          {state.state === "signed-out" && (
            <Link href={withNext("/sign-in", "/settings/interests")} className="nf-btn nf-btn--primary mt-md w-full sm:w-auto">
              {t.common.signIn}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg" data-testid="interests-settings">
      <PageHeader
        title={t.interests.screenTitle}
        subtitle={t.interests.screenSubtitle}
        fallback="/settings"
      />
      <div className="nf-panel nf-panel--card block p-lg sm:p-lg">
        <InterestChoices initial={state.interests} mode="settings" t={t} />
      </div>
    </div>
  );
}
