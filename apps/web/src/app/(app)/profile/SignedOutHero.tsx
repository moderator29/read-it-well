"use client";

import "./profile.css";
import { useState } from "react";
import Image from "next/image";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { RowButton, RowValue, SettingsGroup, Sheet } from "@/components/app/account/rows";
import {
  formatSince,
  GUEST_NAME,
  MAX_EMAIL,
  MAX_NAME,
  useDeviceIdentity,
} from "@/components/app/account/device-identity";

/**
 * The profile before you sign in.
 *
 * This replaced a card that showed **8 trips, 23 saved and 5 reviews** to
 * somebody who had never booked, saved or reviewed anything. Those three
 * numbers were constants in the file. They were the first thing on the screen,
 * they were confident, and they were untrue, which is a worse failure than an
 * empty state could ever be: a person who books a stay on the strength of a
 * platform that invents numbers about them has been told something false about
 * how it treats facts.
 *
 * What is here instead is only what is actually known: a name typed on this
 * device, when this device first opened the app, and an honest account of what
 * signing in would change. The shape is the signed-in header, class for class,
 * so the page does not become a different design the moment somebody arrives.
 *
 * It wears the signed-in page's own anatomy from `50E032EA` (`profile.css`):
 * the dusk cover fading into the page, the round face on its lit ring, the
 * name and a line under it. There is no cover picker and no avatar picker,
 * because neither can be stored for somebody with no account, and a control
 * that silently does nothing is the same lie in a different costume. No tick,
 * no counts: nothing here has been checked or counted.
 */
export function SignedOutHero({ unconfigured }: { unconfigured: boolean }) {
  const [editing, setEditing] = useState(false);

  /*
   * THE HYDRATION EFFECT IS GONE, AND WITH IT THREE COPIES OF THE KEYS.
   *
   * This held `name`, `email` and `since` in `useState`, filled them from
   * `localStorage` in a mount effect, and wrote them back by hand in the save
   * handler. Two other components did the same thing with their own copies of
   * the same three key strings, their own clamps, and their own idea of the time
   * zone, so a name corrected in one was stale in the next until a reload. See
   * `device-identity.ts` for the whole argument.
   *
   * The effect also drew `react-hooks/set-state-in-effect`, because that is
   * precisely what it was: state synchronised from somewhere outside React,
   * which is what `useSyncExternalStore` exists for.
   */
  const { identity, save } = useDeviceIdentity();
  const name = identity.name || GUEST_NAME;
  const email = identity.email;
  const since = formatSince(identity.since);

  const monogram = name.charAt(0).toUpperCase() || "G";

  return (
    <header className="nf-pf-hero" data-testid="signed-out-hero">
      <div className="nf-pf-cover">
        <Image
          src="/brand/photos/villa-pool-skyline-02.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="nf-pf-cover__photo nf-pf-cover__photo--plate"
        />
        <span className="nf-pf-cover__grade" aria-hidden="true" />
        <span className="nf-pf-cover__fade" aria-hidden="true" />
      </div>

      <div className="nf-pf-id">
        <div className="nf-pf-avatar nf-pf-avatar--static">
          <span className="nf-pf-avatar__disc">
            <span aria-hidden="true">{monogram}</span>
          </span>
        </div>
        <div className="nf-pf-id__text">
          <h1 className="nf-pf-name">
            <span className="nf-pf-name__text">{name}</span>
          </h1>
          <p className="nf-pf-handle">Not signed in</p>
        </div>
      </div>

      {since && (
        <p className="nf-pf-since">
          <UiIcon name="calendar-booking" size="xs" />
          On this device since {since}
        </p>
      )}

      <Panel className="nf-pf-note">
        <h2 className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
          {unconfigured
            ? "We cannot reach your account right now"
            : "Your stays live in your account"}
        </h2>
        <p className="mt-2xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {unconfigured
            ? "This is on our side, not yours. Everything you set here is kept on this device and nothing has been lost. Try again in a few minutes."
            : "Sign in and this page shows what you have actually booked, saved and reviewed, on every device you use, along with a handle, a cover and somewhere for what you write to live."}
        </p>
        {!unconfigured && (
          <ButtonLink href="/sign-in" variant="primary" size="lg" full className="mt-md">
            Sign in
          </ButtonLink>
        )}
      </Panel>

      {/*
       * The name and the email held on this device.
       *
       * These two keys are read by the support chat, which prefills a ticket
       * with them so somebody with no account can still be replied to. The
       * card that used to write them is gone, and a key that is read and can
       * never be written again is worse than one that does not exist: anybody
       * who had set a name would keep it forever with no way to correct it.
       */}
      <div className="mt-lg">
        <SettingsGroup
          label="On this device"
          note="Kept in this browser only, and used to fill in a support request so somebody can reply to you. Signing in replaces it with your account."
        >
          <RowButton
            icon="user"
            label="Your name"
            value={name}
            onClick={() => setEditing(true)}
            testId="device-name-row"
          />
          <RowValue icon="share" label="Email" value={email || "Not set"} />
        </SettingsGroup>
      </div>

      <DeviceDetailsSheet
        open={editing}
        onClose={() => setEditing(false)}
        name={identity.name}
        email={email}
        onSave={(nextName, nextEmail) => {
          /* One call, and the store clamps, writes and tells every other
             mounted reader. The `try` that used to be here lives in the store,
             because two components wrapping the same write in their own
             `try` is two chances to forget. */
          save({ name: nextName, email: nextEmail });
          setEditing(false);
        }}
      />
    </header>
  );
}

function DeviceDetailsSheet({
  open,
  onClose,
  name,
  email,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  email: string;
  onSave: (name: string, email: string) => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);

  /*
   * Re-seed from the stored values each time it OPENS, so cancelling really
   * cancels rather than leaving a half-typed value waiting for the next visit.
   *
   * ---------------------------------------------------------------------------
   * THE EFFECT THIS REPLACES HAD A BUG UNDER THE LINT WARNING.
   *
   * It was `useEffect(..., [open, name, email])` with an early return when
   * closed, so it re-seeded on any change to `name` or `email` WHILE THE SHEET
   * WAS OPEN, not only when it opened. `onSave` in the parent calls `setName`
   * and `setEmail`, so a save that did not also close the sheet overwrote
   * whatever the person was still typing. Reacting to three things when you
   * mean one transition is how that hides.
   *
   * WHY NOT A `key` ON THE SHEET, which was the suggestion. A key is the right
   * answer when a component's whole identity changes, and it would work here:
   * remount on open, `useState(name)` seeds fresh. But the remount has to land
   * on one side of the open transition or the other - key on open and the sheet
   * mounts already-open, skipping its entrance; key on close and the exit
   * animation is cut. This needs neither: it seeds on the transition itself,
   * during render, so there is no committed frame with the stale draft in it
   * and `Sheet` keeps both animations.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraftName(name);
      setDraftEmail(email);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="On this device">
      <div className="space-y-md">
        <label className="block">
          <span className="nf-label mb-2xs block">Your name</span>
          <input
            type="text"
            value={draftName}
            maxLength={MAX_NAME}
            autoComplete="name"
            placeholder="What we should call you"
            onChange={(event) => setDraftName(event.target.value)}
            className="nf-field"
            data-testid="device-name-input"
          />
        </label>

        <label className="block">
          <span className="nf-label mb-2xs block">
            Email <span className="font-normal text-[var(--nf-content-muted)]">(optional)</span>
          </span>
          <input
            type="email"
            value={draftEmail}
            maxLength={MAX_EMAIL}
            autoComplete="email"
            inputMode="email"
            placeholder="So support can reply to you"
            onChange={(event) => setDraftEmail(event.target.value)}
            className="nf-field"
          />
        </label>

        <p className="text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          Neither of these leaves this browser. Nothing is sent anywhere until you open a
          support request yourself.
        </p>
      </div>

      <div className="pt-md">
        <button
          type="button"
          onClick={() => onSave(draftName, draftEmail)}
          className="nf-btn nf-btn--primary w-full"
          data-testid="device-name-save"
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}
