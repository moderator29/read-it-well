"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { RowButton, RowValue, SettingsGroup, Sheet } from "@/components/app/account/rows";

const NAME_KEY = "nf_profile_name";
const EMAIL_KEY = "nf_profile_email";
const SINCE_KEY = "nf_member_since";
const DEFAULT_NAME = "Guest";
const MAX_NAME = 40;
const MAX_EMAIL = 80;

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
 * There is no cover and no avatar picker, because neither can be stored for
 * somebody with no account, and a control that silently does nothing is the
 * same lie in a different costume.
 */
export function SignedOutHero({ unconfigured }: { unconfigured: boolean }) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [email, setEmail] = useState("");
  const [since, setSince] = useState("");
  const [editing, setEditing] = useState(false);

  // First render matches the server so the markup agrees, then the device's own
  // answers arrive.
  useEffect(() => {
    try {
      const storedName = window.localStorage.getItem(NAME_KEY);
      if (storedName && storedName.trim()) setName(storedName.trim().slice(0, MAX_NAME));
      const storedEmail = window.localStorage.getItem(EMAIL_KEY);
      if (storedEmail && storedEmail.trim()) setEmail(storedEmail.trim().slice(0, MAX_EMAIL));

      let stamp = window.localStorage.getItem(SINCE_KEY);
      if (!stamp) {
        stamp = new Date().toISOString();
        window.localStorage.setItem(SINCE_KEY, stamp);
      }
      const date = new Date(stamp);
      if (!Number.isNaN(date.getTime())) {
        setSince(
          date.toLocaleDateString("en-NG", {
            month: "long",
            year: "numeric",
            timeZone: "Africa/Lagos",
          }),
        );
      }
    } catch {
      // Storage can be unavailable in private browsing. The defaults stand.
    }
  }, []);

  const monogram = name.charAt(0).toUpperCase() || "G";

  return (
    <header data-testid="signed-out-hero">
      <div className="nf-social-cover">
        <div className="nf-social-cover__art" aria-hidden="true" />
        <div className="nf-social-cover__scrim" aria-hidden="true" />
      </div>

      <div className="nf-social-identity">
        <div className="nf-social-avatar nf-social-avatar--ring">
          <span className="nf-social-avatar__disc">
            <span aria-hidden="true">{monogram}</span>
          </span>
        </div>
      </div>

      <div className="nf-social-namerow">
        <div className="min-w-0">
          <h1 className="nf-social-name">
            <span className="truncate-none">{name}</span>
          </h1>
          <p className="nf-social-handle">Not signed in</p>
        </div>
      </div>

      {since && (
        <div className="nf-social-meta">
          <span>
            <UiIcon name="calendar-booking" size={14} />
            On this device since {since}
          </span>
        </div>
      )}

      <div className="nf-card mt-5 p-5">
        <h2 className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">
          {unconfigured ? "Accounts switch on shortly" : "Your trips live in your account"}
        </h2>
        <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {unconfigured
            ? "Everything you set here is kept on this device until the platform keys land. Nothing is lost in the meantime."
            : "Sign in and this page shows what you have actually booked, saved and reviewed, on every device you use, along with a handle, a cover and somewhere for what you write to live."}
        </p>
        {!unconfigured && (
          <Link href="/sign-in" className="nf-btn nf-btn--primary mt-4 w-full sm:w-auto">
            Sign in
          </Link>
        )}
      </div>

      {/*
       * The name and the email held on this device.
       *
       * These two keys are read by the support chat, which prefills a ticket
       * with them so somebody with no account can still be replied to. The
       * card that used to write them is gone, and a key that is read and can
       * never be written again is worse than one that does not exist: anybody
       * who had set a name would keep it forever with no way to correct it.
       */}
      <div className="mt-6">
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
        name={name === DEFAULT_NAME ? "" : name}
        email={email}
        onSave={(nextName, nextEmail) => {
          const cleanName = nextName.trim().slice(0, MAX_NAME);
          const cleanEmail = nextEmail.trim().slice(0, MAX_EMAIL);
          setName(cleanName || DEFAULT_NAME);
          setEmail(cleanEmail);
          try {
            if (cleanName) window.localStorage.setItem(NAME_KEY, cleanName);
            else window.localStorage.removeItem(NAME_KEY);
            if (cleanEmail) window.localStorage.setItem(EMAIL_KEY, cleanEmail);
            else window.localStorage.removeItem(EMAIL_KEY);
          } catch {
            // Private browsing. The values stand for this session and no more,
            // which is the most this device will allow.
          }
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

  // Re-seed from the stored values each time it opens, so cancelling really
  // cancels rather than leaving a half-typed value waiting for the next visit.
  useEffect(() => {
    if (!open) return;
    setDraftName(name);
    setDraftEmail(email);
  }, [open, name, email]);

  return (
    <Sheet open={open} onClose={onClose} title="On this device">
      <div className="space-y-4">
        <label className="block">
          <span className="nf-label mb-1.5 block">Your name</span>
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
          <span className="nf-label mb-1.5 block">
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

        <p className="text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          Neither of these leaves this browser. Nothing is sent anywhere until you open a
          support request yourself.
        </p>
      </div>

      <div className="pt-4">
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
