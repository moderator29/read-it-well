"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AuthGate } from "@/components/auth/AuthGate";
import { MODE_COOKIE } from "@/lib/mode.constants";
import {
  ROLE_COPY,
  ROLE_ORDER,
  requiresVerification,
  type RoleId,
  type RoleState,
} from "./roles";

/**
 * Switching what you are here to do.
 *
 * This replaces `ModeSwitcher`, which offered TWO options ("Personal" and
 * "Agent") drawn as two bordered cards stacked inside a third bordered
 * container, in a dropdown pinned to the top right corner. Three problems with
 * that, in rising order of seriousness:
 *
 *  1. **Nested cards.** A card inside a card inside a popover is three edges
 *     saying the same thing. The reference apps that do this well use ROWS with
 *     a hairline between them: the rows are siblings, the divider says so, and
 *     nothing needs a border of its own. That is what this draws.
 *
 *  2. **Two options for three roles.** "Agent" was doing duty for both a
 *     landlord listing their own flat and a realtor running a book of
 *     properties. Those two people want different things from the first screen
 *     and are asked for different documents, so they are two rows here.
 *
 *  3. **Picking one you do not have was a dead end.** The old switcher wrote
 *     the cookie and pushed you at `/agent/dashboard` regardless, so an account
 *     with no agents row landed on a refusal screen with no way forward. That
 *     is the failure this sheet is shaped to prevent: choosing a role you have
 *     not set up NEVER navigates. It opens an explanation of what the role is,
 *     what setting it up involves, one primary action to start, and a quiet way
 *     back to the list.
 *
 * VERIFICATION IS NOT MENTIONED FOR A RENTER anywhere in this file. See
 * `roles.ts` for why that is a rule rather than an omission.
 */

export function RoleSwitcher({
  roles,
  current,
  /** Rendered as a full-width row rather than a chip, for a settings surface. */
  variant = "chip",
  className,
}: {
  roles: RoleState[];
  current: RoleId;
  variant?: "chip" | "row";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [explaining, setExplaining] = useState<RoleId | null>(null);
  const [pending, startTransition] = useTransition();

  const currentCopy = ROLE_COPY[current];
  const byId = (id: RoleId) => roles.find((r) => r.id === id);

  function choose(role: RoleState) {
    /*
     * A role they do not have is never a navigation. It is a question.
     */
    if (!role.setUp) {
      setExplaining(role.id);
      return;
    }
    if (role.id === current) {
      setOpen(false);
      return;
    }

    /*
     * The cookie is the view preference and nothing more. The server decides
     * whether an agent workspace may render, every time, from the person's own
     * RLS-bound read - so a hand-edited cookie changes what this control
     * displays and nothing else.
     */
    const mode = role.id === "renter" ? "personal" : "agent";
    document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.push(ROLE_COPY[role.id].href);
      router.refresh();
      setOpen(false);
    });
  }

  const trigger =
    variant === "row" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`nf-row-button ${className ?? ""}`}
        aria-haspopup="dialog"
      >
        <span className="nf-role-mark" aria-hidden="true">
          <UiIcon name={currentCopy.icon} size="md" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
            {currentCopy.label}
          </span>
          <span className="block truncate text-[0.8125rem] text-[var(--nf-content-muted)]">
            {SWITCH_HINT}
          </span>
        </span>
        <UiIcon name="chevron-right" size="sm" className="text-[var(--nf-content-muted)]" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`nf-chip ${className ?? ""}`}
      >
        <UiIcon name={currentCopy.icon} size="sm" />
        {currentCopy.label}
        <UiIcon name="chevron-down" size="xs" />
      </button>
    );

  return (
    <>
      {/* Switching profile is one of the ten gated actions. A guest gets the
          door, carrying `?do=switch-profile` and the screen they were on. */}
      <AuthGate action="switch-profile">{trigger}</AuthGate>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          /* The explanation is a state OF the sheet, so closing the sheet
             forgets it. Reopening lands on the list, not mid-explanation. */
          if (!next) setExplaining(null);
        }}
        title={explaining ? ROLE_COPY[explaining].setup.title : SHEET_TITLE}
        detents={[0.6, 0.92]}
      >
        {explaining ? (
          <RoleSetup role={explaining} onBack={() => setExplaining(null)} />
        ) : (
          <>
            <p className="px-1 pb-3 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {SHEET_SUB}
            </p>

            {/*
              ROWS WITH DIVIDERS, NOT NESTED CARDS.

              `divide-y` puts one hairline between siblings and none around the
              outside, which is the whole visual argument: these are items in a
              list, not three separate objects that happen to be stacked.
            */}
            <ul className="divide-y divide-[var(--nf-divider)]">
              {ROLE_ORDER.map((id) => {
                const role = byId(id);
                if (!role) return null;
                const copy = ROLE_COPY[id];
                const isCurrent = id === current;

                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => choose(role)}
                      aria-current={isCurrent ? "true" : undefined}
                      className="flex w-full items-center gap-3.5 px-1 py-3.5 text-left transition-colors hover:bg-[var(--nf-interactive-hover)] disabled:opacity-60"
                    >
                      {/* The icon in a tinted circle. One tint for every role,
                          because a colour per role would be four meanings for
                          a hue the palette has already spent on brand. */}
                      <span className="nf-role-mark" aria-hidden="true">
                        <UiIcon name={copy.icon} size="md" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                            {copy.label}
                          </span>
                          {/* Only ever the truth about this account. A role
                              that has not been set up says so here rather than
                              looking identical to one that has and then dead
                              ending on the tap. */}
                          {!role.setUp && (
                            <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--nf-content-muted)]">
                              {NOT_SET_UP}
                            </span>
                          )}
                          {role.setUp && requiresVerification(id) && !role.verified && (
                            <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--nf-status-pending)]">
                              {UNVERIFIED}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-[var(--nf-content-muted)]">
                          {copy.description}
                        </span>
                      </span>

                      {/* The tick, on the current one only. */}
                      {isCurrent ? (
                        <UiIcon
                          name="verified"
                          size="md"
                          filled
                          className="shrink-0 text-[var(--nf-status-verified)]"
                          label={CURRENT_LABEL}
                        />
                      ) : (
                        <UiIcon
                          name="chevron-right"
                          size="sm"
                          className="shrink-0 text-[var(--nf-content-muted)]"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Sheet>
    </>
  );
}

/**
 * The screen behind a role you have not got.
 *
 * Three paragraphs and two controls, and the shape of it is the argument: what
 * this role IS, what setting it up actually involves in real hours and real
 * documents, then one primary action and one quiet way back. Nothing here is a
 * refusal, and nothing here is a wall - the person picked this on purpose and
 * the only useful answer is to tell them how to get it.
 */
function RoleSetup({ role, onBack }: { role: RoleId; onBack: () => void }) {
  const copy = ROLE_COPY[role].setup;

  return (
    <div className="px-1 pb-2">
      <span className="nf-role-mark nf-role-mark--lg" aria-hidden="true">
        <UiIcon name={ROLE_COPY[role].icon} size="lg" />
      </span>

      <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {copy.what}
      </p>

      <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
        <span className="font-semibold text-[var(--nf-content-secondary)]">{INVOLVES_LABEL} </span>
        {copy.involves}
      </p>

      {requiresVerification(role) && (
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          {VERIFY_NOTE}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink href={copy.actionHref} variant="primary" size="lg" full>
          {copy.action}
        </ButtonLink>
        {/* The quiet way back. A sheet with only a forward control is a trap
            for anybody who opened this out of curiosity. */}
        <Button onClick={onBack} variant="ghost" size="md" full>
          {BACK}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the copy.
   English source, gathered here rather than scattered through the markup, so
   the move into `packages/i18n` is one mechanical change. See roles.ts. */
const SHEET_TITLE = "What are you here to do?";
const SHEET_SUB =
  "One account, all three. Switch whenever you like; nothing you have saved, sent or been paid moves.";
const SWITCH_HINT = "Switch what you are here to do";
const NOT_SET_UP = "Not set up";
const UNVERIFIED = "Unverified";
const CURRENT_LABEL = "Current";
const INVOLVES_LABEL = "What it takes:";
const VERIFY_NOTE =
  "We verify sellers and agents because somebody is going to send them money for a place they have not stood in yet. Renting or buying never asks you to verify.";
const BACK = "Not now";
