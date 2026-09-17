"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The name, email and first-seen stamp this browser holds for somebody with no
 * account, in one place, with every reader notified when one of them changes.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A STORE AND NOT THREE EFFECTS.
 *
 * Three components read these keys: the signed-out profile hero, the identity
 * card on the could-not-load branch of the same screen, and the support chat,
 * which prefills an escalation so a person with no account can still be replied
 * to. Each had its OWN copy of the key strings, its own clamp lengths, its own
 * hydration effect and its own `useState`, and two of them also WRITE.
 *
 * That arrangement has a defect in it, and it is the same one the settings
 * document had: a component that hydrated at mount never learns about another
 * component's write. On `/settings` the identity card and the support sheet can
 * both be mounted. Correct your name in the card, then open support, and the
 * escalation files the ticket under the name you just corrected away from -
 * silently, because the support sheet read storage once, at mount, before you
 * changed it. A support ticket filed under the wrong name is a reply that does
 * not arrive.
 *
 * One store, one set of keys, one clamp, and `useSyncExternalStore` so a write
 * anywhere reaches every mounted reader in the same commit.
 *
 * ---------------------------------------------------------------------------
 * WHY THE FIRST-SEEN STAMP IS WRITTEN IN `subscribe` AND NOT IN `getSnapshot`.
 *
 * "On this device since March 2026" needs a stamp, and the stamp is created the
 * first time anybody looks. `getSnapshot` is called during render and must be
 * pure, so it cannot be the thing that creates it. `subscribe` runs in an
 * effect, on the client, after commit, which is the correct place for a write -
 * and React re-reads the snapshot after subscribing, so the freshly written
 * stamp is picked up without a second render pass being requested.
 *
 * ---------------------------------------------------------------------------
 * THE SNAPSHOT IS CACHED, WHICH IS NOT AN OPTIMISATION.
 *
 * `useSyncExternalStore` compares snapshots by identity and re-renders when
 * they differ, so a `getSnapshot` that builds a fresh object every call loops
 * forever. The three raw strings are compared as one JSON key and the object is
 * rebuilt only when that key moves.
 *
 * ---------------------------------------------------------------------------
 * EVERY ACCESS IS WRAPPED. Private browsing, blocked site data and a cleared
 * origin all make `localStorage` throw rather than return null, and this is the
 * profile screen: it renders for somebody who is not signed in, which is
 * exactly the person most likely to be in a private window.
 */

const NAME_KEY = "nf_profile_name";
const EMAIL_KEY = "nf_profile_email";
const SINCE_KEY = "nf_member_since";

/** What the name row shows when nobody has typed one. */
export const GUEST_NAME = "Guest";

/**
 * The clamps, which were 40 and 80 in two files and are now 40 and 80 in one.
 *
 * They are exported because the two sheets that edit these values also set
 * `maxLength` on the inputs, and a clamp on write that disagrees with the one
 * on the field is how a name gets silently shortened after being accepted.
 */
export const MAX_NAME = 40;
export const MAX_EMAIL = 80;

export type DeviceIdentity = {
  /** Trimmed and clamped, or "" when nothing is stored. Never "Guest". */
  name: string;
  email: string;
  /** The ISO stamp this browser was first seen, or "" before it exists. */
  since: string;
};

const EMPTY: DeviceIdentity = { name: "", email: "", since: "" };

const listeners = new Set<() => void>();

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* Private browsing, or site data blocked. The value stands in memory for
       this session and no longer, which is the most this browser will allow.
       Nothing is reported to the reader, because there is nothing they could do
       about it and the control they just used did work. */
  }
}

let cachedKey: string | null = null;
let cachedValue: DeviceIdentity = EMPTY;

function getSnapshot(): DeviceIdentity {
  const name = read(NAME_KEY);
  const email = read(EMAIL_KEY);
  const since = read(SINCE_KEY);
  /* JSON rather than a joined string, so a separator cannot appear inside one
     of the values and make two different triples compare equal. */
  const key = JSON.stringify([name, email, since]);
  if (key !== cachedKey) {
    cachedKey = key;
    cachedValue = {
      name: name.trim().slice(0, MAX_NAME),
      email: email.trim().slice(0, MAX_EMAIL),
      since,
    };
  }
  return cachedValue;
}

/* The server has no browser storage, so it renders the empty identity and the
   name row says "Guest". The client's first snapshot may differ, which is what
   `getServerSnapshot` is for: React knows to expect it rather than reporting a
   hydration mismatch. */
function getServerSnapshot(): DeviceIdentity {
  return EMPTY;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  /* The one write that belongs here rather than in a component: the first-seen
     stamp exists because somebody opened the app, and this is the first moment
     after commit at which that is known. */
  if (!read(SINCE_KEY)) write(SINCE_KEY, new Date().toISOString());

  listeners.add(onChange);
  /* Another TAB's write. `storage` fires only on other documents of the same
     origin, so this is the cross-tab half; the `listeners` set above is the
     same-tab half, and both are needed for different reasons. A null key is a
     whole-origin clear, which has to count as a change to all three. */
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === NAME_KEY ||
      event.key === EMAIL_KEY ||
      event.key === SINCE_KEY
    ) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * What this browser knows about the person using it, and a way to change it.
 *
 * `save` takes whichever fields are being changed. It clamps before it writes,
 * so the stored value and the rendered value cannot disagree, and it notifies
 * every mounted reader including the one that called it.
 */
export function useDeviceIdentity(): {
  identity: DeviceIdentity;
  save: (next: { name?: string; email?: string }) => void;
} {
  const identity = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const save = useCallback((next: { name?: string; email?: string }) => {
    if (next.name !== undefined) write(NAME_KEY, next.name.trim().slice(0, MAX_NAME));
    if (next.email !== undefined) write(EMAIL_KEY, next.email.trim().slice(0, MAX_EMAIL));
    notify();
  }, []);
  return { identity, save };
}

/**
 * Read the identity once, outside React, for a caller that is not rendering.
 *
 * The support chat needs the name and email at the moment somebody presses
 * Escalate, not at the moment its bubble rendered, and that is a read inside an
 * event handler rather than a subscription.
 */
export function readDeviceIdentity(): DeviceIdentity {
  return getSnapshot();
}

/**
 * "On this device since March 2026", in Lagos time.
 *
 * THE TWO CALL SITES DISAGREED ABOUT THE TIME ZONE. One passed
 * `timeZone: "Africa/Lagos"` and the other passed none, so the same stamp could
 * render as two different months on two surfaces of the same screen for
 * somebody whose browser is set to anywhere west of here. Lagos is what the
 * rest of the platform reckons days in, so it is what this reckons months in.
 *
 * Returns "" for a missing or unparseable stamp, and the callers render nothing
 * rather than a placeholder: "since dash" is worse than no line at all.
 */
export function formatSince(stamp: string): string {
  if (!stamp) return "";
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}
