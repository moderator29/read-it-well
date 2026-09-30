"use client";

import { useState } from "react";
import { CategoryRow, type HomeCategory } from "@/components/app/home/CategoryRow";
import { IconTiles } from "@/components/app/filters/IconTiles";
import { Icon3D, ICON_3D_NAMES } from "@/components/ui/Icon3D";
import { State } from "@/components/ui/State";

/**
 * THE FOUNDER'S 3D ICONS, IN PLACE (dev preview, 30 September).
 *
 * Every name at 64px on the page's own ground, then the shared pieces that
 * carry them: the Home doors, the Stays doors, the property-type filter, the
 * empty states and a workspace first-run card. Take it once with the
 * `nf_theme=light` cookie and once with `nf_theme=dark`.
 */
const HOME: HomeCategory[] = [
  { key: "buy", art: "buy", label: "Buy", href: "#", icon: "home-check", glyph: "house" },
  { key: "rent", art: "rent", label: "Rent", href: "#", icon: "keys-home", glyph: "key" },
  { key: "pay", art: "pay", label: "Pay", href: "#", icon: "naira-hand", glyph: "wallet" },
  { key: "manage", art: "list", label: "List", href: "#", icon: "doc-home", glyph: "file-text" },
];
const STAYS: HomeCategory[] = [
  { key: "hotels", art: "hotel", label: "Hotels", meaning: "Rooms by the night", href: "#", icon: "hotel-room" },
  { key: "shortlets", art: "shortlet", label: "Shortlets", meaning: "Whole places", href: "#", icon: "shortlet" },
  { key: "restaurants", art: "restaurant", label: "Restaurants", meaning: "Book a table", href: "#", icon: "concierge-bell" },
  { key: "nearby", art: "local-talks", label: "Nearby", meaning: "What is live near you", href: "#", icon: "pin-map" },
];

export default function Icons3DPreview() {
  const [kind, setKind] = useState<string>("apartment");
  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-[var(--nf-surface-canvas)] px-gutter py-block text-[var(--nf-content-primary)]">
      <h1 className="nf-h2">3D icons</h1>
      <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{ICON_3D_NAMES.length} names, each at 64px.</p>
      <ul className="mt-block grid grid-cols-4 gap-sm sm:grid-cols-8" data-testid="icons-3d-gallery">
        {ICON_3D_NAMES.map((name) => (
          <li key={name} className="flex flex-col items-center gap-2xs">
            <Icon3D name={name} size={64} />
            <span className="nf-caption text-center">{name}</span>
          </li>
        ))}
      </ul>

      <h2 className="nf-section-label mt-section-tight">Home doors</h2>
      <CategoryRow categories={HOME} label="Home doors" variant="plates" />

      <h2 className="nf-section-label mt-section-tight">Stays doors</h2>
      <CategoryRow categories={STAYS} label="Stays doors" columns={2} />

      <h2 className="nf-section-label mt-section-tight">Property type filter</h2>
      <div className="mt-inline">
        <IconTiles
          label="Property type"
          mode="single"
          testPrefix="preview-kind"
          selected={[kind]}
          onToggle={setKind}
          options={[
            { value: "all", label: "All", icon: "grid" },
            { value: "apartment", label: "Apartment", icon: "building-apartment", art: "apartment" },
            { value: "home", label: "House", icon: "house", art: "home-verified" },
            { value: "villa", label: "Villa", icon: "pool", art: "villa" },
            { value: "land", label: "Land", icon: "land-plot", art: "land" },
            { value: "office", label: "Office", icon: "briefcase", art: "city" },
          ]}
        />
      </div>

      <h2 className="nf-section-label mt-section-tight">Empty states</h2>
      <div className="grid gap-md sm:grid-cols-2">
        <State kind="empty" icon="bell-badge" title="No notifications yet" body="When something needs you, it lands here." primary={{ href: "/home", label: "Back to home" }} />
        <State kind="empty" icon="search-home" title="No places matched" body="Widen the filters and the results come back." primary={{ href: "/search", label: "Change filters" }} />
        <State kind="empty" icon="calendar-check" title="No bookings yet" body="A stay you book shows here with its dates." primary={{ href: "/stays/search", label: "Find a stay" }} />
        <State kind="empty" icon="heart-home" title="Nothing saved yet" body="Tap the heart on a place to keep it here." primary={{ href: "/search", label: "Browse places" }} />
      </div>

      <h2 className="nf-section-label mt-section-tight">Workspace first run</h2>
      <div className="nf-panel nf-panel--card block p-card-lg text-center">
        <span className="mx-auto grid size-[5.5rem] place-items-center" aria-hidden="true">
          <Icon3D name="keys" size={88} />
        </span>
        <p className="nf-h3 mt-block">No listings yet</p>
        <p className="nf-body-sm mx-auto mt-inline max-w-[38ch] text-[var(--nf-content-secondary)]">
          Your first listing starts as a draft and goes live once it is reviewed.
        </p>
      </div>
    </main>
  );
}
