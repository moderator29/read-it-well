"use client";

import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import type { Side } from "@/lib/side.constants";
import { useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Row, RowList } from "@/components/app/Screen";

/**
 * THE DOCK'S CENTRE "+", AND THE SHEET IT OPENS.
 *
 * The founder, twice (handoff A.6): "the plus botton should not have those
 * designs stuffs when click it should just have the normal 3 options". So the
 * sheet is three plain options and nothing else: no icon plates, no
 * subtitles, no chevrons, no workspace row. Each side has its own three.
 *
 *   Property: List a property, Post to the feed, Book a viewing.
 *   Stays:    Create a stay listing, Post to the feed, Book a stay.
 *
 * With the `social` switch off there is no feed to post to, so that option is
 * not offered rather than leading to a paused screen (two options, honestly).
 *
 * Switch workspace LEFT this sheet. It is about accounts, not about making
 * something, and it lives where accounts live: the Switch role row on
 * `/profile` (`SwitchRoleRow`), which fires the same named event
 * (`profile-switcher-event.ts`) that the workspace sheet in `AppShell`
 * listens for. Nothing it did is lost; it is one place, not two.
 *
 * The disc turns a quarter into its own close as the sheet opens (north star
 * 6.1, nav-island.css). That stays.
 *
 * `data-dock-create` marks the button for tests and screenshots, so neither
 * depends on a class name.
 */
export function CreateDock({
  t,
  listHref,
  side = "property",
  isHost = false,
  socialOn = true,
}: {
  t: ShellDictionary;
  /** Where the listing option goes: the agent wizard for an agent, the side's chooser otherwise. */
  listHref: string;
  /** Which side's three options to offer. */
  side?: Side;
  /** A host's stay listing goes straight to their rooms rather than the chooser. */
  isHost?: boolean;
  /**
   * Kept for callers that still pass it. The sheet no longer carries a
   * signed-in-only row, so it changes nothing here.
   */
  signedIn?: boolean;
  /** The `social` switch: off, the feed's composer is not offered. */
  socialOn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const copy = t.nav.create;
  const stays = side === "stays";

  /* Keyed by a fixed id, not the href: a key must not depend on a route. */
  const items: { id: string; href: string; title: string }[] = [
    stays
      ? { id: "stay", href: isHost ? "/host/rooms" : listHref, title: copy.stay }
      : { id: "list", href: listHref, title: copy.list },
    /* The feed's own composer, opened on arrival (`/around?compose=1`). */
    ...(socialOn ? [{ id: "post", href: "/around?compose=1", title: copy.post }] : []),
    stays
      ? { id: "book-stay", href: "/stays/search", title: copy.bookStay }
      : { id: "viewing", href: "/search", title: copy.viewing },
  ];

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
            to a close mark (nav-island.css). */}
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
        /* Three short rows and a title: one detent that holds them, no more. */
        detents={[0.44]}
        closeLabel={t.pickers.close}
      >
        <RowList inset={false} className="nf-create-sheet" data-testid="create-options">
          {items.map((item) => (
            <Row key={item.id} className="p-0">
              <Link
                data-testid={`create-${item.id}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="nf-row nf-row--tap nf-create-sheet__option"
              >
                {item.title}
              </Link>
            </Row>
          ))}
        </RowList>
      </Sheet>
    </>
  );
}
