"use client";

import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import { useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { Row, RowList, TYPE } from "@/components/app/Screen";
import { openProfileSwitcher } from "@/components/supply/profile-switcher-event";

/**
 * THE DOCK'S CENTRE "+", AND THE SHEET IT OPENS (the founder, 29 September
 * 2026, reference `17-dock-plus-centre.png`).
 *
 * The centre slot was the workspace switch: the account's photograph or the
 * current workspace's glyph in a container. The founder wants the centre to
 * be the one thing a person makes from anywhere: a round brand-blue button
 * with a bold white plus. It opens a sheet of what can be created (a
 * listing, a post, a viewing, and a stay listing for a host) and, as its
 * last row, Switch workspace, which fires the named event the switcher
 * listens for (`profile-switcher-event.ts`), so nothing the old centre did
 * is lost. The switcher's own sheet is still mounted by `AppShell`, with no
 * trigger of its own.
 *
 * `data-dock-create` marks the button for tests and screenshots, so neither
 * depends on a class name.
 *
 * Switch workspace is shown only when signed in, and the sheet's first
 * detent grows for a host's fifth row so nothing starts below the fold.
 */
export function CreateDock({
  t,
  listHref,
  isHost = false,
  signedIn = false,
  socialOn = true,
}: {
  t: ShellDictionary;
  /** Where "List a property" goes: the agent wizard for an agent, the chooser otherwise. */
  listHref: string;
  isHost?: boolean;
  /**
   * Switch workspace is offered only to a signed-in account: a visitor holds
   * no workspace, and the sheet it opens would be a list of nothing.
   */
  signedIn?: boolean;
  /** The `social` switch: off, the feed's composer is not offered. */
  socialOn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const copy = t.nav.create;

  /* Keyed by a fixed id, not the href: "List a property" goes to the same
     chooser a later row might, and a key must not depend on a route. */
  const items: { id: string; href: string; icon: UiIconName; title: string; sub: string }[] = [
    { id: "list", href: listHref, icon: "house", title: copy.list, sub: copy.listSub },
    /* The feed's own composer, opened on arrival (`/around?compose=1`,
       read by the Around page and passed to `CreateBloom`). */
    ...(socialOn
      ? [{ id: "post", href: "/around?compose=1", icon: "chat-bubble" as const, title: copy.post, sub: copy.postSub }]
      : []),
    { id: "viewing", href: "/search", icon: "calendar-booking", title: copy.viewing, sub: copy.viewingSub },
    ...(isHost
      ? [{ id: "stay", href: "/host/rooms", icon: "bed" as const, title: copy.stay, sub: copy.staySub }]
      : []),
  ];

  const plate = (icon: UiIconName) => (
    <IconPlate size="sm" tone="brand">
      <UiIcon name={icon} size={20} />
    </IconPlate>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={copy.trigger}
        className="nf-tab__link nf-tab__link--create"
        data-dock-create=""
      >
        {/* THE CENTRE TURNS INTO ITS OWN CLOSE (north star 6.1): the disc
            rotates 90 degrees as its sheet opens while the plus crossfades
            to a close mark, so the control that opened the sheet visibly
            becomes the one that shuts it (nav-island.css). */}
        <span className="nf-dock-plus" aria-hidden="true">
          <span className="nf-dock-plus__glyph nf-dock-plus__glyph--open">
            <UiIcon name="plus" size="md" />
          </span>
          <span className="nf-dock-plus__glyph nf-dock-plus__glyph--close">
            <UiIcon name="close" size="md" />
          </span>
        </span>
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        /* A host has a fifth row; the first detent grows to hold it. */
        detents={isHost ? [0.72, 0.92] : [0.6, 0.92]}
        closeLabel={t.pickers.close}
      >
        <RowList inset className="nf-create-sheet [--nf-row-divider-lead:3.25rem]">
          {items.map((item) => (
            <Row key={item.id} className="p-0">
              <Link
                data-testid={`create-${item.id}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="nf-row nf-row--tap w-full px-2xs text-left"
              >
                {plate(item.icon)}
                <span className="min-w-0 flex-1">
                  <span className={`block ${TYPE.rowTitle}`}>{item.title}</span>
                  <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{item.sub}</span>
                </span>
                <UiIcon name="chevron-right" size="sm" className="shrink-0 text-[var(--nf-content-muted)]" />
              </Link>
            </Row>
          ))}
          {signedIn ? (
            <Row className="p-0">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openProfileSwitcher();
                }}
                className="nf-row nf-row--tap w-full px-2xs text-left"
                data-testid="create-switch-workspace"
              >
                {plate("switch-profile")}
                <span className="min-w-0 flex-1">
                  <span className={`block ${TYPE.rowTitle}`}>{copy.switch}</span>
                  <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{copy.switchSub}</span>
                </span>
                <UiIcon name="chevron-right" size="sm" className="shrink-0 text-[var(--nf-content-muted)]" />
              </button>
            </Row>
          ) : null}
        </RowList>
      </Sheet>
    </>
  );
}
