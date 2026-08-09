"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { toggleSave } from "@/lib/saved/actions";
import { addLocalSave, readLocalSaves, removeLocalSave } from "@/lib/saved/local";

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
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Device saves (catalogue listings, and anything hearted while signed out)
  // live in localStorage, which the server render cannot see.
  useEffect(() => {
    if (initialSaved) return;
    if (readLocalSaves().some((save) => save.id === listingId)) setSaved(true);
  }, [initialSaved, listingId]);

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
    <div className="nf-safe-top absolute right-3 top-3 z-20 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={share}
          aria-label="Share this listing"
          data-testid="listing-share"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-media)] text-[var(--nf-content-on-media)] backdrop-blur-md transition-transform active:scale-90 motion-reduce:transition-none"
        >
          <UiIcon name="share" size={16} />
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this listing"}
          data-testid="listing-save"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--nf-border-on-media)] bg-[var(--nf-overlay-media)] text-[var(--nf-content-on-media)] backdrop-blur-md transition-transform active:scale-90 disabled:opacity-70 motion-reduce:transition-none"
        >
          <UiIcon
            name="heart"
            size={16}
            className={saved ? "text-[var(--nf-status-verified)] [&_path]:fill-current" : undefined}
          />
        </button>
      </div>

      {message && (
        <p
          role="status"
          data-testid="listing-action-message"
          className="max-w-[15rem] rounded-full bg-[var(--nf-overlay-media-strong)] px-3 py-1.5 text-right text-[0.75rem] font-medium leading-snug text-[var(--nf-content-on-media)] backdrop-blur-md"
        >
          {message}
          {signInPrompt && (
            <Link href="/sign-in" className="ml-1.5 font-semibold underline underline-offset-2">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
