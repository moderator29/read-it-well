import type { Metadata } from "next";
import Link from "next/link";
import { countOf, DEFAULT_LOCALE, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { getMyBusinesses, getMyHostDraft, type MyBusiness } from "@/lib/host/queries";
import { missingFrom, type HostDraft } from "@/lib/host/onboarding";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, Row, RowList, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { HostShell } from "@/components/host/HostShell";
import { SuccessFromFlag } from "@/components/ui/SuccessFromFlag";
import { businessArrival } from "@/lib/ui/arrival-moments";
import { readHostRoomBookings } from "@/lib/host/room-bookings";
import { loadUnreadCounts } from "@/lib/messages/unread";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { readHostTableBoard } from "./reservations/board";
import { HostTodayView } from "./HostTodayView";
import { HOST_STATUS_WORD, hostToday, type HostToday } from "./today";
import { IconPlate } from "@/components/ui/IconPlate";

export const metadata: Metadata = {
  title: "Host",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_WORD = HOST_STATUS_WORD;

/**
 * What a stopped business can and cannot do, said on its own row.
 *
 * A refused or suspended host workspace opens here (`makeWorkspace`), so this
 * row is where somebody who has been stopped learns why. The reviewer's words
 * come first when there are any; these sentences say what the state means and
 * stand in for the reason when none was recorded, so a stop is never silent.
 */
const STOPPED_MEANS: Partial<Record<string, string>> = {
  SUSPENDED:
    "Our team has stopped this business. Guests cannot find or book it until the stop is lifted. Bookings already confirmed still stand.",
  REJECTED: "This application did not pass review, so guests cannot find it.",
  MORE_INFO_REQUIRED: "A reviewer needs something more before this can go live. Open the application to answer.",
};

/** Said when a stop carries no reviewer's note, rather than saying nothing. */
const NO_REASON_ON_FILE = "No reason was written on the business. Contact us and a person will tell you why.";

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
          title={t.hostWorkspace.home.signedOutTitle}
          body={t.hostWorkspace.home.signedOutBody}
          action={
            <ButtonLink href={authHref(next, "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  /* The workspace home's figures (plan item 14): the host's own rows, read
     together. A read that fails comes back as null and its tile is left out. */
  const [businesses, draft, rooms, tables, unread] = await Promise.all([
    getMyBusinesses(),
    getMyHostDraft(),
    readHostRoomBookings(),
    readHostTableBoard(),
    loadUnreadCounts(session.supabase).then((counts) => counts?.total ?? null, () => null),
  ]);
  const openDraft = draft.businessId ? draft : null;
  const today = hostToday({
    now: new Date(requestNow()),
    rooms: rooms.state === "ok" ? rooms : null,
    tables: tables.state === "ok" ? tables.board : null,
    unread,
    businesses: businesses.map((b) => ({ id: b.id, name: b.name, status: b.status })),
    /* The application in progress draws its own row under the dashboard,
       with its state and what is missing, so it is not listed twice. */
    draft: null,
  });
  /* A business approved or published in the staff console, whose notice
     lands here: once per device, while it is news (docs/SUCCESS_MOMENTS.md). */
  const approval = businessArrival(businesses, requestNow());

  return (
    <HostShell logoLabel={t.a11y.logoHome} wide>
      <SuccessFromFlag
        copy={t.success}
        show={approval !== null}
        moment={approval?.moment ?? "hostApproved"}
        values={approval?.values}
        seenKey={approval?.seenKey ?? "host-approved:none"}
        haptic={false}
      />
      <HostStandingBody businesses={businesses} draft={openDraft} locale={locale} today={today} t={t} />
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
  locale = DEFAULT_LOCALE,
  today,
  t = getDictionary(locale),
}: {
  businesses: MyBusiness[];
  locale?: Locale;
  /** The application still in progress, or null when there is none. */
  draft: HostDraft | null;
  /** The workspace home's figures (`hostToday`), computed from the host's rows. */
  today: HostToday;
  t?: ReturnType<typeof getDictionary>;
}) {
  const missing = open ? missingFrom(open) : [];

  return (
    <>
      <HostTodayView
        today={today}
        t={t}
        locale={locale}
        sub={
          businesses.length === 0
            ? t.hostWorkspace.nothingYet.home
            : `${countOf(businesses.length, "businesses", locale)} on this account.`
        }
        action={
          /* A HOST WHO HAS NOT STARTED IS ASKED WHAT THEY ARE, NOT ASKED TO
             FILL IN A FORM. `/host/start` draws the three stays doors of
             GOVERNING-09; a host with an application already open goes
             straight back to it, because the question has been answered. */
          <ButtonLink href={open ? "/host/apply" : "/profile/setup?side=stays"} variant="primary">
            {open ? t.hostWorkspace.doors.continueApplication : t.hostWorkspace.doors.startApplication}
          </ButtonLink>
        }
      />

      <Stack>
        {open && (
          <ListGroup
            label={open.status === "SUBMITTED" ? "With our team" : "In progress"}
          >
            <ListRow
              href="/host/apply"
              leading={
                <IconPlate size="sm" tone="brand">
                  <UiIcon name="file-text" size={20} />
                </IconPlate>
              }
              title={open.name || "Your business"}
              sub={
                open.status === "SUBMITTED"
                  ? "A person reads it next. We write to you when it has been read."
                  : missing.length === 0
                    ? "Everything is in. Open it and send it for review."
                    : `${countOf(missing.length, "things", locale)} still to add before it can be sent.`
              }
              status={
                <StatusPill tone={toneForStatus(open.status ?? "DRAFT")}>
                  {STATUS_WORD[open.status ?? "DRAFT"] ?? open.status}
                </StatusPill>
              }
            />
          </ListGroup>
        )}

        {businesses.length > 0 && (
          <section className="nf-list-section">
            <div className="nf-list-section__head">
              <h2 className="nf-section-label">Your businesses</h2>
            </div>
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
                  {STOPPED_MEANS[business.status] ? (
                    <div
                      className="nf-panel nf-panel--card p-sm"
                      role="status"
                      data-testid="host-business-stopped"
                    >
                      <p className={TYPE.rowMeta}>{STOPPED_MEANS[business.status]}</p>
                      <p className={`${TYPE.rowMeta} mt-2xs whitespace-pre-wrap`}>
                        {business.reviewNotes
                          ? `The reviewer wrote: ${business.reviewNotes}`
                          : NO_REASON_ON_FILE}
                      </p>
                      <Link
                        href="/contact?topic=verification"
                        className="mt-2xs inline-block whitespace-nowrap text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                      >
                        Contact us
                      </Link>
                    </div>
                  ) : (
                    business.reviewNotes && (
                      <p className={`${TYPE.rowMeta} whitespace-pre-wrap`}>{business.reviewNotes}</p>
                    )
                  )}
                  {/*
                    THE DOORS A VENUE OWNER NEEDS, and none of them existed.
                    `private.notify_reservation` has pointed a business host at
                    /host/reservations since M7 with no such route, and an
                    owner's own photographs had nowhere to go at all.

                    PHOTOGRAPHS ARE NOW DRAWN FOR A STAY AS WELL. The note here
                    used to say a stay's photographs hang on its property and a
                    link to a surface that cannot show what it saved is worse
                    than no link, which was true while `accommodation_photos`
                    had no writer anywhere in the application. /host/photos now
                    serves both spines, so the door is honest on both.
                  */}
                  <div className="flex flex-wrap gap-inline">
                    {business.kind === "restaurant" ? (
                      <Link href="/host/reservations" className="nf-chip">
                        Tables
                      </Link>
                    ) : (
                      /* ROOMS AND NIGHTS, for the same reason Tables exists on
                         the other spine. `stays_search` treats a night with no
                         `room_inventory` row as not offered, so a hotel with no
                         rows cannot be found by anybody who types dates, and
                         nothing in the application wrote or read that table
                         until now. This is where a host sees how far ahead they
                         are bookable and changes it. */
                      <Link href={`/host/rooms?business=${business.id}`} className="nf-chip">
                        Rooms and nights
                      </Link>
                    )}
                    <Link href={`/host/photos?business=${business.id}`} className="nf-chip">
                      Photographs
                    </Link>
                    {/* V-57: every charge a guest can be asked for at the door. */}
                    {business.kind !== "restaurant" && (
                      <Link href={`/host/arrival?business=${business.id}`} className="nf-chip">
                        Charges at the door
                      </Link>
                    )}
                  </div>
                </Row>
              ))}
            </RowList>
          </section>
        )}

        {!open && businesses.length === 0 && (
          <EmptyState
            icon="hotel"
            title={t.hostWorkspace.home.startTitle}
            body={t.hostWorkspace.home.startBody}
            action={
              /* ONE PRIMARY PER SCREEN (T-44). The band above already holds
                 the start door as the screen's primary, to the same
                 door, so this one is the quiet second way in. */
              <ButtonLink href="/profile/setup?side=stays" variant="secondary" size="lg">
                {t.hostWorkspace.doors.start}
              </ButtonLink>
            }
          />
        )}
      </Stack>
    </>
  );
}

/** The request's clock, read once, so the page agrees with itself. */
function requestNow(): number {
  return Date.now();
}
