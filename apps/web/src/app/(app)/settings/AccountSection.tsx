"use client";

import { useActionState, useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GroupCard } from "@/components/app/account/SettingsGroups";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { deleteAccountAction, signOut } from "@/lib/profile/actions";
import { DELETE_CONFIRM_PHRASE } from "@/lib/profile/schema";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * The account block: who you are signed in as, sign out, and deletion.
 *
 * Deletion is deliberately slow. It takes two steps in a full-page drawer, the
 * second of which demands the exact phrase typed in capitals, because this is
 * the one control in the app that cannot be undone. When the platform holds a
 * service key the action really removes the auth user and every row that
 * cascades from it. When it does not, the drawer says so plainly and deletes
 * nothing, and points at a person who can help.
 */
export function AccountSection({
  state,
  email,
}: {
  state: "signed-in" | "signed-out" | "unconfigured";
  email: string;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const leave = () => {
    setSignOutError(null);
    startSignOut(async () => {
      const result = await signOut();
      if (!result.ok) {
        setSignOutError(result.error);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <GroupCard overline="Account" icon="profile">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <div className="py-3.5 first:pt-0">
          <p className="text-[0.9375rem] font-medium">
            {state === "signed-in" ? "Signed in" : "Not signed in"}
          </p>
          <p className="mt-0.5 break-words text-[0.8125rem] text-[var(--nf-content-muted)]">
            {state === "signed-in"
              ? email || "Your account is active on this device."
              : state === "signed-out"
                ? "Sign in to keep your profile and preferences with your account instead of this device."
                : "Accounts switch on the moment the platform keys land. Everything you set here is kept on this device until then."}
          </p>

          {state === "signed-in" ? (
            <>
              <button
                type="button"
                onClick={leave}
                disabled={signingOut}
                className="nf-btn nf-btn--glass mt-2.5 w-full"
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
              {signOutError && (
                <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-error)]">
                  {signOutError}
                </p>
              )}
            </>
          ) : state === "signed-out" ? (
            <Link href="/sign-in" className="nf-btn nf-btn--primary mt-2.5 w-full">
              Sign in
            </Link>
          ) : null}
        </div>

        <div className="py-3.5 last:pb-0">
          <p className="text-[0.9375rem] font-medium">Delete account</p>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            Removes your profile, preferences, saved places and message history
            for good. This cannot be undone.
          </p>
          <button
            type="button"
            data-testid="delete-open"
            onClick={() => setDrawer(true)}
            className="nf-btn mt-2.5 w-full border border-[color-mix(in_oklab,var(--nf-state-error)_55%,transparent)] text-[var(--nf-state-error)]"
          >
            Delete my account
          </button>
        </div>
      </div>

      {drawer && <DeleteDrawer onClose={() => setDrawer(false)} />}
    </GroupCard>
  );
}

/* ------------------------------------------------------------------ drawer */

function DeleteDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"explain" | "confirm">("explain");
  const [phrase, setPhrase] = useState("");
  const [mounted, setMounted] = useState(false);
  const phraseId = useId();

  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    deleteAccountAction,
    null,
  );

  useEffect(() => setMounted(true), []);

  // Page scroll stays locked while the drawer owns the screen.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A completed deletion leaves nothing to come back to.
  useEffect(() => {
    if (!state?.ok) return;
    const timer = window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [state, router]);

  if (!mounted) return null;

  const ready = phrase.trim() === DELETE_CONFIRM_PHRASE;

  /* The drawer is portalled to the body because a backdrop-filter ancestor
     becomes the containing block for fixed children, and every settings card
     is glass. */
  return createPortal(
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label="Delete account"
      data-testid="delete-drawer"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="nf-rise absolute inset-0 overflow-y-auto bg-[var(--nf-surface-primary)] px-5 pb-8 pt-5">
        <div className="mx-auto max-w-lg">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="nf-h3">Delete account</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="nf-icon-btn h-10 w-10"
            >
              <UiIcon name="arrow-left" size={18} />
            </button>
          </div>

          {state?.ok ? (
            <div className="nf-card p-5" data-testid="delete-done">
              <p className="flex items-center gap-2 text-[1.0625rem] font-semibold">
                <UiIcon name="verified" size={20} className="shrink-0 text-[var(--nf-state-success)]" />
                Your account is deleted
              </p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Everything tied to it has gone with it and you have been signed
                out. Taking you back to the home page now. You are welcome to
                start again any time.
              </p>
            </div>
          ) : step === "explain" ? (
            <div className="nf-card p-5">
              <p className="text-[0.9375rem] font-semibold">This is permanent</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-state-error)]" />
                  Your profile, photo and preferences are removed.
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-state-error)]" />
                  Your saved places, messages and reviews go with them.
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-state-error)]" />
                  Bookings already made stay on record with the host, as the law
                  requires, but are no longer linked to you here.
                </li>
              </ul>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                If something has gone wrong, talk to us first. Most things can
                be fixed without losing your history.
              </p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                <button type="button" onClick={onClose} className="nf-btn nf-btn--primary w-full">
                  Keep my account
                </button>
                <button
                  type="button"
                  data-testid="delete-continue"
                  onClick={() => setStep("confirm")}
                  className="nf-btn w-full border border-[color-mix(in_oklab,var(--nf-state-error)_55%,transparent)] text-[var(--nf-state-error)]"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <form action={formAction} className="nf-card p-5">
              <label htmlFor={phraseId} className="nf-label mb-1.5 block">
                Type {DELETE_CONFIRM_PHRASE} to confirm
              </label>
              <input
                id={phraseId}
                name="confirmPhrase"
                data-testid="delete-phrase"
                type="text"
                value={phrase}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(e) => setPhrase(e.target.value)}
                className="nf-field"
              />
              <p className="mt-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
                Capitals exactly as shown. Anything else will not unlock the
                button.
              </p>

              {state && !state.ok && (
                <p
                  role="alert"
                  className="mt-3 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
                >
                  {state.fieldErrors?.confirmPhrase ?? state.error}
                </p>
              )}

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                <button type="button" onClick={onClose} className="nf-btn nf-btn--primary w-full">
                  Keep my account
                </button>
                <button
                  type="submit"
                  data-testid="delete-confirm"
                  disabled={!ready || pending}
                  className="nf-btn w-full border border-[color-mix(in_oklab,var(--nf-state-error)_55%,transparent)] text-[var(--nf-state-error)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "Deleting..." : "Delete for good"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
