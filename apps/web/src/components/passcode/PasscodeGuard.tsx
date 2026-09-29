"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@vallo/i18n/core";
import { lockPasscodeAction } from "@/lib/passcode/actions";
import { IDLE_LOCK_MS, idleExpired, type PasscodeLength } from "@/lib/passcode/rules";
import { markTabUnlocked, tabWasUnlocked } from "@/lib/passcode/tab";
import { PasscodeLock, type PasscodeCopy } from "./PasscodeLock";

/**
 * THE INACTIVITY TIMER, AROUND AN UNLOCKED PAGE. docs/PASSCODE.md.
 *
 * Mounted by the (app) layout only when the server has already decided the
 * session is unlocked. It locks again, on this side at once and on the
 * server through `lockPasscodeAction`, when:
 *
 *   - the tab is new (no mark in sessionStorage), unless the member signed in
 *     moments ago, in which case the unlock is minted instead;
 *   - nothing has been touched, typed or scrolled for five minutes;
 *   - the page was hidden (another app, another tab, the phone locked) for
 *     five minutes or more.
 *
 * While the member is active it posts `/api/passcode/touch` at most once a
 * minute, which slides the server's fifteen-minute unlock; an answer of
 * `locked` (the cookie lapsed, or another tab locked) locks this tab too.
 *
 * The lock is drawn here first, over inert children, so nothing is readable
 * while the network answers. The server is the boundary: the lock action
 * clears the cookie, Next re-renders the route (a cookie written by a server
 * action does that), the layout then draws its own lock screen in place of
 * the page, and every money action refuses until a right code.
 */
const TOUCH_EVERY_MS = 60 * 1000;
const CHECK_EVERY_MS = 15 * 1000;
const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

export function PasscodeGuard({
  copy,
  locale,
  length,
  mint,
  name,
  avatarUrl,
  children,
}: {
  copy: PasscodeCopy;
  locale: Locale;
  length: PasscodeLength;
  /** The server saw a fresh sign-in and no unlock cookie: ask for one now. */
  mint: boolean;
  name: string;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  const [locked, setLocked] = useState(false);
  const lastActivity = useRef(0);
  const lastTouch = useRef(0);
  const hiddenAt = useRef<number | null>(null);
  const lockedRef = useRef(false);

  const lock = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    void lockPasscodeAction().catch(() => {
      /* Offline: this tab is locked, and the server's unlock lapses on its own. */
    });
  }, []);

  const touch = useCallback(async () => {
    lastTouch.current = Date.now();
    try {
      const response = await fetch("/api/passcode/touch", { method: "POST", credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { state?: string };
      if (body.state === "locked") lock();
    } catch {
      /* A missed heartbeat only shortens the unlock; the next one tries again. */
    }
  }, [lock]);

  useEffect(() => {
    lastActivity.current = Date.now();
    if (mint) {
      markTabUnlocked();
      void touch();
    } else if (!tabWasUnlocked()) {
      lock();
    }
  }, [lock, mint, touch]);

  useEffect(() => {
    const onActivity = () => {
      if (lockedRef.current) return;
      lastActivity.current = Date.now();
      if (Date.now() - lastTouch.current >= TOUCH_EVERY_MS) void touch();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const since = hiddenAt.current;
      hiddenAt.current = null;
      if (since !== null && Date.now() - since >= IDLE_LOCK_MS) lock();
    };
    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => {
      if (!lockedRef.current && idleExpired(lastActivity.current, Date.now())) lock();
    }, CHECK_EVERY_MS);
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [lock, touch]);

  const unlocked = useCallback(() => {
    lockedRef.current = false;
    lastActivity.current = Date.now();
    lastTouch.current = Date.now();
    setLocked(false);
  }, []);

  return (
    <>
      <div className="contents" inert={locked} aria-hidden={locked || undefined}>
        {children}
      </div>
      {locked ? (
        <PasscodeLock copy={copy} locale={locale} mode="code" length={length} name={name} avatarUrl={avatarUrl} onUnlocked={unlocked} />
      ) : null}
    </>
  );
}
