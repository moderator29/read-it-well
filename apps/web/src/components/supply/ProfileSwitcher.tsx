"use client";

import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Row, RowList, TYPE } from "@/components/app/Screen";
import { writeModeCookie, writeWorkspaceCookie } from "@/lib/mode.constants";
import { SIDE_HOME, otherSide, writeSideCookie, type Side } from "@/lib/side.constants";
import { useOptionalSideFlip } from "@/components/app/flip/SideFlip";
import type { WorkspaceKind } from "@/lib/supply/roles";
import {
  needsFlip,
  type ProfileSelection,
  type Workspace,
} from "@/lib/supply/workspaces";
import { PROFILE_SWITCHER_EVENT } from "./profile-switcher-event";

/**
 * ONE SHEET, ONE ENTRANCE, AND IT IS THE DOCK.
 *
 * It had two: the centre slot of the bottom dock and a "Switch profile" row
 * near the foot of the side drawer. The founder has cut the drawer row -
 * "it lives in the dock now and two entrances to the same sheet in the same
 * product is clutter" - so the `row` variant, its tile, its two lines of text
 * and its chevron are gone with it, along with `.nf-nav__switch*` in
 * side-nav.css. Nothing became unreachable: the dock renders on every route
 * the drawer's own opener renders on.
 *
 * `GOVERNING-01` screen two is the target: a titled sheet, the Personal row
 * with the account's own avatar and a tick, then each workspace held with its
 * standing beside the name, then a hairline, then "Add a workspace" with a
 * plus in a tinted square. The row anatomy is the one `RoleSwitcher`
 * established and this file keeps: rows in ONE surface with inset hairlines,
 * an object in a tinted square, a label, a one line description, a tick on the
 * current one.
 *
 * ---------------------------------------------------------------------------
 * EVERY STANDING IS LISTED AND EVERY STANDING IS SELECTABLE
 *
 * Pending, Not approved and Suspended are rows a person can tap, labelled in
 * TEXT and not in colour alone, and none of them is hidden. A person whose
 * application was refused must be able to see that it was refused, and a
 * person who has been stopped and cannot find out why is the exact failure the
 * suspension design exists to prevent. Selecting one opens the surface that
 * carries the reason in full, which is decided in `makeWorkspace` rather than
 * here, so the sheet cannot send somebody somewhere that will not explain.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CONTROL DOES NOT DO, AND IT IS THE POINT
 *
 * It writes two cookies. It authorises nothing. The workspace list came from
 * the caller's own RLS bound reads, every `/agent/*` route re-gates on
 * `getAgentContext()`, and a publish is refused by the database rather than by
 * a missing button. A hand edited cookie changes what this control displays
 * and nothing else.
 *
 * ---------------------------------------------------------------------------
 * TAPPING THE TRIGGER ALWAYS OPENS THE SHEET, AND IT USED NOT TO
 *
 * `triggerBehaviour` returns "toggle" for an account holding exactly one
 * workspace, and this file acted on it: one tap flipped straight between
 * Personal and that workspace and the sheet never opened. The founder's
 * ruling is the opposite and it is about what the control MEANS, not about
 * saving a tap. "It behaves as though holding one means the question is
 * settled. It is not. I want to see every profile I hold and every door I
 * have not yet walked through, every time."
 *
 * So the trigger opens the sheet in every state, and the sheet always draws
 * the same three things: Personal, every workspace held with its real
 * standing, and the door not yet walked through. `triggerBehaviour` is left
 * where it is, unread by this file and still covered by its own unit test:
 * it is another scope's export to remove, not this one's.
 *
 * ---------------------------------------------------------------------------
 * THE GLYPH IN THE DOCK IS STROKED, ON THE FOUNDER'S RULING OF 22 SEPTEMBER
 *
 * `GOVERNING-01` draws the centre slot as a stack of three glass discs, and
 * what shipped was `BrandIcon name="role-switch-tile"` - the pack's own
 * switch object - rather than the stack, because the nearest stack in our
 * pack is `naira-coins` and that means MONEY on every other surface in this
 * product. That argument still stands and the glyph still says "switch". What
 * changed is the TIER: a tier-two glass object sat in a row of four stroked
 * 24px glyphs, and the founder asked for it drawn "in the same style as the
 * others". `UiIcon name="switch-profile"` is that glyph, drawn on the same 24
 * grid at the same stroke as `home`, `search`, `feed` and `user`.
 */

const KIND_ICON: Record<WorkspaceKind, UiIconName> = {
  owner: "home",
  agent: "key",
  firm: "building-apartment",
  host: "bed",
  console: "shield-stop",
};

export type ProfileSwitcherCopy = {
  title: string;
  personal: string;
  personalMeaning: string;
  addTitle: string;
  addMeaning: string;
  current: string;
  empty: string;
  /** What the dock slot announces. */
  triggerLabel: string;
  /**
   * V-75. The two letters under the dock's centre glyph, per workspace kind,
   * so the centre says WHICH workspace you are in rather than drawing the
   * swap arrows, which read as the side flip.
   */
  short: Record<WorkspaceKind, string>;
  kinds: Record<WorkspaceKind, string>;
  /**
   * One word per standing the database can produce, INCLUDING `active`.
   *
   * `active` is new and it is the founder's "Verified" mark from
   * `GOVERNING-01` screen two. It is drawn from `agents.status = 'APPROVED'`
   * or `businesses.status = 'APPROVED'` and from nothing else, which is a
   * decision a member of staff made and the audit log recorded. The console
   * row is the one exception and the reason is at its call site.
   */
  standings: {
    active: string;
    draft: string;
    pending: string;
    refused: string;
    suspended: string;
  };
};

export function ProfileSwitcher({
  t,
  copy,
  workspaces,
  current,
  side,
  avatarUrl,
  addHref,
  onNavigate,
  renderTrigger,
}: {
  t: ShellDictionary;
  copy: ProfileSwitcherCopy;
  workspaces: Workspace[];
  current: ProfileSelection;
  side: Side;
  avatarUrl: string;
  /** Where "Add a workspace" goes, which is side dependent. */
  addHref: string;
  onNavigate?: () => void;
  /**
   * AN OPTIONAL TRIGGER OF THE CALLER'S OWN. There is no default: the sheet
   * is normally opened by the named event (`profile-switcher-event.ts`).
   *
   * THE SWITCH STILL LIVES IN ONE PLACE AND THIS DOES NOT REOPEN THAT. The
   * founder ruled on 22 September that the sheet has one entrance, the dock,
   * and the drawer row is removed rather than moved. This prop does not add an
   * entrance: it lets ONE INSTANCE of this component be mounted with a
   * different trigger, which is how the profile row opens THE SAME SHEET. What
   * is forbidden is two entrances rendered at once, and that is a call site
   * decision rather than something this file can or should police.
   */
  renderTrigger?: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const flipApi = useOptionalSideFlip();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  /*
   * ANY SURFACE MAY ASK FOR THE SHEET, WITHOUT KNOWING HOW IT IS DRAWN.
   *
   * See `profile-switcher-event.ts` for why this is an event. In short: the
   * profile's Switch role row used to open this sheet by querying the dock's
   * own class name and clicking it, and a class rename would have broken it
   * silently. A caller now fires a named event that both sides import.
   */
  useEffect(() => {
    /* `preventDefault` is the answer: it tells `openProfileSwitcher` that a
       sheet was here and opened, so its caller does not fall back. */
    const onAsk = (event: Event) => {
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener(PROFILE_SWITCHER_EVENT, onAsk);
    return () => window.removeEventListener(PROFILE_SWITCHER_EVENT, onAsk);
  }, []);

  function go(href: string) {
    startTransition(() => {
      router.push(href);
      router.refresh();
      setOpen(false);
      onNavigate?.();
    });
  }

  function choosePersonal() {
    /* The workspace key is deliberately NOT cleared. Flipping back to working
       should land where the person last was rather than on a chooser, and the
       key means nothing while the mode is personal. */
    writeModeCookie("personal");
    go(SIDE_HOME[side]);
  }

  function chooseWorkspace(workspace: Workspace) {
    writeModeCookie("working");
    writeWorkspaceCookie(workspace.key);
    /*
     * Selecting a workspace on the other side turns the coin too.
     *
     * The navigation shows a property workspace only while the shell is on the
     * property side, so a row for the other side would otherwise do nothing
     * visible. The side cookie is written here and the destination is that
     * workspace's own route, which `sideOfPath` already forces to the right
     * shell, so the two can never disagree.
     */
    if (needsFlip(workspace, side)) writeSideCookie(workspace.side);
    go(workspace.href);
  }

  /* ------------------------------------------------------------- the trigger */

  /* No default trigger: since 29 September the dock's centre is the "+"
     (`CreateDock`), and every entrance (its Switch workspace row, the
     profile's Switch role row) opens this sheet by the named event. A caller
     may still draw one of its own. */
  const trigger = renderTrigger ? renderTrigger(() => setOpen(true)) : null;

  /* --------------------------------------------------------------- the sheet */

  return (
    <>
      {trigger}

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        detents={[0.6, 0.92]}
        closeLabel={t.pickers.close}
      >
        {flipApi && (
          /* UX-06: the side switch sits at the top of this sheet too. The ⇄
             in the dock is the control people reach for when they want the
             other side; it opens the profile list, so the side is offered
             first here rather than only at the foot of the drawer. */
          <Button
            variant="secondary"
            full
            disabled={flipApi.pending}
            onClick={() => {
              setOpen(false);
              flipApi.flip(otherSide(side));
            }}
            className="mb-sm"
            data-testid="switcher-side-flip"
          >
            {side === "stays" ? t.side.switchToProperty : t.side.switchToStays}
          </Button>
        )}
        <RowList inset className="[--nf-row-divider-lead:3.25rem]">
          <Row className="p-0">
            <button
              type="button"
              disabled={pending}
              onClick={choosePersonal}
              aria-current={current.kind === "personal" ? "true" : undefined}
              className="nf-row nf-row--tap w-full px-2xs text-left disabled:opacity-60"
            >
              <span className="nf-switch-mark" aria-hidden="true">
                {avatarUrl ? (
                  /*
                   * The account's own photograph, which is what the render
                   draws on this one row.
                   *
                   * THROUGH `RemoteImage`, WHICH IS THE OPTIMISER, and not a
                   * bare `img` with the lint rule disabled beside it. Rule 9
                   * says never disable a lint rule and the stop list says no
                   * image asset ships without compression and sizing through
                   * `next/image`; a 36px avatar drawn from a full size upload
                   * is exactly the case both exist for. It is also what
                   * stops an unexpected host throwing, which on a sheet that
                   * opens over every route would be a 500 everywhere at once,
                   * and it is what `AppShell` already does with the same
                   * source eight lines of chrome away.
                   */
                  <RemoteImage
                    src={avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    sizes="36px"
                    className="nf-switch-mark__photo"
                  />
                ) : (
                  <UiIcon name="user" size="md" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>
                  {copy.personal}
                </span>
                <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>
                  {copy.personalMeaning}
                </span>
              </span>
              {current.kind === "personal" ? (
                /* THE CIRCULAR BADGE, NOT THE SHIELD. `GOVERNING-01` draws
                   the current row's mark as a filled blue disc with a white
                   tick, and this product has already ruled that the shield
                   means a CHECKED LISTING and nothing else (`AppRail`, R1
                   finding A12). Borrowing it here would teach that shape a
                   second meaning inside the one sheet whose whole job is
                   saying which of several things you are. */
                <UiIcon
                  name="verified-badge"
                  size="md"
                  className="shrink-0 text-[var(--nf-brand-primary)]"
                  label={copy.current}
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

          {workspaces.map((workspace) => {
            const isCurrent =
              current.kind === "workspace" &&
              current.workspace.key === workspace.key;
            /*
             * THE MARK IS WHAT THE DATABASE SAID, OR THERE IS NO MARK.
             *
             * `standing` came out of `standingFromStatus`, which maps one
             * `agents.status` or `businesses.status` value onto one word. So
             * "Pending review" means the row says SUBMITTED or UNDER_REVIEW,
             * "Verified" means it says APPROVED, and neither is ever inferred
             * from anything else on screen.
             *
             * THE CONSOLE IS THE ONE ROW WITH NO MARK, and it is not an
             * oversight. Its standing is synthesised as `active` in
             * `workspaces-queries.ts` from the mere existence of a staff role
             * row; nothing approved it and no queue decided it, so drawing
             * "Verified" beside it would be exactly the guess the founder
             * ruled out. A mark this sheet cannot source, this sheet does not
             * draw.
             */
            const standing =
              workspace.kind === "console"
                ? null
                : copy.standings[
                    workspace.standing as keyof typeof copy.standings
                  ] ?? null;
            return (
              <Row key={workspace.key} className="p-0">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => chooseWorkspace(workspace)}
                  aria-current={isCurrent ? "true" : undefined}
                  className="nf-row nf-row--tap w-full px-2xs text-left disabled:opacity-60"
                >
                  <span className="nf-switch-mark" aria-hidden="true">
                    <UiIcon name={KIND_ICON[workspace.kind]} size="md" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-inline">
                      <span className={TYPE.rowTitle}>{workspace.name}</span>
                      {/* TEXT, never colour alone. Three of these five states
                          are bad news and a reader who cannot see colour must
                          get the same news. A rounded rectangle on the control
                          radius, never a capsule: the render draws these as
                          pills and the shape law wins. */}
                      {standing && (
                        <span
                          className="nf-switch-standing"
                          data-standing={workspace.standing}
                        >
                          {standing}
                        </span>
                      )}
                    </span>
                    <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>
                      {copy.kinds[workspace.kind]}
                    </span>
                  </span>
                  {isCurrent ? (
                    <UiIcon
                      name="verified-badge"
                      size="md"
                      className="shrink-0 text-[var(--nf-brand-primary)]"
                      label={copy.current}
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

        {/* The zero state says what a workspace IS, because it is the state
            nearly every account on this platform is in and a blank space under
            a heading teaches nobody anything. */}
        {workspaces.length === 0 && (
          <p className={`mt-group px-2xs ${TYPE.rowMeta}`}>{copy.empty}</p>
        )}

        <div className="nf-switch-add">
          <Link
            href={addHref}
            onClick={() => setOpen(false)}
            className="nf-row nf-row--tap px-2xs"
          >
            <span
              className="nf-switch-mark nf-switch-mark--add"
              aria-hidden="true"
            >
              <UiIcon name="plus" size="md" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${TYPE.rowTitle}`}>{copy.addTitle}</span>
              <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>
                {copy.addMeaning}
              </span>
            </span>
            <UiIcon
              name="chevron-right"
              size="sm"
              className="shrink-0 text-[var(--nf-content-muted)]"
            />
          </Link>
        </div>
      </Sheet>
    </>
  );
}
