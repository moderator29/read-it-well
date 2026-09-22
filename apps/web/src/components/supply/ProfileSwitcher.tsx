"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Row, RowList, TYPE } from "@/components/app/Screen";
import { writeModeCookie, writeWorkspaceCookie } from "@/lib/mode.constants";
import { SIDE_HOME, writeSideCookie, type Side } from "@/lib/side.constants";
import type { WorkspaceKind } from "@/lib/supply/roles";
import {
  needsFlip,
  standingLabel,
  triggerBehaviour,
  type ProfileSelection,
  type Workspace,
} from "@/lib/supply/workspaces";

/**
 * ONE SHEET, TWO ENTRANCES.
 *
 * The founder ruled where the switch lives and it is two places: the raised
 * CENTRE SLOT of the bottom dock, and a "Switch profile" row near the foot of
 * the side drawer above the theme row. Both open this. There is one sheet in
 * the product, drawn once, so the two entrances cannot drift into two
 * slightly different lists the way the mode switcher and the role switcher
 * already had.
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
 * THE OBJECT IN THE DOCK IS `role-switch-tile` AND NOT THE RENDER'S STACK
 *
 * `GOVERNING-01` draws the centre slot as a stack of three glass discs. The
 * nearest object in our own pack is `naira-coins`, which means MONEY on every
 * other surface in this product, and borrowing it here would teach that shape
 * a second meaning two taps from the wallet. `role-switch-tile` is the pack's
 * own switch object, a person with a swap arrow on a glass tile, and it says
 * what the control actually is. Composition, glow, the lit rim and the raised
 * geometry all follow the render; the glyph inside it is ours. Recorded in the
 * ledger as a translation rather than a copy.
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
  /** What the dock slot and the drawer row announce. */
  triggerLabel: string;
  kinds: Record<WorkspaceKind, string>;
  standings: { draft: string; pending: string; refused: string; suspended: string };
};

export function ProfileSwitcher({
  t,
  copy,
  workspaces,
  current,
  side,
  avatarUrl,
  variant,
  addHref,
  onNavigate,
}: {
  t: Dictionary;
  copy: ProfileSwitcherCopy;
  workspaces: Workspace[];
  current: ProfileSelection;
  side: Side;
  avatarUrl: string;
  /** `dock` is the raised centre slot; `row` is the drawer's foot row. */
  variant: "dock" | "row";
  /** Where "Add a workspace" goes, which is side dependent. */
  addHref: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const behaviour = triggerBehaviour(workspaces);
  const currentName =
    current.kind === "personal" ? copy.personal : current.workspace.name;

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

  const triggerName = `${copy.triggerLabel}: ${currentName}`;

  function onTrigger() {
    /*
     * One workspace is two states, and two states is a toggle rather than a
     * list. Several is always the sheet, because a toggle between three things
     * is not a toggle. Zero opens the sheet too, because the sheet is where
     * the explanation of what a workspace even is lives.
     */
    if (behaviour === "toggle" && workspaces[0]) {
      if (current.kind === "personal") chooseWorkspace(workspaces[0]);
      else choosePersonal();
      return;
    }
    setOpen(true);
  }

  const trigger =
    variant === "dock" ? (
      <button
        type="button"
        onClick={onTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerName}
        className="nf-tab__link nf-tab__link--switch"
        data-on={open || undefined}
      >
        <span className="nf-switch-dock" aria-hidden="true">
          <BrandIcon name="role-switch-tile" size={34} />
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={onTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="nf-nav__switch"
      >
        <span className="nf-nav__switchtile" aria-hidden="true">
          <BrandIcon name="role-switch-tile" size={34} />
        </span>
        <span className="nf-nav__switchtext">
          <span className="nf-nav__switchtitle">{copy.title}</span>
          <span className="nf-nav__switchnow">{currentName}</span>
        </span>
        <UiIcon name="chevron-right" size={14} className="nf-nav__switchchev" />
      </button>
    );

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
        <RowList inset className="[--nf-row-divider-lead:3.25rem]">
          <Row className="p-0">
            <button
              type="button"
              disabled={pending}
              onClick={choosePersonal}
              aria-current={current.kind === "personal" ? "true" : undefined}
              className="nf-row nf-row--tap w-full px-1 text-left disabled:opacity-60"
            >
              <span className="nf-switch-mark" aria-hidden="true">
                {avatarUrl ? (
                  /* The account's own photograph, which is what the render
                     draws on this one row. A plain `img`: the source is
                     already a sized avatar and this is the only place in the
                     sheet that shows one. */
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" width={36} height={36} className="nf-switch-mark__photo" />
                ) : (
                  <UiIcon name="user" size="md" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>{copy.personal}</span>
                <span className={`mt-0.5 block ${TYPE.rowMeta}`}>{copy.personalMeaning}</span>
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
              current.kind === "workspace" && current.workspace.key === workspace.key;
            const standing = standingLabel(workspace.standing);
            return (
              <Row key={workspace.key} className="p-0">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => chooseWorkspace(workspace)}
                  aria-current={isCurrent ? "true" : undefined}
                  className="nf-row nf-row--tap w-full px-1 text-left disabled:opacity-60"
                >
                  <span className="nf-switch-mark" aria-hidden="true">
                    <UiIcon name={KIND_ICON[workspace.kind]} size="md" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className={TYPE.rowTitle}>{workspace.name}</span>
                      {/* TEXT, never colour alone. Three of these five states
                          are bad news and a reader who cannot see colour must
                          get the same news. A rounded rectangle on the control
                          radius, never a capsule: the render draws these as
                          pills and the shape law wins. */}
                      {standing && (
                        <span className="nf-switch-standing" data-standing={workspace.standing}>
                          {copy.standings[workspace.standing as keyof typeof copy.standings] ??
                            standing}
                        </span>
                      )}
                    </span>
                    <span className={`mt-0.5 block ${TYPE.rowMeta}`}>
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
          <p className={`mt-3 px-1 ${TYPE.rowMeta}`}>{copy.empty}</p>
        )}

        <div className="nf-switch-add">
          <Link href={addHref} onClick={() => setOpen(false)} className="nf-row nf-row--tap px-1">
            <span className="nf-switch-mark nf-switch-mark--add" aria-hidden="true">
              <UiIcon name="plus" size="md" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block ${TYPE.rowTitle}`}>{copy.addTitle}</span>
              <span className={`mt-0.5 block ${TYPE.rowMeta}`}>{copy.addMeaning}</span>
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
