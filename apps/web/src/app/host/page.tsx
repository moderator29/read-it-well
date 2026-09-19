import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { getMyBusinesses, getMyHostDraft, type MyBusiness } from "@/lib/host/queries";
import { missingFrom, type HostDraft } from "@/lib/host/onboarding";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, Row, RowList, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { HostShell } from "@/components/host/HostShell";

export const metadata: Metadata = {
  title: "Host",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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
 * /host: where a host stands.
 *
 * Every business on the account with its state, the reviewer's words where
 * there are any, and the one next thing: start, continue, or answer. The
 * verification ladder's meaning is written on the row rather than as a
 * tick, per the research (section 3.6): a tier is rungs passed with no gap.
 */
export default async function HostPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await resolveSession();

  if (session.state !== "signed-in") {
    const next = returnHref("/host", "", "list");
    return (
      <HostShell logoLabel={t.a11y.logoHome}>
        <EmptyState
          icon="hotel"
          title="Host on Vallo"
          body="List a hotel, a guest house, serviced apartments or a restaurant. Sign in and the application saves to your account as you go."
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  const [businesses, draft] = await Promise.all([getMyBusinesses(), getMyHostDraft()]);

  return (
    <HostShell logoLabel={t.a11y.logoHome}>
      <HostStandingBody businesses={businesses} draft={draft.businessId ? draft : null} />
    </HostShell>
  );
}

/**
 * Where a host stands, apart from its reads.
 *
 * Separated so the whole screen can be rendered from fixtures in the preview
 * harness and read against the register at 390 dark. The route passes exactly
 * what it read; nothing here fetches anything.
 */
export function HostStandingBody({
  businesses,
  draft: open,
}: {
  businesses: MyBusiness[];
  /** The application still in progress, or null when there is none. */
  draft: HostDraft | null;
}) {
  const missing = open ? missingFrom(open) : [];

  return (
    <>
      <div className="nf-agent-head">
        <div>
          <h1 className="nf-agent-head__title">Host</h1>
          <p className={`mt-row ${TYPE.bodyLg}`}>
            {businesses.length === 0
              ? "Nothing listed yet. One application, saved as you go."
              : `${businesses.length} business${businesses.length === 1 ? "" : "es"} on this account.`}
          </p>
        </div>
        <ButtonLink href="/host/apply" variant="primary">
          <BrandIcon name="hotel" size={24} />
          {open ? "Continue the application" : "Start an application"}
        </ButtonLink>
      </div>

      <Stack>
        {open && (
          <Section
            title={open.status === "SUBMITTED" ? "With our team" : "In progress"}
            description={
              open.status === "SUBMITTED"
                ? "A person reads it next. We write to you when it has been read."
                : missing.length === 0
                  ? "Everything is in. Open it and send it for review."
                  : `${missing.length} thing${missing.length === 1 ? "" : "s"} still to add before it can be sent.`
            }
          >
            <Link href="/host/apply" className="nf-host-choice">
              <span className="nf-host-choice__mark" aria-hidden="true">
                <BrandIcon name="doc-review" fill />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>{open.name || "Your business"}</span>
                <span className={`block ${TYPE.rowMeta}`}>{STATUS_WORD[open.status ?? "DRAFT"] ?? open.status}</span>
              </span>
              <UiIcon name="chevron-right" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
            </Link>
          </Section>
        )}

        {businesses.length > 0 && (
          <Section title="Your businesses">
            <RowList boxed>
              {businesses.map((business) => (
                <Row key={business.id} className="flex-col items-stretch gap-xs py-md">
                  {/*
                    THE NAME AND THE STATE DO NOT SHARE A LINE ON A PHONE.

                    "The Harbour Kitchen" beside "Needs more from you" left
                    about 120px for a business name, so the name broke in two
                    and the pill sat across its second line. A grid rather
                    than a flex row, because the two of them are a stack at
                    390 and a pair from `sm` up, and that is a layout
                    statement rather than a wrapping accident.
                  */}
                  <div className="grid gap-2xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-sm">
                    <span className="min-w-0">
                      <span className={`block ${TYPE.rowTitle}`}>{business.name}</span>
                      <span className={`block ${TYPE.rowMeta}`}>
                        Tier {business.verificationTier} of 4
                        {business.verified ? ", verified" : ""}
                      </span>
                    </span>
                    <StatusPill
                      tone={toneForStatus(business.status)}
                      className="justify-self-start sm:justify-self-end"
                    >
                      {STATUS_WORD[business.status] ?? business.status}
                    </StatusPill>
                  </div>
                  {business.reviewNotes && (
                    <p className={`${TYPE.rowMeta} whitespace-pre-wrap`}>{business.reviewNotes}</p>
                  )}
                  {/*
                    THE TWO DOORS A VENUE OWNER NEEDS, and neither existed.
                    `private.notify_reservation` has pointed a business host at
                    /host/reservations since M7 with no such route, and an
                    owner's own photographs had nowhere to go at all. Drawn for
                    a restaurant only: a stay's photographs hang on its
                    property, and a link to a surface that cannot show what it
                    saved is worse than no link.
                  */}
                  {business.kind === "restaurant" && (
                    <div className="flex flex-wrap gap-inline">
                      <Link href="/host/reservations" className="nf-chip">
                        Tables
                      </Link>
                      <Link href={`/host/photos?business=${business.id}`} className="nf-chip">
                        Photographs
                      </Link>
                    </div>
                  )}
                </Row>
              ))}
            </RowList>
          </Section>
        )}

        {!open && businesses.length === 0 && (
          <EmptyState
            icon="hotel"
            title="Become a host"
            body="Ten short steps at most, saved as you go. A person on our team reads it, and the badge only ever means a human was checked."
            action={
              <ButtonLink href="/host/apply" variant="primary" size="lg">
                Start
              </ButtonLink>
            }
          />
        )}
      </Stack>
    </>
  );
}
