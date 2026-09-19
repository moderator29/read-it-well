"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AuthGate } from "@/components/auth/AuthGate";
import { toggleSave } from "@/lib/saved/actions";
import { addLocalSave, removeLocalSave } from "@/lib/saved/local";
import { deviceSavesChanged, useDeviceSaved } from "@/components/app/SaveControl";

/**
 * The two controls that float over the gallery: share and save.
 *
 * They sit on photography rather than on the page canvas, so they are painted
 * as dark glass with white marks in both themes deliberately: a paper-white
 * control would vanish on a bright photo, and a night-only glass panel would
 * look wrong in daylight. Everything underneath them is an image, so this is
 * the one place where the same treatment is correct at noon and at midnight.
 *
 * That reasoning was right and the implementation was not: it was written as
 * bg-black/45, border-white/25 and text-white, by hand, in this file and in
 * five others, so nothing recorded WHY the darkness was deliberate and nothing
 * distinguished it from the dark-only literals that genuinely do break in
 * daylight. It now reads the `-on-media` token family, which is theme
 * independent on purpose and says so in one place.
 *
 * Save flips instantly and settles against the truth the action returns:
 * a catalogue listing is kept on the device, a platform listing is a row under
 * RLS, and a write that fails puts the heart straight back and says why.
 * Share uses the platform sheet when the browser has one and copies the link
 * when it does not, so the control is never a dead end.
 */

const TOAST_MS = 2600;

/** Copy without the clipboard permission, for browsers that refuse it. */
function copyByExecCommand(text: string): boolean {
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand("copy");
    document.body.removeChild(field);
    return done;
  } catch {
    return false;
  }
}

export function ListingActions({
  listingId,
  title,
  initialSaved = false,
}: {
  listingId: string;
  title: string;
  /** Whether this listing is already on the account's shortlist. */
  initialSaved?: boolean;
}) {
  /*
   * The device's answer, from the one store every heart reads.
   *
   * This was `useState(initialSaved)` plus an effect that read `localStorage`
   * on mount, which is the version `SaveControl`'s store docstring calls out by
   * name as "what the detail page does". Two consequences, and the cascading
   * render React complains about is the smaller one: the heart on this page and
   * the same heart on a card behind it held separate copies of one fact, so
   * saving here left the card stale until a reload.
   *
   * `override` is this page's own optimistic answer, `null` until somebody taps.
   * The stored truth wins until then, exactly as `useSaveControl` does it.
   */
  const [override, setOverride] = useState<boolean | null>(null);
  const onDevice = useDeviceSaved(listingId);
  const saved = override ?? (initialSaved || onDevice);
  const setSaved = setOverride;
  const [message, setMessage] = useState<string | null>(null);
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const say = useCallback((text: string, prompt = false) => {
    setMessage(text);
    setSignInPrompt(prompt);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMessage(null);
      setSignInPrompt(false);
    }, TOAST_MS);
  }, []);

  function toggle() {
    if (pending) return;
    const next = !saved;
    setSaved(next);
    setMessage(null);
    setSignInPrompt(false);

    startTransition(async () => {
      const result = await toggleSave({ listingId });
      if (!result.ok) {
        // Nothing changed anywhere, so the heart goes back exactly as it was.
        setSaved(!next);
        say(result.error, result.error.startsWith("Sign in"));
        return;
      }
      if (result.data.mode === "local") {
        // A catalogue id can never be a row, so the device owns this save.
        if (next) addLocalSave(listingId);
        else removeLocalSave(listingId);
        /* And the store is told, so every other heart for this listing on the
           page behind this one moves with it rather than waiting for a reload. */
        deviceSavesChanged();
        say(next ? "Saved to your shortlist" : "Removed from saved");
        return;
      }
      setSaved(result.data.saved);
      say(result.data.saved ? "Saved to your shortlist" : "Removed from saved");
    });
  }

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (!url) return;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // A cancelled sheet is not a failure and must not raise a message.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = copyByExecCommand(url);
    }
    say(copied ? "Link copied" : "Copy the link from your browser's address bar");
  }

  return (
    /*
     * `nf-safe-top` is padding rather than an offset, so these clear the notch
     * while the photography still runs full bleed behind them. 44px squares,
     * which is the App Store minimum and what the pair used to miss by four.
     */
    <div className="nf-safe-top absolute right-3 top-3 z-20 flex flex-col items-end gap-xs sm:right-4 sm:top-4">
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={share}
          aria-label="Share this listing"
          data-testid="listing-share"
          className="grid h-11 w-11 place-items-center rounded-[var(--nf-radius-control)] border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-media)] text-[var(--nf-content-on-media)] backdrop-blur-md transition-transform active:scale-90 motion-reduce:transition-none"
        >
          <UiIcon name="share" size={16} />
        </button>
        {/*
          Save gates. Share does not, and the difference is the whole rule:
          sharing a link is a thing a guest may do to a page they are allowed to
          read, and saving writes a row against an account.

          Wrapped rather than checked inside `toggle`, because `toggle` already
          flips the heart optimistically before the server answers, and a check
          inside it would flip a heart we are about to navigate away from. The
          gate intercepts in the capture phase, so for a guest the handler never
          runs at all and they arrive at sign-up with `?do=save` on the URL they
          came from.
        */}
        <AuthGate action="save">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save this listing"}
            data-testid="listing-save"
            className="grid h-11 w-11 place-items-center rounded-[var(--nf-radius-control)] border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-media)] text-[var(--nf-content-on-media)] backdrop-blur-md transition-transform active:scale-90 disabled:opacity-70 motion-reduce:transition-none"
          >
            <UiIcon
              name="heart"
              size={16}
              className={saved ? "text-[var(--nf-status-verified)] [&_path]:fill-current" : undefined}
            />
          </button>
        </AuthGate>
      </div>

      {message && (
        <p
          role="status"
          data-testid="listing-action-message"
          className="max-w-[15rem] rounded-[var(--nf-radius-control)] bg-[var(--nf-overlay-media-strong)] nf-media-chip px-sm py-xs text-right font-medium leading-snug backdrop-blur-md"
        >
          {message}
          {signInPrompt && (
            <Link href="/sign-in" className="ml-2xs font-semibold underline underline-offset-2">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
