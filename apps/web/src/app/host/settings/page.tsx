import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Dictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { getMyBusinesses, type MyBusiness } from "@/lib/host/queries";
import { loadSettingsState } from "@/lib/profile/queries";
import type { ResolvedProfileSettings } from "@/lib/profile/schema";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, Row, RowList, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { HostShell } from "@/components/host/HostShell";
import { AccountNotificationsCard } from "../../(app)/settings/AccountToggles";

export const metadata: Metadata = {
  title: "Host settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const KIND_WORD: Record<MyBusiness["kind"], string> = {
  hotel: "Hotel",
  serviced_apartments: "Serviced apartments",
  guest_house: "Guest house",
  resort: "Resort",
  shortlet_operator: "Shortlets",
  restaurant: "Restaurant",
  agency: "Agency",
};

const STATUS_WORD: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "With our team",
  UNDER_REVIEW: "Being read",
  MORE_INFO_REQUIRED: "Needs more from you",
  APPROVED: "Approved",
  PUBLISHED: "Live",
  REJECTED: "Not approved",
  SUSPENDED: "Suspended",
};

/**
 * /host/settings: the host workspace's own settings.
 *
 * What a host controls about the workspace, in the workspace: each business
 * and the screens that change it, what reaches them about bookings and
 * messages, and the assistant. What is one account wide (language, theme,
 * privacy, security, deletion) stays on the account's settings page and is
 * one tap away from here, never copied into a second place.
 *
 * The notification switches are the same preference document `/settings`
 * and `/agent/settings` write, in the host's words.
 */
export default async function HostSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  if (session.state !== "signed-in") {
    const next = returnHref("/host/settings", "", "list");
    return (
      <HostShell fallback="/host">
        <EmptyState
          icon="hotel"
          title={t.hostWorkspace.settings.signedOutTitle}
          body={t.hostWorkspace.settings.signedOutBody}
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  const [businesses, account] = await Promise.all([getMyBusinesses(), loadSettingsState()]);

  return (
    <HostShell fallback="/host">
      <HostSettingsBody
        t={t}
        businesses={businesses}
        notifications={account.state === "signed-in" ? account.settings.notifications : null}
      />
    </HostShell>
  );
}

/**
 * The body of /host/settings, apart from its reads, so a harness can draw it
 * from fixtures. Nothing here fetches anything.
 */
export function HostSettingsBody({
  t,
  businesses,
  notifications,
}: {
  t: Dictionary;
  businesses: MyBusiness[];
  /** Null when the preference document could not be read. */
  notifications: ResolvedProfileSettings["notifications"] | null;
}) {
  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Settings</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>Your businesses, what reaches you, and your assistant.</p>
        </div>
      </div>

      <Stack>
        <Section title={t.hostWorkspace.settings.businessesTitle}>
          {businesses.length === 0 ? (
            <div className="nf-panel nf-panel--card p-panel">
              <p className={TYPE.rowMeta}>Nothing listed yet. Your businesses appear here once you apply.</p>
              <div className="mt-sm">
                <ButtonLink href="/profile/setup?side=stays" variant="secondary" size="sm">
                  Start an application
                </ButtonLink>
              </div>
            </div>
          ) : (
            <RowList boxed>
              {businesses.map((business) => (
                <Row key={business.id} className="flex-col items-stretch gap-xs py-md">
                  <div className="grid gap-2xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-sm">
                    <span className="min-w-0">
                      <span className={`block ${TYPE.rowTitle}`}>{business.name}</span>
                      <span className={`block ${TYPE.rowMeta}`}>
                        {KIND_WORD[business.kind]}, tier {business.verificationTier} of 4
                      </span>
                    </span>
                    <StatusPill
                      tone={toneForStatus(business.status)}
                      className="justify-self-start sm:justify-self-end"
                    >
                      {STATUS_WORD[business.status] ?? business.status}
                    </StatusPill>
                  </div>
                  <div className="flex flex-wrap gap-inline">
                    {business.kind === "restaurant" ? (
                      <Link href="/host/reservations" className="nf-chip">
                        Tables
                      </Link>
                    ) : (
                      <Link href={`/host/rooms?business=${business.id}`} className="nf-chip">
                        Rooms and nights
                      </Link>
                    )}
                    <Link href={`/host/photos?business=${business.id}`} className="nf-chip">
                      Photographs
                    </Link>
                    {business.kind !== "restaurant" && (
                      <Link href={`/host/arrival?business=${business.id}`} className="nf-chip">
                        Charges at the door
                      </Link>
                    )}
                    <Link href="/host/transfer" className="nf-chip">
                      Hand over
                    </Link>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Section>

        {notifications ? (
          <AccountNotificationsCard t={t} initial={notifications} variant="host" />
        ) : (
          <div className="nf-panel nf-panel--card p-panel">
            <p className={TYPE.rowMeta}>We cannot reach your notification preferences right now.</p>
          </div>
        )}

        <Link href="/host/assistant" className="nf-panel nf-panel--card nf-host-choice">
          <span className="nf-host-choice__mark" aria-hidden="true">
            <UiIcon name="sparkle" size={24} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block ${TYPE.rowTitle}`}>Assistant</span>
            <span className={`block ${TYPE.rowMeta}`}>Ask about running your stay or restaurant, without leaving.</span>
          </span>
          <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
        </Link>

        <div className="nf-panel nf-panel--card block p-panel">
          <p className="nf-overline">Everything else</p>
          <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            Language, theme, privacy, security and account deletion are one account wide, so they live on your
            Vallo settings page rather than being kept in two places.
          </p>
          <Link href="/settings" className="nf-btn nf-btn--glass nf-btn--sm mt-md">
            Open account settings
          </Link>
        </div>
      </Stack>
    </>
  );
}
