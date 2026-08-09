"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { AuthGate } from "@/components/auth/AuthGate";
import { MODE_COOKIE } from "@/lib/mode.constants";
import { ICON, Row, RowList, TYPE } from "@/components/app/Screen";
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
 * THIS SHEET IS THE PATTERN FOR THE WHOLE PRODUCT, and it is also now the ONLY
 * way onto the selling side of the platform. Both of those are deliberate.
 *
 * ---------------------------------------------------------------------------
 * IT REPLACED A SEPARATE PRODUCT CALLED "BECOME AN AGENT"
 * ---------------------------------------------------------------------------
 *
 * There used to be a `/agents` marketing page with a hero, three benefit
 * cards, six numbered step cards, an earnings tease, four FAQ cards and two
 * calls to action, reached from a rail row, two profile rows, a search empty
 * state, the home screen, the footer and four site pages. It sold a person on
 * a CONVERSION: you are a renter, become an agent, here is the pitch.
 *
 * That framing was wrong about the product. Nobody becomes an agent. Somebody
 * renting a flat in Yaba puts the family plot in Enugu up for sale and is now
 * doing both, on one account, with one inbox and one wallet. The thing they
 * need is not a conversion funnel, it is a SWITCH - and the moment they use it
 * is exactly the moment to explain what the profile is and start setting it
 * up, because that is when they have said what they want.
 *
 * So: pick a profile you do not have, and the sheet turns into an explanation
 * of what it is, what it will ask you for, itemised, and one control that
 * starts it. There is no pitch page left to send anyone to and nothing about
 * this is a refusal.
 *
 * ---------------------------------------------------------------------------
 * THE SHAPE, WHICH THE REST OF THE PRODUCT COPIES
 * ---------------------------------------------------------------------------
 *
 * Rows in ONE surface with inset hairlines. An icon in a tinted circle, a
 * label, a one-line description, a tick on the current one. No card per row:
 * three roles drawn as three cards is three borders, three radii and three
 * shadows for one list of three things.
 *
 * VERIFICATION IS NOT MENTIONED FOR A RENTER anywhere in this file. See
 * `roles.ts` for why that is a rule rather than an omission.
 */

/**
 * The query parameter that opens this sheet from somewhere else.
 *
 * `/profile?switch=owner` lands on the Seller explanation with the sheet
 * already up. It is what `/agents` redirects to, so every link the old pitch
 * page had - the footer, the landing band, the help centre, four site pages,
 * anything anybody has shared - arrives at the replacement rather than a 404.
 */
export const SWITCH_PARAM = "switch";

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
  const params = useSearchParams();

  /*
   * Arriving with the sheet already asked for.
   *
   * `?switch=owner` opens on the Seller explanation. It is what `/agents`
   * redirects to, so every link the old pitch page had - the footer, the
   * landing band, the help centre, four site pages, anything anybody has
   * shared - arrives at the replacement rather than at a 404.
   *
   * Read in a LAZY INITIALISER rather than in an effect. An effect that calls
   * `setState` in its body renders the closed sheet first and then reopens it,
   * which is a visible flash on the one screen this parameter exists to reach
   * smoothly, and the lint rule that flags it is right. The parameter can only
   * arrive on a fresh mount, because the only thing that sets it is a redirect
   * from another route, so there is nothing an effect would catch that this
   * misses.
   */
  const asked = params.get(SWITCH_PARAM);
  const askedRole: RoleId | null =
    asked === "owner" || asked === "professional" ? asked : null;

  const [open, setOpen] = useState(askedRole !== null);
  const [explaining, setExplaining] = useState<RoleId | null>(askedRole);
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
          <span className={`block ${TYPE.rowTitle}`}>{currentCopy.label}</span>
          <span className={`block truncate ${TYPE.rowMeta}`}>{SWITCH_HINT}</span>
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
          <RoleSetup
            role={explaining}
            state={byId(explaining)}
            onBack={() => setExplaining(null)}
          />
        ) : (
          <>
            <p className={`px-1 pb-3 ${TYPE.body}`}>{SHEET_SUB}</p>

            {/*
              ROWS IN ONE SURFACE, NOT NESTED CARDS.

              Unboxed, because the sheet is already the surface: a boxed list
              inside a sheet panel is the nested container this whole pass
              exists to remove.
            */}
            <RowList inset className="[--nf-row-divider-lead:3.25rem]">
              {ROLE_ORDER.map((id) => {
                const role = byId(id);
                if (!role) return null;
                const copy = ROLE_COPY[id];
                const isCurrent = id === current;

                return (
                  <Row key={id} className="p-0">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => choose(role)}
                      aria-current={isCurrent ? "true" : undefined}
                      className="nf-row nf-row--tap w-full px-1 text-left disabled:opacity-60"
                    >
                      {/* The icon in a tinted circle. One tint for every role,
                          because a colour per role would be four meanings for
                          a hue the palette has already spent on brand. */}
                      <span className="nf-role-mark" aria-hidden="true">
                        <UiIcon name={copy.icon} size="md" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span className={TYPE.rowTitle}>{copy.label}</span>
                          {/* Only ever the truth about this account. A role
                              that has not been set up says so here rather than
                              looking identical to one that has and then dead
                              ending on the tap. */}
                          {!role.setUp && (
                            <span className={`${TYPE.caption} font-semibold uppercase tracking-wide`}>
                              {NOT_SET_UP}
                            </span>
                          )}
                          {role.setUp && requiresVerification(id) && !role.verified && (
                            <span
                              className={`${TYPE.caption} font-semibold uppercase tracking-wide`}
                              style={{ color: "var(--nf-status-pending)" }}
                            >
                              {UNVERIFIED}
                            </span>
                          )}
                        </span>
                        <span className={`mt-0.5 block ${TYPE.rowMeta}`}>{copy.description}</span>
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
                  </Row>
                );
              })}
            </RowList>
          </>
        )}
      </Sheet>
    </>
  );
}

/**
 * The screen behind a role you have not got, which is where the old pitch page
 * went.
 *
 * What this role IS, then what it will ask you for as a CHECKLIST rather than
 * a paragraph, then one control that starts it. The checklist is the part that
 * earns its place: "a short application, then a government issued ID and proof
 * that the property is yours" is a sentence somebody skims, and the same facts
 * as four rows with glyphs is a list somebody can look at their desk and check
 * against, which is the actual decision being made here - do I have this
 * stuff, now, or do I come back later.
 *
 * A PROFILE THAT IS SET UP AND WAITING SAYS SO. `state.setUp` with
 * `verified` false is a real, common state - the application is filed and the
 * review has not come back - and this used to be unreachable from here at all,
 * because a set-up role never opened the explanation. It does now, from the
 * verification prompt and from a direct `?switch=` link, and it must not
 * invite somebody to file a second application. It offers the status instead.
 */
function RoleSetup({
  role,
  state,
  onBack,
}: {
  role: RoleId;
  state: RoleState | undefined;
  onBack: () => void;
}) {
  const copy = ROLE_COPY[role].setup;
  const waiting = state?.setUp === true && state.verified === false;

  return (
    <div className="px-1 pb-2">
      <span className="nf-role-mark nf-role-mark--lg" aria-hidden="true">
        <UiIcon name={ROLE_COPY[role].icon} size="lg" />
      </span>

      <p className={`mt-4 ${TYPE.bodyLg}`}>{copy.what}</p>

      {waiting ? (
        <p className={`mt-4 ${TYPE.body}`}>{WAITING_NOTE}</p>
      ) : (
        <>
          <p className={`mt-4 ${TYPE.label}`}>{INVOLVES_LABEL}</p>

          {copy.needs && (
            <RowList inset={false} className="mt-1">
              {copy.needs.map((need) => (
                <Row key={need.label}>
                  <UiIcon
                    name={need.icon}
                    size={ICON.row}
                    className="shrink-0 text-[var(--nf-content-muted)]"
                  />
                  <span className={TYPE.body}>{need.label}</span>
                </Row>
              ))}
            </RowList>
          )}

          <p className={`mt-3 ${TYPE.rowMeta}`}>{copy.involves}</p>
        </>
      )}

      {requiresVerification(role) && !waiting && (
        <p className={`mt-3 ${TYPE.rowMeta}`}>{VERIFY_NOTE}</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink
          href={waiting ? "/profile/application" : copy.actionHref}
          variant="primary"
          size="lg"
          full
        >
          {waiting ? CHECK_STATUS : copy.action}
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
const INVOLVES_LABEL = "What to have ready";
const CHECK_STATUS = "See where it stands";
const WAITING_NOTE =
  "This profile is set up and waiting on our review. You can fill in listings now; publishing opens once the review comes back.";
const VERIFY_NOTE =
  "We verify sellers and agents because somebody is going to send them money for a place they have not stood in yet. Renting or buying never asks you to verify.";
const BACK = "Not now";
