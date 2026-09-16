import Image from "next/image";

/**
 * Vallo brand icon.
 *
 * The content tier: one object per thing the product talks about. A wallet, a
 * shield, a villa, a receipt. Navigation never uses these; navigation is
 * `UiIcon`, and the two tiers never share a row.
 *
 * THE ARTWORK CHANGED, AND IT IS THE REASON THIS FILE IS SHORTER THAN IT WAS.
 *
 * Until now the pack was soft matte white clay on white plinths, rendered as
 * opaque RGB with no alpha channel. The white had to be removed at paint time
 * with `mix-blend-mode: multiply`, and multiply against the night canvas
 * returns the night canvas, so every untiled object needed a near-white plate
 * painted behind it just to be visible. On the default theme that made every
 * content object on the platform a white sticker on navy: an app icon pasted
 * into a list row. Three of them in a column on `/bookings` were the clearest
 * example, and `/rent` showed two at once.
 *
 * `public/brand/glass` is the replacement: 103 objects in the logo's own
 * language, cut from the supplied sheets with a brightest-channel alpha key
 * rather than a brightness threshold, so the glow IS the alpha ramp and there
 * is no edge to see. They composite correctly on the navy canvas, on a card,
 * and on paper. So the blend mode is gone, the dark plate is gone, and
 * `.nf-brand-icon-ground` now paints nothing at all in the dark theme. That
 * was the acceptance test for the swap and it passed: see `docs/ICON_SYSTEM.md`
 * and `docs/FRONTEND_REVAMP.md` section 2.
 *
 * WHAT IS STILL TRUE. A glass object is see-through by design, so its interior
 * alpha is partial. That is correct against a dark ground and it reads thin on
 * white paper, which is why the light theme gives the 80 single objects a navy
 * chip (`--nf-icon-ground`, one token, see `tokens.css`) and gives the 23
 * transaction marks their own light twin instead. The twins were tested rather
 * than assumed: no filter gets from one to the other, because the difference is
 * which parts of the object are transparent, so a frosted-white mark keyed off
 * white inverts on a dark ground.
 *
 * THE TILE IS OFF BY DEFAULT, and it used to be on.
 *
 * `tile` defaulted to true, so almost every call site drew a full glass chip
 * inside an `.nf-card` that already carried a gradient border, a rim and an
 * elevation shadow: two containers deep, six visual layers, around one 24px
 * icon. A tile is now something a surface asks for, and the answer is usually
 * no. Ask for it where the object is the SUBJECT rather than an ornament. An
 * icon beside a heading, inside a button, in a list row or on a stat tile does
 * not get one. Nothing in the tree asks for one today, and the 23 transaction
 * marks must never be given one, because they arrive on their own rounded
 * glass tile and a tile around a tile is the nested chrome this platform has
 * been removing.
 */

/**
 * The 103 objects that exist as files under `public/brand/glass`. This list is
 * the artwork, not a wish: it is generated from the directory, so a name that
 * is here has a PNG and a name that is not cannot be typed.
 *
 * Alphabetical rather than grouped. The previous list was split into "actions
 * and concepts" and "property types" with a long comment between them, and the
 * split stopped being true the moment the transaction marks arrived: a receipt
 * is neither. One order that a reader can search beats three groups that have
 * to be maintained.
 */
export const BRAND_ICONS = [
  "alert-triangle",
  "beach-house",
  "bell-badge",
  "booking-instant",
  "bot",
  "bungalow",
  "calendar-check",
  "calendar-clock",
  "calendar-home",
  "calendar-time",
  "camera",
  "card-lock",
  "chart-growth",
  "chat-duo",
  "clock-check",
  "clock-expired",
  "cluster-home",
  "coin-naira",
  "concierge-bell",
  "container-home",
  "contract-sign",
  "coworking-space",
  "doc-cross",
  "doc-home",
  "doc-lock",
  "doc-review",
  "doc-shield",
  "duplex",
  "farm-house",
  "gift",
  "gift-star",
  "globe-pin",
  "heart-home",
  "home-check",
  "home-lock",
  "home-search",
  "hotel",
  "hotel-room",
  "hotel-star",
  "hourglass",
  "house-boat",
  "id-card-check",
  "info",
  "key-cycle",
  "keys-handover",
  "keys-home",
  "keys-tag",
  "lake-house",
  "land-plot",
  "ledger-book",
  "listing-search",
  "loft",
  "luggage-check",
  "luggage-plane",
  "mansion",
  "map-route",
  "map-spot",
  "mini-flat",
  "modern-house",
  "mountain-cabin",
  "naira-coins",
  "naira-hand",
  "office-space",
  "payment-failed",
  "payment-received",
  "payment-sent",
  "penthouse",
  "pin-map",
  "progress-ring",
  "receipt-check",
  "report-stats",
  "reviews",
  "savings-pot",
  "seal-check",
  "seal-cross",
  "seal-pending",
  "search-home",
  "serviced-apartment",
  "shared-apartment",
  "shield-check",
  "shield-home",
  "shield-lock",
  "shop-retail",
  "shortlet",
  "studio-apartment",
  "support-chat",
  "support-shield",
  "tag-hash",
  "tag-percent",
  "terrace-house",
  "tour-360",
  "townhouse",
  "transfer-arrow",
  "tree-house",
  "twin-house",
  "user-check",
  "user-verified",
  "villa",
  "wallet",
  "wallet-out",
  "wallet-plus",
  "wallet-secure",
  "warehouse",
] as const;

/** A name with a file behind it. */
export type BrandIconObject = (typeof BRAND_ICONS)[number];

/**
 * The 23 marks that ship with a light twin, under `public/brand/glass/light`.
 *
 * They are the transaction and outcome set, and it is not a coincidence that
 * the twinned set is exactly the set that arrives on its own rounded glass
 * tile: those are the marks that appear inline on a receipt, which is the one
 * surface where a navy chip would read as a hole in the paper. Everything else
 * is a single object with its own transparent margin, and the chip is the
 * better answer for those.
 *
 * `escrow-hold` has a twin on disk and is deliberately NOT here and NOT in
 * `BRAND_ICONS`. `docs/BRAND_MARKS.md` says to build it and not ship it until
 * escrow exists, and `lib/legal/terms.tsx` now states that Vallo does not hold
 * your money, so an escrow mark on a screen would be the artwork contradicting
 * the contract. It stays cut and withheld so nothing can reach for it by
 * accident.
 */
const LIGHT_TWINS = new Set<string>([
  "alert-triangle",
  "clock-expired",
  "coin-naira",
  "contract-sign",
  "doc-cross",
  "doc-review",
  "hourglass",
  "id-card-check",
  "info",
  "keys-handover",
  "ledger-book",
  "payment-failed",
  "payment-received",
  "payment-sent",
  "progress-ring",
  "receipt-check",
  "savings-pot",
  "seal-check",
  "seal-cross",
  "seal-pending",
  "transfer-arrow",
  "wallet-out",
  "wallet-plus",
]);

/**
 * Names the clay pack had and the glass pack does not, kept as aliases onto
 * the object that replaces them.
 *
 * SEVEN NAMES, AND THEY ARE A MIGRATION SHIM RATHER THAN A DESIGN.
 *
 * Fourteen clay names have no glass equivalent. Seven of them were never drawn
 * anywhere outside the inventory in this file, so they are simply gone:
 * `cleaning`, `home-cam`, `home-refresh`, `home-swap`, `parking-space`,
 * `swimming-pool` and `phone-home`. The seven below are drawn on real screens
 * across files this one does not own, so deleting the name would have been a
 * compile error in somebody else's work rather than a substitution. The
 * alias means every one of those screens gets the correct new artwork today,
 * and the rename can follow as a separate, readable change.
 *
 * Each substitution is the one `docs/FRONTEND_REVAMP.md` section 2.6 argues
 * for. Two of them, `homes-sparkle` and `house-sparkle`, are marked interim
 * there: no glass object carries "several homes, recommended" or "one home,
 * recommended", and those two are the only objects on the list that need
 * commissioning. `cluster-home` and `modern-house` are the honest stand-ins,
 * not the answer.
 */
const LEGACY_ALIASES = {
  /* The alert is a state, and `state="alert"` already carries it. */
  "bell-alert": "bell-badge",
  /* One bubble against two is not a distinction any screen is making. */
  chat: "chat-duo",
  /* Both bot variants collapse: use `hero/hero-assistant-*` where the idea is
     needed at size, which is a scene and not an icon. */
  "bot-chat": "bot",
  "bot-home": "bot",
  /* A listing as a document. `doc-review` is the one for "under review". */
  "listing-review": "doc-home",
  /* Interim. Both of these need commissioning: see the note above. */
  "homes-sparkle": "cluster-home",
  "house-sparkle": "modern-house",
} as const satisfies Record<string, BrandIconObject>;

/** Every name a call site may pass, including the seven deprecated aliases. */
export type BrandIconName = BrandIconObject | keyof typeof LEGACY_ALIASES;

function resolveObject(name: BrandIconName): BrandIconObject {
  return name in LEGACY_ALIASES
    ? LEGACY_ALIASES[name as keyof typeof LEGACY_ALIASES]
    : (name as BrandIconObject);
}

export function BrandIcon({
  name,
  size = 56,
  fill,
  label,
  priority,
  tile = false,
  state,
  className,
}: {
  name: BrandIconName;
  /** Rendered edge length in px. Ignored when `fill` is set. */
  size?: number;
  /** Fill the parent box so a wrapper can size the icon responsively. */
  fill?: boolean;
  /** Accessible name. Omit for decorative icons. */
  label?: string;
  priority?: boolean;
  /**
   * Draw the full glass chip behind the object. OFF by default: see the note
   * at the top of this file. Turn it on only where the object is the subject
   * of the surface rather than an ornament on it.
   */
  tile?: boolean;
  /**
   * React to something real rather than to a loop: "alert" rings the object
   * while something is unread, "confirmed" pops it once when a booking lands,
   * "verified" pulses its inner ring while a check is in force.
   */
  state?: "alert" | "confirmed" | "verified";
  className?: string;
}) {
  const decorative = !label;
  const object = resolveObject(name);
  const twinned = LIGHT_TWINS.has(object);

  /*
   * `fill` here means "fill the wrapper box", implemented with intrinsic
   * dimensions plus width and height of 100 percent rather than Next's
   * absolute fill mode. Absolute fill escapes any wrapper that is not
   * positioned, which silently spills icons across the card they belong to.
   *
   * WHY A FIXED-SIZE TILE OVERRIDES ITS OWN PADDING. The tile is styled with
   * `padding: 9%`, and a percentage padding resolves against the width of the
   * CONTAINING BLOCK, never against the element's own width. When the tile
   * fills a sized wrapper that is harmless, because the wrapper is the same
   * small box. But a `size`d tile sitting directly in something wide, a button
   * or a flex row, resolved 9% against that wide parent: a 22px chip inside a
   * 330px button was handed roughly 30px of padding per side, which crushed its
   * content box to zero and rendered a 0 by 0 image. The result was an empty
   * white chip, which is exactly what "Add New Listing" on the agent dashboard
   * was showing, and it affected every non-fill BrandIcon on the platform.
   *
   * So when this component owns the tile's dimensions it also owns its padding,
   * in pixels derived from that size. Same proportion, no dependence on whatever
   * the tile happens to sit inside.
   */
  const tilePadding = Math.max(2, Math.round(size * 0.09));
  const insideTile = tile;
  const shared = {
    "aria-hidden": decorative || undefined,
    width: fill ? 160 : size,
    height: fill ? 160 : size,
    sizes: fill ? "(max-width: 640px) 26vw, 160px" : undefined,
  } as const;

  /*
   * THE THEME SWITCH IS TWO ELEMENTS AND A DISPLAY RULE, AND THAT IS ON PURPOSE.
   *
   * The theme is `data-theme` on the document element, not an OS preference, so
   * `<picture>` and `prefers-color-scheme` cannot see it and neither can
   * `image-set()`. Swapping `src` in an effect would mean the server renders the
   * wrong artwork first and every twinned mark flickers on hydration, on the
   * confirmation screens where the mark is the emotional payload.
   *
   * So both files are in the markup and CSS chooses. The hidden copy carries
   * `loading="lazy"`, which is Next's default whenever `priority` is not set,
   * and a lazy image inside a `display: none` ancestor never enters the
   * viewport, so the browser never fetches it. Measured in Chromium 1194 rather
   * than assumed: a lazy hidden image produced no network request and an eager
   * hidden one produced a request, which is why `priority` is deliberately NOT
   * forwarded to the twin. A browser that fetches both anyway costs one extra
   * 20KB PNG on 23 of 103 objects and still renders correctly, so the worst case
   * is a download rather than a defect. `display: none` also removes the hidden
   * copy from the accessibility tree, so the label is announced once.
   */
  const img = (
    <>
      <Image
        {...shared}
        alt={label ?? ""}
        src={`/brand/glass/${object}.png`}
        priority={priority}
        className={`nf-brand-icon ${twinned ? "nf-brand-icon--night" : ""} ${
          fill || insideTile ? "h-full w-full" : ""
        }`}
      />
      {twinned ? (
        <Image
          {...shared}
          alt={label ?? ""}
          src={`/brand/glass/light/${object}.png`}
          className={`nf-brand-icon nf-brand-icon--day ${
            fill || insideTile ? "h-full w-full" : ""
          }`}
        />
      ) : null}
    </>
  );

  if (!tile) {
    /*
     * The ground hugs the image rather than being sized here: the artwork
     * carries its own transparent margin, between 5 and 14 percent on the
     * single objects, so the chip reads as a plate with the object breathing
     * inside it and needs no padding of its own. Sizing stays wherever the
     * call site already put it.
     *
     * In the dark theme this paints NOTHING. `--nf-icon-ground` is transparent
     * there now, which is the whole point of the new artwork, and the element
     * survives only because the light theme still wants a navy chip behind the
     * 80 objects that have no light twin.
     */
    return (
      <span
        className={`nf-brand-icon-ground ${twinned ? "nf-brand-icon-ground--twinned" : ""} ${
          fill ? "block h-full w-full" : "inline-flex"
        } ${className ?? ""}`}
      >
        {img}
      </span>
    );
  }

  return (
    <span
      data-state={state}
      style={fill ? undefined : { width: size, height: size, padding: tilePadding }}
      className={`nf-icon-tile ${fill ? "h-full w-full" : ""} ${className ?? ""}`}
    >
      {img}
    </span>
  );
}
