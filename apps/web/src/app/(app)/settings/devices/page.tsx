import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Dictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { loadSessions, type DeviceSession } from "@/lib/security/sessions";
import { sessionWhen, type SessionWhen } from "@/lib/security/when";
import { DeviceList, type DeviceRow } from "./DeviceList";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).settings.devices.screenTitle,
    robots: { index: false, follow: false },
  };
}

/*
 * Never cached, and this is the one screen where that is a security property
 * rather than a freshness one. A session list served from a cache is a list of
 * devices that were signed in at some point in the past, shown to somebody who
 * is deciding right now whether to trust what is on it.
 */
export const dynamic = "force-dynamic";

/**
 * Where you are signed in. SEC-5.
 *
 * The account holds a wallet, so this is not a settings nicety. A phone left in
 * a taxi is either recoverable by its owner in thirty seconds or it becomes a
 * support ticket, and a support ticket is a stranger deciding whether to
 * believe you.
 *
 * ## What is on this screen, and what is deliberately not
 *
 * Each row carries when the session began, when it was last used, and the
 * device where we honestly have one. There is NO location, not even an
 * approximate one, and its absence is the considered answer rather than a gap:
 * `auth.sessions.ip` records whoever last refreshed the token, the refresh runs
 * in our own middleware, so the address on the row is a data centre's. A city
 * drawn from that would be a confident lie in the one place a person is making
 * a security decision. `lib/security/sessions.ts` carries the full reasoning
 * and `my_sessions()` does not return the column at all.
 *
 * The formatting all happens here rather than in the client component below.
 * The actions call `revalidatePath` and this re-renders, so the list is server
 * truth after every button; a client component holding its own copy of the
 * sessions would be one stale render away from telling somebody a device they
 * just ended is still signed in.
 */
export default async function DevicesPage() {
  const t = getDictionary(await getLocale());
  const copy = t.settings.devices;
  const state = await loadSessions();

  if (state.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader title={copy.screenTitle} fallback="/settings" />
        <div className="nf-card p-card text-center">
          <span className="mx-auto block h-16 w-16">
            <BrandIcon name="globe-pin" fill />
          </span>
          <h2 className="nf-h3 mt-heading">{copy.accountTitle}</h2>
          <p className="mx-auto mt-block max-w-[42ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {state.state === "unconfigured"
              ? copy.accountBodyUnconfigured
              : copy.accountBodySignedOut}
          </p>
          {state.state === "signed-out" && (
            <Link href="/sign-in" className="nf-btn nf-btn--primary mt-block w-full sm:w-auto">
              {t.common.signIn}
            </Link>
          )}
        </div>
      </div>
    );
  }

  /* The clock comes from the read, not from the render. See `SessionsState`. */
  const rows = state.sessions.map((session) => toRow(session, t, state.readAt));

  return (
    <div className="mx-auto max-w-lg" data-testid="devices-settings">
      <PageHeader title={copy.screenTitle} fallback="/settings" />
      <DeviceList
        rows={rows}
        readable={state.readable}
        copy={{
          intro: copy.intro,
          caveat: copy.caveat,
          endThis: copy.endThis,
          endCurrent: copy.endCurrent,
          endOthers: copy.endOthers,
          endOthersSub: copy.endOthersSub,
          endOthersNone: copy.endOthersNone,
          confirm: copy.confirm,
          working: copy.working,
          endedOne: copy.endedOne,
          endedOthers: copy.endedOthers,
          endedNone: copy.endedNone,
          unreadable: copy.unreadable,
        }}
      />
    </div>
  );
}

/**
 * One session, turned into the four strings the list draws.
 *
 * The device name is assembled from the fixed proper nouns `describeDevice`
 * returns, never from the raw `User-Agent`. That header is written by whoever
 * signs in, and an attacker who can put their own sentence into the row labelled
 * "Device" has a free line of copy on a security screen. See
 * `lib/security/device.ts`.
 */
function toRow(session: DeviceSession, t: Dictionary, now: number): DeviceRow {
  const copy = t.settings.devices;
  const security = t.settings.security;
  const { kind, browser, platform } = session.device;

  const device =
    kind === "device"
      ? security.deviceOn
          .replace("{browser}", browser ?? security.unknownBrowser)
          .replace("{os}", platform ?? security.unknownOs)
      : kind === "unrecognised"
        ? copy.deviceUnrecognised
        : copy.deviceUnknown;

  /* Only the rows that genuinely do not know say why. An unrecognised agent is
     a real device we could not name and needs no apology; a `server` or
     `unrecorded` row is our own architecture showing through, and a person
     asked "do you recognise this?" about it deserves to be told. */
  const deviceNote = kind === "server" || kind === "unrecorded" ? copy.deviceUnknownSub : undefined;

  return {
    id: session.id,
    isCurrent: session.isCurrent,
    device,
    deviceNote,
    thisDevice: copy.thisDevice,
    signedIn: phrase(copy.signedInAt, sessionWhen(session.signedInAt, now), t),
    lastSeen: phrase(copy.lastSeenAt, sessionWhen(session.lastSeenAt, now), t),
  };
}

/** "{when}" filled from the shape `sessionWhen` returns, in the reader's words. */
function phrase(template: string, when: SessionWhen, t: Dictionary): string {
  const copy = t.settings.devices;
  const words =
    when.kind === "now"
      ? copy.whenNow
      : when.kind === "minutes"
        ? copy.whenMinutes.replace("{count}", String(when.minutes))
        : when.kind === "today"
          ? copy.whenToday.replace("{time}", when.time)
          : when.kind === "yesterday"
            ? copy.whenYesterday.replace("{time}", when.time)
            : when.kind === "date"
              ? when.date
              : "";
  /* An unusable timestamp draws no line at all rather than a sentence with a
     hole in it. There is nothing useful to say and saying half of it is worse. */
  return words.length === 0 ? "" : template.replace("{when}", words);
}
