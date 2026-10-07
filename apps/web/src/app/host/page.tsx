import type { ReactNode } from "react";
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
import { Unfold } from "@/components/ui/Unfold";
import { readHostTableBoard } from "./reservations/board";
import { HostTodayView } from "./HostTodayView";
import { hostToday, type HostToday } from "./today";
import { IconPlate } from "@/components/ui/IconPlate";
import { gateFirstRun } from "@/components/app/feature-onboarding/first-run-store";
import { DeskFigure } from "@/components/workspace/DeskFigure";
import { readHostBookingSeries } from "./booking-series";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceHost.home.metaTitle, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
              {t.common.signIn}
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  /* ONE WAVE OF READS, THE GATE DECIDED FROM THE BUSINESSES ALONE. All five
     reads start together, as they always did, so a returning host waits for
     one round trip, not two (auditor A7). The first run can redirect, and that
     is decided from the businesses read; a redirect simply discards the other
     four, which keep running and are never awaited (the catch below only stops
     an abandoned rejection from being reported; the await further down still
     sees any failure). */
  const figureNow = new Date(requestNow());
  const rest = Promise.all([
    getMyHostDraft(),
    readHostRoomBookings(),
    readHostTableBoard(),
    loadUnreadCounts(session.supabase).then((counts) => counts?.total ?? null, () => null),
    /* The figure card (reference 5): room bookings made at this host's places. */
    readHostBookingSeries(figureNow),
  ]);
  rest.catch(() => {});
  const businesses = await getMyBusinesses();
  /* THE DESK'S FIRST RUN (north star 14.1, D11): once, for a member who
     hosts, so a first-time host meets what the figure at the top means. A
     guest who opens /host is not shown it and it is not marked seen for them
     (A3-S2). At most once per device until Session 2's record lands (W7-R1),
     never a block: the gate fails towards drawing the desk. */
  if (businesses.length > 0) await gateFirstRun("host", "/host", await searchParams);
  /* The workspace home's figures (plan item 14): the host's own rows. A read
     that fails comes back as null and its tile is left out. */
  const [draft, rooms, tables, unread, bookingRows] = await rest;
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
      <HostStandingBody
        businesses={businesses}
        draft={openDraft}
        locale={locale}
        today={today}
        t={t}
        figure={
          businesses.length > 0 ? (
            <DeskFigure rows={bookingRows} kind="bookings" t={t} locale={locale} now={figureNow} />
          ) : null
        }
      />
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
  figure,
  t = getDictionary(locale),
}: {
  businesses: MyBusiness[];
  locale?: Locale;
  /** The application still in progress, or null when there is none. */
  draft: HostDraft | null;
  /** The workspace home's figures (`hostToday`), computed from the host's rows. */
  today: HostToday;
  /** The figure card (reference 5); omitted, none is drawn. */
  figure?: ReactNode;
  t?: ReturnType<typeof getDictionary>;
}) {
  const missing = open ? missingFrom(open) : [];
  const words = t.experienceHost;
  const home = words.home;
  const statusWord = (status: string) => words.businessStatus[status as keyof typeof words.businessStatus] ?? status;
  const stoppedMeans = (status: string) => home.stopped[status as keyof typeof home.stopped] as string | undefined;

  return (
    <>
      <HostTodayView
        today={today}
        t={t}
        locale={locale}
        figure={figure}
        sub={
          businesses.length === 0
            ? t.hostWorkspace.nothingYet.home
            : home.onAccount.replace("{businesses}", countOf(businesses.length, "businesses", locale))
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
        {/*
          CLEAN SPACES (the unify recommendations, 7 October): the desk is one
          band, one figure and one list above. The application in progress and
          the businesses on the account fold one tap deeper, each with its
          count, instead of stacking three more groups under the list.
        */}
        {open || businesses.length > 0 ? (
          <Unfold
            headingLevel={2}
            data-testid="host-more"
            className="mt-block"
            items={[
              ...(open
                ? [
                    {
                      id: "application",
                      icon: "document" as const,
                      title: open.status === "SUBMITTED" ? home.draftWithTeam : home.draftInProgress,
                      hint: open.name || home.yourBusiness,
                      content: (
                        <ListGroup
                          label={open.status === "SUBMITTED" ? home.draftWithTeam : home.draftInProgress}
                        >
                          <ListRow
                            href="/host/apply"
                            leading={
                              <IconPlate size="sm" tone="brand">
                                <UiIcon name="file-text" size={20} />
                              </IconPlate>
                            }
                            title={open.name || home.yourBusiness}
                            sub={
                              open.status === "SUBMITTED"
                                ? home.draftReadNext
                                : missing.length === 0
                                  ? home.draftReady
                                  : home.draftMissing.replace("{things}", countOf(missing.length, "things", locale))
                            }
                            status={
                              <StatusPill tone={toneForStatus(open.status ?? "DRAFT")}>
                                {statusWord(open.status ?? "DRAFT")}
                              </StatusPill>
                            }
                          />
                        </ListGroup>
                      ),
                    },
                  ]
                : []),
              ...(businesses.length > 0
                ? [
                    {
                      id: "businesses",
                      icon: "building-hotel" as const,
                      title: home.businessesTitle,
                      hint: countOf(businesses.length, "businesses", locale),
                      content: (
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
                                      {(business.verified ? home.tierVerified : home.tier).replace("{tier}", String(business.verificationTier))}
                                    </span>
                                  </span>
                                  <StatusPill
                                    tone={toneForStatus(business.status)}
                                    className="justify-self-start sm:justify-self-end"
                                  >
                                    {statusWord(business.status)}
                                  </StatusPill>
                                </div>
                                {stoppedMeans(business.status) ? (
                                  <div
                                    className="nf-panel nf-panel--card p-sm"
                                    role="status"
                                    data-testid="host-business-stopped"
                                  >
                                    <p className={TYPE.rowMeta}>{stoppedMeans(business.status)}</p>
                                    <p className={`${TYPE.rowMeta} mt-2xs whitespace-pre-wrap`}>
                                      {business.reviewNotes
                                        ? home.reviewerWrote.replace("{note}", business.reviewNotes)
                                        : home.noReason}
                                    </p>
                                    {/* `block w-fit`, not `inline-block`: the theme's `--spacing-block`
                                        makes Tailwind's `inline-block` also set `inline-size:
                                        var(--nf-gap-block)`, which drew "Contact us" in a 32px box
                                        (AccessScreen.tsx records the same collision). */}
                                    <Link
                                      href="/contact?topic=verification"
                                      className="nf-tap mt-2xs block w-fit whitespace-nowrap text-[var(--nf-content-link)] underline-offset-4 hover:underline"
                                    >
                                      {home.contactUs}
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
                                      {words.businessDoors.tables}
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
                                      {words.businessDoors.rooms}
                                    </Link>
                                  )}
                                  <Link href={`/host/photos?business=${business.id}`} className="nf-chip">
                                    {words.businessDoors.photos}
                                  </Link>
                                  {/* V-57: every charge a guest can be asked for at the door. */}
                                  {business.kind !== "restaurant" && (
                                    <Link href={`/host/arrival?business=${business.id}`} className="nf-chip">
                                      {words.businessDoors.arrival}
                                    </Link>
                                  )}
                                </div>
                              </Row>
                            ))}
                          </RowList>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        ) : null}

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
