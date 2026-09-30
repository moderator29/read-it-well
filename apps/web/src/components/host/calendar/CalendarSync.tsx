"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { countOf, type Locale } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Disclosure } from "@/components/app/Disclosure";
import {
  addCalendarImport,
  makeCalendarFeed,
  removeCalendarImport,
  setCalendarImportEnabled,
} from "@/lib/host/calendar-sync-actions";
import { FEED_SOURCES, type FeedSource } from "@/lib/host/ical";
import type { CalendarRoom } from "@/lib/host/rate-calendar";
import type { CalendarImport, SyncState } from "@/lib/host/rate-calendar-queries";

/**
 * CALENDAR SYNC FOR ONE ROOM TYPE (C2, 30 September 2026).
 *
 * OUT: the room's own link, for Airbnb or Booking.com to subscribe to. It
 * carries nights booked or closed on Vallo and nothing else.
 * IN: up to five links from other sites. Every pull closes the nights booked
 * there and opens the ones that were dropped; a night booked on Vallo is
 * never touched.
 *
 * Until the lead applies the migration the panel says sync is not on yet and
 * offers nothing to press, rather than buttons that fail.
 */

function ago(iso: string | null, now: number): string {
  if (!iso) return "not pulled yet";
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "synced just now";
  if (minutes < 60) return `synced ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `synced ${hours} h ago`;
  return `synced ${Math.round(hours / 24)} days ago`;
}

function siteName(source: string): string {
  return FEED_SOURCES.find((s) => s.value === source)?.label ?? "Another site";
}

export function CalendarSync({
  room,
  sync,
  feedBase,
}: {
  room: CalendarRoom;
  sync: SyncState;
  feedBase: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [source, setSource] = useState<FeedSource>("airbnb");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  const feed = sync.feeds.find((f) => f.roomTypeId === room.id) ?? null;
  const imports = sync.imports.filter((i) => i.roomTypeId === room.id);
  const feedUrl = feed ? `${feedBase.replace(/\/$/, "")}/api/calendar/feed?t=${feed.token}` : null;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      setMessage(null);
      const result = await fn();
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error ?? "That did not go through." });
        return;
      }
      setMessage({ tone: "ok", text: success });
      after?.();
      router.refresh();
    });

  const copy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="nf-rcal-sync" aria-labelledby={`sync-${room.id}`}>
      <div className="nf-rcal-sync__head">
        <span className="nf-rcal-panel__icon" aria-hidden="true">
          <UiIcon name="link" size={20} />
        </span>
        <div className="min-w-0">
          <h3 id={`sync-${room.id}`} className="nf-rcal-panel__title">
            Sync with Airbnb and Booking.com
          </h3>
          <p className="nf-caption">
            {sync.ready
              ? "A booking there takes one room here, and nights taken here show as taken there."
              : "Calendar sync is not switched on yet. Until it is, close nights you sell elsewhere by hand."}
          </p>
        </div>
      </div>

      {sync.ready ? (
        <>
          <div className="nf-rcal-sync__block">
            <h4 className="nf-section-label">Your Vallo calendar link</h4>
            {feedUrl ? (
              <>
                <div className="nf-rcal-sync__link">
                  <code className="nf-rcal-sync__url">{feedUrl}</code>
                  <Button variant="secondary" size="sm" leadingIcon={copied ? "check" : "link"} onClick={copy}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="nf-caption">
                  Paste it into the other site&apos;s calendar import. It shows only which nights are taken, never a
                  guest&apos;s name.
                </p>
                <Disclosure label="Make a new link" inline>
                  <p className="nf-caption">
                    The old link stops working at once. Use this if the link was shared somewhere it should not be.
                  </p>
                  <Button
                    variant="dangerQuiet"
                    size="sm"
                    disabled={pending}
                    onClick={() => act(() => makeCalendarFeed({ roomTypeId: room.id, fresh: true }), "A new link is ready. Paste it into the other site again.")}
                  >
                    Replace the link
                  </Button>
                </Disclosure>
              </>
            ) : (
              <Button
                variant="secondary"
                size="md"
                leadingIcon="link"
                loading={pending}
                disabled={pending}
                onClick={() => act(() => makeCalendarFeed({ roomTypeId: room.id }), "Your link is ready to copy.")}
              >
                Make a calendar link
              </Button>
            )}
          </div>

          <div className="nf-rcal-sync__block">
            <h4 className="nf-section-label">Calendars from other sites</h4>
            {imports.length > 0 ? (
              <ul className="nf-rcal-sync__imports">
                {imports.map((imp) => (
                  <ImportRow key={imp.id} imp={imp} now={now} pending={pending} act={act} />
                ))}
              </ul>
            ) : (
              <p className="nf-caption">None linked yet.</p>
            )}
            {imports.length < 5 ? (
              <form
                className="nf-rcal-sync__add"
                onSubmit={(event) => {
                  event.preventDefault();
                  act(
                    () => addCalendarImport({ roomTypeId: room.id, source, url }),
                    "Linked. The first sync runs within half an hour.",
                    () => setUrl(""),
                  );
                }}
              >
                <SelectField label="From" value={source} onChange={(event) => setSource(event.target.value as FeedSource)}>
                  {FEED_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="Calendar link (.ics)"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
                <Button type="submit" variant="secondary" size="md" disabled={pending || url.trim().length === 0}>
                  Link this calendar
                </Button>
              </form>
            ) : null}
          </div>
        </>
      ) : null}

      {message ? (
        <p className={message.tone === "error" ? "nf-rcal-panel__error" : "nf-rcal__notice"} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

function ImportRow({
  imp,
  now,
  pending,
  act,
}: {
  imp: CalendarImport;
  now: number;
  pending: boolean;
  act: (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => void;
}) {
  const failing = imp.failures >= 2;
  return (
    <li className="nf-rcal-sync__import">
      <div className="min-w-0 flex-1">
        <p className="nf-rcal-sync__import-name">
          From {siteName(imp.source)}
          {failing ? (
            <StatusBadge tone="error" kind="dot" className="ml-xs">
              Needs a look
            </StatusBadge>
          ) : !imp.enabled ? (
            <StatusBadge tone="neutral" className="ml-xs">
              Paused
            </StatusBadge>
          ) : null}
        </p>
        <p className="nf-caption">
          {imp.lastError && imp.failures > 0 ? imp.lastError : `${ago(imp.lastSyncedAt, now)}, ${countOf(imp.nightsBlocked, "nightsClosed", locale)}`}
        </p>
      </div>
      <Switch
        checked={imp.enabled}
        aria-label={`Sync from ${siteName(imp.source)}`}
        disabled={pending}
        onCheckedChange={(next) =>
          act(() => setCalendarImportEnabled({ importId: imp.id, enabled: next }), next ? "Sync resumed." : "Sync paused. Its nights stay as they are.")
        }
      />
      <Button
        variant="quiet"
        size="sm"
        iconOnly
        aria-label={`Unlink the ${siteName(imp.source)} calendar`}
        disabled={pending}
        onClick={() => act(() => removeCalendarImport({ importId: imp.id }), "Unlinked. The nights it closed are open again.")}
      >
        <UiIcon name="trash" size={16} />
      </Button>
    </li>
  );
}
