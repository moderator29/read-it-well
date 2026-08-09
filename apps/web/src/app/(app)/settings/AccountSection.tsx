"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useOverlay } from "@/lib/ui/use-overlay";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { RowButton, RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { Button } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { deleteAccountAction, signOut } from "@/lib/profile/actions";
import { DELETE_CONFIRM_PHRASE } from "@/lib/profile/schema";
import type { Dictionary } from "@naijafinds/i18n";
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
  t,
  state,
  email,
}: {
  /* Handed down from the settings page, which resolved the locale. The drawer
     below is the one control in the app that cannot be undone, so not one word
     of it may arrive in a language the person did not choose. */
  t: Dictionary;
  state: "signed-in" | "signed-out" | "unconfigured";
  email: string;
}) {
  const router = useRouter();
  const copy = t.settings.account;
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
    <SettingsGroup
      label={copy.label}
      note={
        signOutError ? (
          <span role="alert" className="text-[var(--nf-state-error)]">
            {signOutError}
          </span>
        ) : state === "unconfigured" ? (
          copy.unconfiguredNote
        ) : undefined
      }
    >
      <RowValue
        icon="user"
        label={state === "signed-in" ? copy.signedIn : copy.notSignedIn}
        sub={
          state === "signed-in"
            ? undefined
            : state === "signed-out"
              ? copy.signedOutSub
              : copy.unconfiguredSub
        }
        value={state === "signed-in" ? email || copy.activeOnThisDevice : undefined}
      />

      {state === "signed-in" ? (
        <RowButton
          icon="arrow-right"
          label={signingOut ? copy.signingOut : t.common.signOut}
          onClick={leave}
          disabled={signingOut}
          chevron={false}
        />
      ) : state === "signed-out" ? (
        <RowLink href="/sign-in" icon="key" label={t.common.signIn} />
      ) : null}

      {/* Deletion sits last and reads as what it is before it is pressed, not
          in a dialog afterwards. The drawer behind it is unchanged: two steps,
          the second demanding the exact phrase in capitals. */}
      <RowButton
        icon="close"
        label={copy.deleteAccount}
        sub={copy.deleteAccountSub}
        onClick={() => setDrawer(true)}
        danger
        testId="delete-open"
      />

      {drawer && <DeleteDrawer t={t} onClose={() => setDrawer(false)} />}
    </SettingsGroup>
  );
}

/* ------------------------------------------------------------------ drawer */

function DeleteDrawer({ t, onClose }: { t: Dictionary; onClose: () => void }) {
  const router = useRouter();
  const copy = t.settings.delete;
  const [step, setStep] = useState<"explain" | "confirm">("explain");
  const [phrase, setPhrase] = useState("");
  const [mounted, setMounted] = useState(false);
  const phraseId = useId();

  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(
    deleteAccountAction,
    null,
  );

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  /* Escape, the Tab trap, the counted scroll lock and the focus return, from
     the one shared implementation. This drawer asks a person to type a phrase
     to destroy their account, and Tab used to walk straight out of it into the
     settings page underneath. */
  useOverlay({ open: true, onClose, panelRef });

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
      aria-label={copy.title}
      data-testid="delete-drawer"
    >
      {/* `bg-black/70` was a dark-only backdrop: in the light theme it dropped
          a near-opaque black sheet behind a white panel. `--nf-overlay-backdrop`
          is the platform's one scrim and is lighter in daylight. */}
      <div className="absolute inset-0 bg-[var(--nf-overlay-backdrop)] backdrop-blur-sm" />

      <div
        ref={panelRef}
        className="nf-rise absolute inset-0 overflow-y-auto bg-[var(--nf-surface-primary)] px-5 pb-8 pt-5"
      >
        <div className="mx-auto max-w-lg">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="nf-h3">{copy.title}</h2>
            <button
              type="button"
              aria-label={copy.close}
              onClick={onClose}
              className="nf-icon-btn h-10 w-10"
            >
              <UiIcon name="arrow-left" size={20} />
            </button>
          </div>

          {state?.ok ? (
            <div className="nf-card p-5" data-testid="delete-done">
              <p className="flex items-center gap-2 text-[1.0625rem] font-semibold">
                <UiIcon name="verified" size={20} className="shrink-0 text-[var(--nf-state-success)]" />
                {copy.doneTitle}
              </p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {copy.doneBody}
              </p>
            </div>
          ) : step === "explain" ? (
            <div className="nf-card p-5">
              <p className="text-[0.9375rem] font-semibold">{copy.permanentTitle}</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                {[copy.losesProfile, copy.losesContent, copy.keepsBookings].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-state-error)]" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                {copy.talkFirst}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button variant="primary" full onClick={onClose}>
                  {copy.keep}
                </Button>
                <Button
                  variant="dangerQuiet"
                  full
                  data-testid="delete-continue"
                  onClick={() => setStep("confirm")}
                >
                  {t.common.continue}
                </Button>
              </div>
            </div>
          ) : (
            <form action={formAction} className="nf-card p-5">
              {/* The phrase is a constant the server checks against, not a word
                  to translate, so it arrives in a slot rather than being
                  concatenated around a hard-coded "Type". */}
              <label htmlFor={phraseId} className="nf-label mb-1.5 block">
                {copy.typeToConfirm.replace("{phrase}", DELETE_CONFIRM_PHRASE)}
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
                {copy.capitals}
              </p>

              {state && !state.ok && (
                <p
                  role="alert"
                  className="mt-3 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
                >
                  {state.fieldErrors?.confirmPhrase ?? state.error}
                </p>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button variant="primary" full onClick={onClose}>
                  {copy.keep}
                </Button>
                <Button
                  type="submit"
                  variant="dangerQuiet"
                  full
                  data-testid="delete-confirm"
                  disabled={!ready}
                  loading={pending}
                >
                  {copy.confirm}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
