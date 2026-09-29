"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { toggleSave } from "@/lib/saved/actions";
import {
  saveRestaurant,
  saveStay,
  unsaveRestaurant,
  unsaveStay,
} from "@/lib/saved/places-actions";
import type { SavePlaceTarget } from "@/components/app/SaveControl";
import { addLocalSave, readLocalSaves, removeLocalSave, writeLocalSaves } from "@/lib/saved/local";
import { EmptyActions } from "@/components/app/EmptyActions";
import { EmptyState, ICON, TYPE } from "@/components/app/Screen";
import { countOf } from "@vallo/i18n/core";
import { useClientLocale } from "@/lib/i18n/use-client-locale";
import { savedBoardKey, uniqueBoardKeys } from "./saved-board-key";

/**
 * The shortlist, made interactive.
 *
 * Cards arrive already rendered by the server, so the design is the same one
 * discovery uses and nothing about it is duplicated here. This component owns
 * three things only: the heart, the undo chip that replaces a card the moment
 * it is unsaved, and the one-time reconciliation of device saves.
 *
 * Every tap flips instantly and settles against the truth. A failed write puts
 * the card straight back and says why in a sentence. An unsave never opens a
 * dialogue: the card becomes an undo chip in its own slot, and the row it
 * removed is restored by hearting it again from that chip.
 *
 * TWO SHELVES ARRIVE ON ONE BOARD. A saved property is a `saved_items` row or
 * a device save; a saved stay or restaurant is a `saved_places` row under its
 * entity kind. They interleave by `savedAt`, which is epoch seconds on both
 * sides, so the board is the shortlist in the order the person built it. The
 * only thing the board has to know about the difference is which write to
 * call, which is what `item.place` carries: `toggleSave` cannot reach
 * `saved_places` at all, so sending a hotel to it would report a success that
 * removed nothing.
 */

export type SavedBoardItem = {
  id: string;
  /** Where this save is kept: a row under RLS, or the device. */
  mode: "db" | "local";
  /** Epoch seconds, so an undo can restore the original ordering. */
  savedAt: number;
  /**
   * Set on a saved stay or restaurant, which lives in `saved_places` rather
   * than `saved_items`. The remove and the undo below are two different
   * tables, and `toggleSave` can only ever reach the listing one: sending an
   * accommodation id to it removes nothing and reports success, which is the
   * worst of the three possible outcomes. So the kind travels with the item.
   */
  place?: SavePlaceTarget;
  card: ReactNode;
};

type Phase = "removed" | "restoring";

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function SavedBoard({ items }: { items: SavedBoardItem[] }) {
  const locale = useClientLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Record<string, Phase>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [hydrating, setHydrating] = useState(false);
  const synced = useRef(false);

  /* Slots, phases and messages are keyed by shelf and id (`savedBoardKey`),
     never by id alone: a listing and a place are two tables, and a repeated
     row must be one slot rather than two cards under one React key. */
  const ids = useMemo(() => uniqueBoardKeys(items), [items]);
  const [slots, setSlots] = useState<string[]>(() => uniqueBoardKeys(items));
  /* The item behind an undo chip, kept after a refresh drops it from the
     payload, so Undo still knows its shelf and its saved time. */
  const removedItems = useRef(new Map<string, SavedBoardItem>());

  // Slots hold their place across server refreshes, so a card that has just
  // become an undo chip does not jump to the end of the grid.
  useEffect(() => {
    setSlots((prev) => {
      const incoming = new Set(ids);
      const next = prev.filter((id) => incoming.has(id) || id in phase);
      for (const id of ids) if (!next.includes(id)) next.push(id);
      return sameOrder(prev, next) ? prev : next;
    });
    // A restore is complete once the card is back in the server payload.
    setPhase((prev) => {
      const present = new Set(ids);
      const next: Record<string, Phase> = {};
      let changed = false;
      for (const [id, value] of Object.entries(prev)) {
        if (value === "restoring" && present.has(id)) {
          changed = true;
          continue;
        }
        next[id] = value;
      }
      return changed ? next : prev;
    });
    setHydrating(false);
  }, [ids, phase]);

  // Device saves made on other surfaces are mirrored into the cookie the page
  // reads, then the server tree is refreshed once so they render as real
  // cards. Runs at most once per mount, so a save that cannot be resolved can
  // never spin the page.
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const local = readLocalSaves();
    if (local.length === 0) return;
    const known = new Set(items.map((i) => i.id));
    if (local.every((save) => known.has(save.id))) return;
    writeLocalSaves(local);
    setHydrating(true);
    startTransition(() => router.refresh());
  }, [items, router]);

  const setMessage = useCallback((id: string, message: string | null) => {
    setMessages((prev) => {
      if (message === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: message };
    });
  }, []);

  const byKey = new Map<string, SavedBoardItem>();
  for (const item of items) {
    const key = savedBoardKey(item);
    if (!byKey.has(key)) byKey.set(key, item);
  }

  /** The write behind one card, whichever shelf it belongs to. */
  async function write(item: { id: string; place?: SavePlaceTarget }, on: boolean) {
    if (item.place) {
      if (item.place.kind === "accommodation") {
        return on
          ? await saveStay({ accommodationId: item.place.id })
          : await unsaveStay({ accommodationId: item.place.id });
      }
      return on
        ? await saveRestaurant({ restaurantId: item.place.id })
        : await unsaveRestaurant({ restaurantId: item.place.id });
    }
    return await toggleSave({ listingId: item.id });
  }

  function unsave(item: SavedBoardItem) {
    const key = savedBoardKey(item);
    removedItems.current.set(key, item);
    setMessage(key, null);
    setPhase((prev) => ({ ...prev, [key]: "removed" }));
    if (item.mode === "local") removeLocalSave(item.id);

    startTransition(async () => {
      const result = await write(item, false);
      if (result.ok) return;
      // Nothing was removed, so the card goes back exactly as it was.
      if (item.mode === "local") addLocalSave(item.id, item.savedAt);
      setPhase((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMessage(key, result.error);
    });
  }

  function undo(key: string) {
    const item = byKey.get(key) ?? removedItems.current.get(key);
    if (!item) return;
    const id = item.id;
    setMessage(key, null);
    setPhase((prev) => ({ ...prev, [key]: "restoring" }));
    if (item.mode === "local") addLocalSave(id, item.savedAt);

    startTransition(async () => {
      const result = await write({ id, place: item.place }, true);
      if (!result.ok) {
        if (item.mode === "local") removeLocalSave(id);
        setPhase((prev) => ({ ...prev, [key]: "removed" }));
        setMessage(key, result.error);
        return;
      }
      router.refresh();
    });
  }

  const rendered = slots
    .map((key) => ({ key, item: byKey.get(key), state: phase[key] }))
    .filter((slot) => slot.item !== undefined || slot.state !== undefined);
  const visible = rendered.filter((slot) => slot.state === undefined && slot.item).length;

  if (items.length === 0 && rendered.length === 0) {
    return (
      <Reveal>
        {/* The one platform empty state. Was a `.nf-card` padded to 10 with an
            80px object: a bordered box drawn around a message whose entire job
            is to say the box is empty. */}
        <EmptyState
          icon="heart-home"
          title={hydrating ? "Bringing your saves together" : "Nothing saved yet"}
          body={
            hydrating
              ? "Places you hearted on this device are being matched to your account. This takes a moment."
              /* This said "Tap the heart on any place" about a control the
                 grid did not have: the heart lived on the detail page, on the
                 map's dock and nowhere else, so the instruction was true only
                 for somebody who had already opened a property. The card
                 carries it now, so the sentence is true, and it says where. */
              : "Tap the heart on any card and it waits for you here, ready to compare side by side."
          }
          action={
            <EmptyActions primary={{ label: "Find a place", href: "/search" }} />
          }
          /* CLEARANCE FOR THE FLOATING DOCK. `/saved` is a tab-bar route and
             this is the whole page, so without it the action lands underneath
             the navigation. Same clearance as `/search`, and the same note:
             this belongs in the empty state itself, which is not this file's
             to change. */
          className="pb-4xl"
          data-testid="saved-empty"
        />
      </Reveal>
    );
  }

  return (
    <>
      <Reveal>
        <p className={`mb-heading flex items-center gap-inline ${TYPE.bodyLg}`}>
          <UiIcon
            name="heart"
            size={ICON.inline}
            className="shrink-0 text-[var(--nf-brand-secondary)]"
          />
          <span>
            <span className="font-semibold text-[var(--nf-content-primary)]">
              {countOf(visible, "places", locale)} saved
            </span>{" "}
            &middot; ready to compare
          </span>
        </p>
      </Reveal>

      <Reveal delay={60}>
        <ul data-testid="saved-grid" className="grid grid-cols-1 gap-lg sm:grid-cols-2">
          {rendered.map(({ key, item, state }) => (
            <li key={key}>
              {state === undefined && item ? (
                <div className="flex h-full flex-col gap-xs">
                  {item.card}
                  {/* Under the card, not over it: the card carries its own
                      heart in the top-right corner now, and a second heart on
                      the same corner was two controls for one thought. */}
                  <button
                    type="button"
                    onClick={() => unsave(item)}
                    disabled={pending}
                    aria-pressed="true"
                    aria-label="Remove from saved"
                    data-testid="saved-heart"
                    className="nf-shelf-chip self-end disabled:opacity-60"
                  >
                    <UiIcon name="heart" size={ICON.inline} className="[&_path]:fill-current" />
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  data-testid="undo-chip"
                  className="nf-panel nf-panel--card h-full flex-row items-center justify-between gap-md p-card"
                >
                  <p className="nf-body text-[var(--nf-content-secondary)]">
                    {state === "restoring" ? "Putting it back" : "Removed from saved"}
                  </p>
                  <button
                    type="button"
                    onClick={() => undo(key)}
                    disabled={state === "restoring"}
                    className="nf-chip whitespace-nowrap transition-transform active:scale-[0.96] disabled:opacity-60"
                  >
                    <UiIcon name="heart" size={ICON.inline} className="shrink-0" />
                    Undo
                  </button>
                </div>
              )}
              {messages[key] && (
                <p role="alert" className="nf-caption mt-inline-tight text-[var(--nf-state-error)]">
                  {messages[key]}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Reveal>
    </>
  );
}
