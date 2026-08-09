/**
 * Tier one icons: the functional set for dense controls.
 *
 * The design direction calls for two icon tiers. Tier two is the 3D signature
 * object family, which carries a lit tile and reads beautifully from about 32px
 * up. Below that the tile collapses into an unreadable coloured square, so
 * dense UI needs a different instrument.
 *
 * These are crisp stroked glyphs on a 24 grid. They inherit `currentColor`, so
 * they take the colour of whatever they sit beside, and they stay legible at
 * 12px where a rendered 3D object cannot.
 */

export type UiIconName =
  | "search"
  | "plus"
  | "minus"
  | "close"
  | "star"
  | "bed"
  | "bath"
  | "pool"
  | "wifi"
  | "parking"
  | "kitchen"
  | "verified"
  | "location"
  | "chevron-down"
  | "arrow-right"
  | "arrow-left"
  | "sparkle"
  | "home"
  | "compass"
  | "building-hotel"
  | "building-apartment"
  | "house"
  | "utensils"
  | "ticket"
  | "calendar-booking"
  | "chat-bubble"
  | "bell"
  | "wallet"
  | "user"
  | "settings-gear"
  | "heart"
  | "grid"
  | "key"
  | "sliders"
  | "share"
  | "shield-stop"
  | "panel-left"
  | "menu"
  | "document"
  | "chevron-right"
  | "map"
  /* ------------------------------------------- folded in from the two
     private sets. See the note at the top of the file. */
  | "history"
  | "trash"
  | "repost"
  | "views"
  | "more"
  | "bookmark"
  | "picture"
  | "link"
  | "flag"
  | "mute"
  | "block"
  | "sun"
  | "moon"
  /* ---------------------------------- consolidated from inline SVG blocks.
     Each of these was hand-drawn at a call site, several of them more than
     once, at a stroke weight the platform does not use. */
  | "eye"
  | "eye-off"
  | "arrow-up"
  | "arrow-down"
  | "info"
  | "mail";

const PATHS: Record<UiIconName, React.ReactNode> = {
  // Filter control. Two rails with offset handles, the convention every
  // traveller already recognises from the apps they use daily.
  sliders: (
    <>
      <path d="M3 8h5m4 0h9" />
      <path d="M3 16h11m4 0h3" />
      <circle cx="10" cy="8" r="2.1" />
      <circle cx="16" cy="16" r="2.1" />
    </>
  ),
  // Share. The outbound tray: a box open at the top with an arrow leaving it.
  share: (
    <>
      <path d="M12 3.6v10" />
      <path d="m8.4 7.2 3.6-3.6 3.6 3.6" />
      <path d="M6.4 12.4H5.2A1.2 1.2 0 0 0 4 13.6v5.6a1.2 1.2 0 0 0 1.2 1.2h13.6a1.2 1.2 0 0 0 1.2-1.2v-5.6a1.2 1.2 0 0 0-1.2-1.2h-1.2" />
    </>
  ),
  // Map view. A folded sheet, so it reads as a map rather than a pin.
  map: (
    <>
      <path d="M9.4 4.2 4 6.4v13.4l5.4-2.2 5.2 2.2 5.4-2.2V4.2l-5.4 2.2z" />
      <path d="M9.4 4.2v13.4" />
      <path d="M14.6 6.4v13.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.6" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  // Zoom in and out. Drawn rather than typed: a "+" glyph inherits the font's
  // own weight and optical centre and would not sit on the stroke language the
  // rest of this set shares.
  plus: (
    <>
      <path d="M12 5.2v13.6" />
      <path d="M5.2 12h13.6" />
    </>
  ),
  minus: <path d="M5.2 12h13.6" />,
  star: (
    <path d="M12 3.6l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.62l-5.1 2.68.98-5.68L3.75 9.6l5.7-.83Z" />
  ),
  bed: (
    <>
      <path d="M3 18v-6.2A1.8 1.8 0 0 1 4.8 10H21v8" />
      <path d="M3 7v11M21 14H3" />
      <path d="M7.5 10V8.2A1.2 1.2 0 0 1 8.7 7h8.1a1.2 1.2 0 0 1 1.2 1.2V10" />
    </>
  ),
  bath: (
    <>
      <path d="M3 11.5h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z" />
      <path d="M6 11.5V6.2A2.2 2.2 0 0 1 8.2 4c1.1 0 2 .8 2.16 1.85" />
      <path d="M7 18.5 6 21M17 18.5l1 2.5" />
    </>
  ),
  pool: (
    <>
      <path d="M2.6 16.4c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5" />
      <path d="M2.6 20.2c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5" />
      <path d="M7.6 15.4V5.6a2.2 2.2 0 0 1 4.4 0v9.2M16.4 15.4V5.6a2.2 2.2 0 0 0-4.4 0" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.6 8.4a14 14 0 0 1 18.8 0" />
      <path d="M5.9 12a9.4 9.4 0 0 1 12.2 0" />
      <path d="M9.2 15.5a4.8 4.8 0 0 1 5.6 0" />
      <circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  parking: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.2" />
      <path d="M9.4 16.6V7.4h3.4a2.9 2.9 0 0 1 0 5.8H9.4" />
    </>
  ),
  kitchen: (
    <>
      <rect x="4" y="3.2" width="16" height="17.6" rx="2.4" />
      <path d="M4 9.4h16" />
      <circle cx="7.4" cy="6.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.9" cy="6.3" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  verified: (
    <>
      <path d="M12 2.9 19.2 6v5.3c0 4.3-2.9 8-7.2 9.6-4.3-1.6-7.2-5.3-7.2-9.6V6Z" />
      <path d="m8.7 11.8 2.3 2.3 4.3-4.4" />
    </>
  ),
  // An agent stopped from trading. Deliberately the same shield as `verified`,
  // to the pixel, with a bar where the tick goes: these two are the same
  // judgement pointing opposite ways, and reading one as the negative of the
  // other is the whole point. A shield rather than a cross because a stop is
  // protective of the people on the other side of it, not punitive.
  /*
   * The side navigation toggle, and the reason the hamburger is gone.
   *
   * Three stacked lines say "a list is behind this" and nothing more; they are
   * the same glyph whether the thing that opens is a menu, a filter sheet or a
   * drawer. This says what actually happens: a panel slides in beside the
   * content. The frame is the screen, the fill is the panel, and the divider
   * sits where the panel's edge lands.
   */
  /* Terms, and any other page that is a document rather than a destination.
     A sheet with a folded corner and three lines of text on it. */
  document: (
    <>
      <path d="M13.6 3.4H7.2A2 2 0 0 0 5.2 5.4v13.2a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2V8.6Z" />
      <path d="M13.6 3.4v3.4a1.8 1.8 0 0 0 1.8 1.8h3.4" />
      <path d="M8.8 13h6.4M8.8 16.4h4.2" />
    </>
  ),
  /*
   * THE MENU. Three lines, and that is the whole design.
   *
   * `panel-left` below is what the app header used before it, on the argument
   * that three stacked lines "say a list is behind this and nothing more"
   * while a frame with a divider says what actually happens. That argument is
   * correct about what the two glyphs MEAN and wrong about what people know.
   * The three lines are the most recognised control in software; a bordered
   * rectangle with a line in it is a glyph somebody has to be taught, and it
   * is also almost exactly the shape of a sidebar TOGGLE in a desktop
   * application, which is a different control.
   *
   * The owner asked for a plain three line menu, so it is plain: three equal
   * strokes, evenly spaced, no decorative shortening of the middle one, no
   * animation into a cross.
   */
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "panel-left": (
    <>
      <rect x="3.2" y="4.4" width="17.6" height="15.2" rx="3" />
      <path d="M9.4 4.4v15.2" />
    </>
  ),
  /* A disclosure arrow for a parent that opens. Its own glyph rather than a
     rotated `chevron-down`, because a rotation of a down chevron lands its
     round caps on a different diagonal and reads slightly heavier. */
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "shield-stop": (
    <>
      <path d="M12 2.9 19.2 6v5.3c0 4.3-2.9 8-7.2 9.6-4.3-1.6-7.2-5.3-7.2-9.6V6Z" />
      <path d="M8.9 12.1h6.2" />
    </>
  ),
  location: (
    <>
      <path d="M12 21.4s7-5.9 7-11.4a7 7 0 1 0-14 0c0 5.5 7 11.4 7 11.4Z" />
      <circle cx="12" cy="9.8" r="2.6" />
    </>
  ),
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "arrow-right": (
    <>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M19.5 12h-15" />
      <path d="m10.5 6-6 6 6 6" />
    </>
  ),
  sparkle: (
    <path d="M12 3.4 13.6 8l4.6 1.6-4.6 1.6L12 15.8l-1.6-4.6L5.8 9.6 10.4 8Z" />
  ),
  /* ------------------------------------------------ navigation glyphs.
     Drawn for the rail and tab bar: quiet, organic geometry that reads at
     22 to 24px beside a label, with round caps softening every terminal. */
  home: (
    <>
      <path d="m4.2 10.9 7-6.1a1.2 1.2 0 0 1 1.6 0l7 6.1" />
      <path d="M6.2 9.4V19a1.7 1.7 0 0 0 1.7 1.7h8.2a1.7 1.7 0 0 0 1.7-1.7V9.4" />
      <path d="M10 20.7v-4.9a1.3 1.3 0 0 1 1.3-1.3h1.4a1.3 1.3 0 0 1 1.3 1.3v4.9" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.7 8.3-1.9 5.5-5.5 1.9 1.9-5.5Z" />
    </>
  ),
  /*
   * HOTEL, REDRAWN. The owner called this one out by name.
   *
   * What was wrong with it: a tower, a ground line, a door, and then TWELVE
   * separate window ticks drawn as six pairs of 1.3-unit dashes. At the sizes
   * this glyph is actually used - 20 to 24px - those twelve marks collapse into
   * a grey texture, so the icon read as a hatched rectangle rather than as a
   * building. It was also drawing three things a hotel does not need to be
   * recognised: the ground it stands on, its front door, and every window.
   *
   * This is a bed and a canopy. A hotel is somewhere you SLEEP, which is what
   * distinguishes it from an office block, and a bed says that in three strokes
   * where a facade needs fifteen. Four marks total, all of them legible at
   * 16px, and it reads as a distinct silhouette next to the apartment tower
   * rather than as the same rectangle with different hatching.
   */
  "building-hotel": (
    <>
      <path d="M3.4 19.4v-6.2a2 2 0 0 1 2-2h13.2a2 2 0 0 1 2 2v6.2" />
      <path d="M3.4 16.2h17.2" />
      <path d="M6.6 11.2V8a2.4 2.4 0 0 1 2.4-2.4h6a2.4 2.4 0 0 1 2.4 2.4v3.2" />
      <path d="M12 5.6V3.4" />
    </>
  ),
  "building-apartment": (
    <>
      <path d="M9.5 20.6V5.2a1.7 1.7 0 0 1 1.7-1.7h6.3a1.7 1.7 0 0 1 1.7 1.7v15.4" />
      <path d="M9.5 9.6H6.5a1.7 1.7 0 0 0-1.7 1.7v9.3" />
      <path d="M3 20.6h18" />
      <path d="M12.6 7.4h1.2M15.7 7.4h1.2M12.6 10.9h1.2M15.7 10.9h1.2M12.6 14.4h1.2M15.7 14.4h1.2M6.9 13.1h.01M6.9 16.6h.01" />
    </>
  ),
  house: (
    <>
      <path d="m4 11.2 6.9-6a1.7 1.7 0 0 1 2.2 0l1.7 1.5V5.2h2.6v3.8l2.6 2.2" />
      <path d="M6.1 9.6v9.3a1.8 1.8 0 0 0 1.8 1.8h8.2a1.8 1.8 0 0 0 1.8-1.8V9.6" />
      <path d="M10.1 20.7v-4.2a1.9 1.9 0 0 1 3.8 0v4.2" />
    </>
  ),
  utensils: (
    <>
      <path d="M6.8 3.4v4.9a2.4 2.4 0 0 0 4.8 0V3.4" />
      <path d="M9.2 10.7v9.9" />
      <path d="M17.2 12.7h-2.5c0-4.6.8-7.7 2.5-9.3v17.2" />
    </>
  ),
  ticket: (
    <>
      <path d="M3.5 13.8v1.9a1.9 1.9 0 0 0 1.9 1.9h13.2a1.9 1.9 0 0 0 1.9-1.9v-1.9a1.8 1.8 0 0 1 0-3.6V8.3a1.9 1.9 0 0 0-1.9-1.9H5.4a1.9 1.9 0 0 0-1.9 1.9v1.9a1.8 1.8 0 0 1 0 3.6Z" />
      <path d="M14.8 7.6v1.1M14.8 11.5v1.1M14.8 15.4v1.1" />
    </>
  ),
  /*
   * BOOKING, REDRAWN. The other one the owner called out.
   *
   * What was wrong with it: a rounded rectangle, a rule under the header, two
   * hanging rings, and a tick inside. Five elements, and the two rings and the
   * header rule together put three near-horizontal lines in the top third of a
   * 24 grid, which at 20px merge into one thick band. The frame also used a
   * 2.2 radius against the 3-and-up radii the rest of this set settled on, so
   * it read as slightly boxier than everything beside it.
   *
   * Now: one softer frame, one header rule, one tick, and the rings are gone.
   * A calendar is recognised by the grid-with-a-header shape, not by its
   * hardware, and the tick is the only thing that says BOOKED rather than
   * DATE - so it is drawn larger, centred in the body, with room around it.
   */
  "calendar-booking": (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="16" rx="3.4" />
      <path d="M3.4 9.4h17.2" />
      <path d="m8.6 15 2.4 2.4 4.4-4.6" />
    </>
  ),
  "chat-bubble": (
    <path d="M4 7.1a2.9 2.9 0 0 1 2.9-2.9h10.2A2.9 2.9 0 0 1 20 7.1v6.6a2.9 2.9 0 0 1-2.9 2.9H9.8l-3.9 3.2c-.6.5-1.9.1-1.9-.7Z" />
  ),
  bell: (
    <>
      <path d="M12 3.9a5.5 5.5 0 0 0-5.5 5.5c0 2.9-.9 4.5-1.8 5.5-.4.5-.1 1.2.5 1.2h13.6c.6 0 .9-.7.5-1.2-.9-1-1.8-2.6-1.8-5.5A5.5 5.5 0 0 0 12 3.9Z" />
      <path d="M9.9 19.4a2.2 2.2 0 0 0 4.2 0" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6.1v11.6a2.6 2.6 0 0 0 2.6 2.6h11.2a2.2 2.2 0 0 0 2.2-2.2v-7.5a2.2 2.2 0 0 0-2.2-2.2H6.2A2.2 2.2 0 0 1 4 6.1a2.2 2.2 0 0 1 2.2-2.2H17" />
      <circle cx="15.9" cy="14.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.1" r="3.7" />
      <path d="M5.3 20.2a6.9 6.9 0 0 1 13.4 0" />
    </>
  ),
  "settings-gear": (
    <>
      <path d="M12.22 2.6h-.44a1.9 1.9 0 0 0-1.9 1.9v.17a1.9 1.9 0 0 1-.95 1.64l-.41.24a1.9 1.9 0 0 1-1.9 0l-.14-.08a1.9 1.9 0 0 0-2.59.7l-.21.36a1.9 1.9 0 0 0 .69 2.59l.15.1a1.9 1.9 0 0 1 .94 1.63v.48a1.9 1.9 0 0 1-.94 1.65l-.15.09a1.9 1.9 0 0 0-.69 2.59l.21.36a1.9 1.9 0 0 0 2.59.7l.14-.08a1.9 1.9 0 0 1 1.9 0l.41.24a1.9 1.9 0 0 1 .95 1.64v.17a1.9 1.9 0 0 0 1.9 1.9h.44a1.9 1.9 0 0 0 1.9-1.9v-.17a1.9 1.9 0 0 1 .95-1.64l.41-.24a1.9 1.9 0 0 1 1.9 0l.14.08a1.9 1.9 0 0 0 2.59-.7l.21-.37a1.9 1.9 0 0 0-.69-2.58l-.15-.09a1.9 1.9 0 0 1-.94-1.65v-.48a1.9 1.9 0 0 1 .94-1.64l.15-.09a1.9 1.9 0 0 0 .69-2.59l-.21-.36a1.9 1.9 0 0 0-2.59-.7l-.14.08a1.9 1.9 0 0 1-1.9 0l-.41-.24a1.9 1.9 0 0 1-.95-1.64v-.17a1.9 1.9 0 0 0-1.9-1.9Z" />
      <circle cx="12" cy="12" r="3.1" />
    </>
  ),
  heart: (
    <path d="M12 20.2S4 15.4 4 9.9a4.5 4.5 0 0 1 4.5-4.5c1.5 0 2.8.7 3.5 1.9a4.2 4.2 0 0 1 3.5-1.9A4.5 4.5 0 0 1 20 9.9c0 5.5-8 10.3-8 10.3Z" />
  ),
  grid: (
    <>
      <rect x="3.8" y="3.8" width="7" height="7" rx="1.9" />
      <rect x="13.2" y="3.8" width="7" height="7" rx="1.9" />
      <rect x="3.8" y="13.2" width="7" height="7" rx="1.9" />
      <rect x="13.2" y="13.2" width="7" height="7" rx="1.9" />
    </>
  ),
  key: (
    <>
      <circle cx="7.6" cy="15.6" r="3.6" />
      <path d="m10.3 12.9 8.6-8.6" />
      <path d="m15.6 4.9 3 3" />
      <path d="m12.9 8.3 2.4 2.4" />
    </>
  ),
  /*
   * Close. Four sheets were painting `&times;` instead, which is a typographic
   * multiplication sign: it renders at the font's own weight rather than the
   * icon stroke, sits on the text baseline instead of the optical centre, and
   * drifted across three different font sizes. Drawn on the same 24 grid as
   * the rest of the set, it inherits strokeWidth and centres properly.
   */
  close: (
    <>
      <path d="M6.4 6.4 17.6 17.6" />
      <path d="M17.6 6.4 6.4 17.6" />
    </>
  ),

  /* ------------------------------------------------------- folded in.
     Everything below arrived from `components/app/assistant/glyphs.tsx` or
     `components/social/feed/PostGlyph.tsx`. Redrawn where the private set had
     hand-tuned its own stroke weight, because the weight is the platform's and
     is derived from the size here; otherwise the geometry is carried over
     unchanged, which is why the social marks still read as the family they
     were designed as. */

  /* Clock face with a rewind arrow. Conversation history. */
  history: (
    <>
      <path d="M3.2 12a8.8 8.8 0 1 0 2.6-6.2" />
      <path d="M3.2 3.4v4.4h4.4" />
      <path d="M12 7.6v4.6l3 2.4" />
    </>
  ),

  /* A lid, a body, and nothing inside it. */
  trash: (
    <>
      <path d="M4.2 7h15.6" />
      <path d="M9.2 7V5.4A1.4 1.4 0 0 1 10.6 4h2.8a1.4 1.4 0 0 1 1.4 1.4V7" />
      <path d="M6.6 7l.75 11.7a1.9 1.9 0 0 0 1.9 1.8h5.5a1.9 1.9 0 0 0 1.9-1.8L17.4 7" />
      <path d="M10 10.8v5.7M14 10.8v5.7" />
    </>
  ),

  /* Two rails and two chevrons: the same words travelling to another place and
     back. Squared corners rather than the soft recycle loop every other
     product uses, and open chevrons so the direction survives at 16px. */
  repost: (
    <>
      <path d="M7.4 9.2V7.6A1.8 1.8 0 0 1 9.2 5.8h7.4" />
      <path d="M14.2 3.4 16.8 5.8 14.2 8.2" />
      <path d="M16.6 14.8v1.6a1.8 1.8 0 0 1-1.8 1.8H7.4" />
      <path d="M9.8 15.8 7.2 18.2 9.8 20.6" />
    </>
  ),

  /* Three strokes rising, the tallest capped with a node. Deliberately not an
     eye, which is the glyph every other product reaches for and which quietly
     says "we are watching you". */
  views: (
    <>
      <path d="M5.5 17.8v-3.4" />
      <path d="M12 17.8v-6.8" />
      <path d="M18.5 17.8V9.2" />
      <circle cx="18.5" cy="6.4" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),

  /* Three nodes. The one conventional mark in the social set, by request: an
     invented affordance for "more actions" is an affordance nobody finds. */
  more: (
    <>
      <circle cx="5.4" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="18.6" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),

  /* A stroke folded back on itself. Keeping something is holding one end of
     it, so the mark is one line that turns rather than a ribbon. */
  bookmark: <path d="M7 5.4h10v13.2l-5-3.4-5 3.4z" />,

  /* A frame, a node and a stroke that turns twice: light above a ridge. No
     camera body and no shutter, because a picture in a post is a photograph of
     a street and not a device. */
  picture: (
    <>
      <rect x="4.2" y="5.8" width="15.6" height="12.4" rx="3.2" />
      <circle cx="9" cy="10.3" r="1.5" fill="currentColor" stroke="none" />
      <path d="M5.4 16.6 9.8 12.6l2.8 2.5 2.4-1.9 3.4 3" />
    </>
  ),

  /* Two chamfered capsules holding each other. A link is a join, and the join
     is what the mark draws. */
  link: (
    <>
      <path d="M10.4 13.6a3.6 3.6 0 0 0 5.4.4l2.2-2.2a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3" />
      <path d="M13.6 10.4a3.6 3.6 0 0 0-5.4-.4L6 12.2a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3" />
    </>
  ),

  /* A flag on a mast, the cloth cut square. Report. A gear stood here before,
     which is the icon for settings on every other screen of this platform. */
  flag: (
    <>
      <path d="M6.6 20.2V4.6" />
      <path d="M6.6 5.4h9.8l-2.2 3.6 2.2 3.6H6.6" />
    </>
  ),

  /* A bell with the clapper gone and a cut through it. Muting is not blocking:
     the bell is still there, it just says nothing. */
  mute: (
    <>
      <path d="M8 10.6a4 4 0 0 1 8 0c0 3.4 1.2 4.6 1.2 4.6H6.8S8 14 8 10.6Z" />
      <path d="M5 5 19 19" />
    </>
  ),

  /* The prohibition sign, and the one mark here that is deliberately
     universal. An invented glyph for the most permanent action in a menu is an
     invented glyph somebody presses by mistake. */
  block: (
    <>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M6.6 6.6 17.4 17.4" />
    </>
  ),

  /* Light and dark. Both were hand-drawn inline inside `ThemeToggle` with
     their own strokeWidth of 1.8, which is the fifteenth weight the sweep
     existed to remove. */
  sun: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" />
    </>
  ),
  moon: <path d="M20.2 13.6A8.4 8.4 0 0 1 10.4 3.8a8.4 8.4 0 1 0 9.8 9.8Z" />,

  /* Reveal a password. It was drawn inline in `components/auth/fields.tsx` at
     strokeWidth 1.7 and again in `wallet/BalanceCard.tsx` at strokeWidth 2, as
     two slightly different eyes doing the same job on two screens. */
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),
  /* The same eye with a cut through it. Its own name rather than a boolean on
     `eye`, because the platform's icons are named by what they mean and a
     password that is currently shown is a different meaning from one that is
     hidden. */
  "eye-off": (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.9" />
      <path d="m4.5 4.5 15 15" />
    </>
  ),

  /* A trend, up and down. Drawn inline in `StatCard` at strokeWidth 3 on an
     11px box, which renders at 1.4 CSS pixels - heavier than every other glyph
     beside it and for no reason anybody recorded. */
  "arrow-up": (
    <>
      <path d="M12 19.5v-15" />
      <path d="m6 10.5 6-6 6 6" />
    </>
  ),
  "arrow-down": (
    <>
      <path d="M12 4.5v15" />
      <path d="m6 13.5 6 6 6-6" />
    </>
  ),

  /* Listing and safety options. A circle, a stem and a node. */
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.2v5" />
      <circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),

  /* An envelope. The last surviving glyph in `components/auth/ProviderMarks`,
     which is otherwise an empty file now that Google and Apple sign in are
     gone. */
  mail: (
    <>
      <rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2.6" />
      <path d="m3.3 6.6 8.02 5.9a1.3 1.3 0 0 0 1.56 0l8.02-5.9" />
    </>
  ),
};

/**
 * THE SIZE SCALE, AND IT JUST MOVED UP A STEP.
 *
 * The owner asked for bigger icons, directly, and this is where that happens:
 * once, on the scale, rather than by editing two hundred call sites. Every step
 * except the smallest is unchanged; what moved is the FLOOR and the names.
 *
 *   before   12  16  20  24  28  32
 *   after        16  20  24  28  32  40
 *
 * The 12px step is gone. It was the single most-used size on the platform - the
 * tick in a badge, the chevron in a row, the pin on a location line - and at
 * 12px a stroked glyph on a 24 grid renders at 0.7 CSS pixels of stroke, which
 * on a non-retina screen is a grey smudge rather than a line. `snapUiIconSize`
 * rounds anything below the floor UP to 16, so every one of those call sites
 * got a third bigger and a good deal crisper without being touched, and none of
 * them can drift back off the grid.
 *
 * 40 is added at the top for the places that genuinely want a display glyph:
 * an empty state, the mark in a role row, a submitted screen.
 *
 * THE NAMES MOVED WITH IT. `sm` was 16 and is now 20, `md` was 20 and is now
 * 24, and the DEFAULT is `sm` rather than the old 16. A component that asked
 * for a named step asked for "the small one", not for "sixteen pixels", so the
 * names are what carry the increase to everything that used them.
 */
export const UI_ICON_SIZES = [16, 20, 24, 28, 32, 40] as const;
export type UiIconSize = (typeof UI_ICON_SIZES)[number];

/** Nearest step, ties to the larger. Clamped to the ends of the scale. */
export function snapUiIconSize(size: number): UiIconSize {
  let best: UiIconSize = UI_ICON_SIZES[0];
  let bestGap = Number.POSITIVE_INFINITY;
  for (const step of UI_ICON_SIZES) {
    const gap = Math.abs(step - size);
    if (gap <= bestGap) {
      best = step;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * The same scale, named.
 *
 * Numbers are what the grid is defined in, but a call site reads better saying
 * what it means than restating the arithmetic, and a name cannot drift the way
 * a literal can. These are six of the seven steps above under the names the
 * rest of the platform uses; nothing here is a size the scale does not have.
 */
export const ICON_SIZE = { xs: 16, sm: 20, md: 24, lg: 28, xl: 32, display: 40 } as const;
export type IconSize = keyof typeof ICON_SIZE;

/**
 * THE WEIGHT. One weight, expressed as rendered CSS pixels rather than as a
 * number on the 24 grid.
 *
 * `strokeWidth` is measured in the viewBox's own units, so a fixed 1.8 renders
 * at 1.8 CSS px on a 24px glyph and at 0.9 CSS px on a 12px one. That is why
 * thirty-two call sites had each hand-tuned their own value between 1.5 and
 * 2.6: they were compensating for the scaling, one guess at a time, and the
 * platform ended up with a dozen weights.
 *
 * So the weight is stated once, in the unit a reader actually sees, and the
 * grid number is derived from the size. Every stroked glyph on the platform
 * renders at exactly this many CSS pixels, at every step of the scale. This is
 * the optical sizing the audit asked for, stated as a constant rather than as a
 * clamped division, and it is why no call site carries a stroke of its own.
 */
export const UI_ICON_STROKE_PX = 1.5;

/**
 * Symbol effects.
 *
 * The reference set headlines animated icons: the bell rings on a new
 * notification, the heart pulses and fills on save, refresh rotates, send
 * flies. The platform had zero of this across 166 icon usages - the one
 * bell-wiggle keyframe that existed in globals.css had no call sites at all.
 *
 * The effect is a class, not a prop-driven animation, so it costs nothing when
 * unused and every one of them collapses under prefers-reduced-motion.
 */
export type SymbolEffect = "bounce" | "pulse" | "wiggle" | "rotate" | "fly";

/**
 * Which glyphs can actually be filled.
 *
 * `fill="currentColor"` is only meaningful on a closed silhouette. Most of this
 * set is drawn as open strokes - `home` is three separate open paths, `user` is
 * a circle plus an open shoulder arc - and filling those produces a blob, not a
 * filled icon. Only the glyphs whose outline closes into a single readable
 * shape are listed here, and `filled` is ignored for everything else so a call
 * site cannot ship a broken one.
 *
 * Growing this list means redrawing the glyph as a closed silhouette first.
 * That is the real work behind proper filled/outline variants, and it is worth
 * doing for the tab bar set; until then the honest behaviour is to decline.
 */
const FILLABLE = new Set<UiIconName>([
  "heart",
  "star",
  "verified",
  "bell",
  "location",
  // These are already authored as a single closed path, so the stroked drawing
  // fills correctly with no separate silhouette needed.
  "chat-bubble",
  "sparkle",
  "ticket",
  /* Both close into a single readable silhouette, and both have a real active
     state: a saved post and a reposted one. */
  "bookmark",
  "block",
  "moon",
]);

/**
 * Filled silhouettes.
 *
 * The proper way to do a filled/outline pair is to DRAW the filled member, not
 * to pour paint into an outline: an outline is a set of strokes describing
 * edges, and filling it produces a blob. That is why `filled` was originally
 * gated to the handful of glyphs that happen to close.
 *
 * These are the navigation set - the tab bar and the top of the side drawer -
 * where an active state genuinely needs to read as solid rather than as a
 * slightly heavier line. Each is a single closed path on the same 24 grid as
 * its outline sibling, with interior detail knocked out using evenodd so the
 * shape stays readable at 22px rather than turning into a lump.
 *
 * A glyph listed here uses this path when `filled`; anything not listed falls
 * back to its stroked drawing, so adding one is additive and never breaks a
 * call site.
 */
const FILLED_PATHS: Partial<Record<UiIconName, React.ReactNode>> = {
  home: (
    <path d="M11.02 3.62a1.5 1.5 0 0 1 1.96 0l7.63 6.64c.4.35.15 1.01-.38 1.01H18.3v7.83a2 2 0 0 1-2 2h-2.9v-4.7a1.4 1.4 0 0 0-2.8 0v4.7H7.7a2 2 0 0 1-2-2v-7.83H3.77c-.53 0-.78-.66-.38-1.01Z" />
  ),
  house: (
    <path d="M11.02 3.62a1.5 1.5 0 0 1 1.96 0l2.02 1.76V5.2a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v3.09l2.63 2.29c.4.35.15 1.01-.38 1.01H18.3v7.68a2 2 0 0 1-2 2h-2.9v-4.55a1.4 1.4 0 0 0-2.8 0v4.55H7.7a2 2 0 0 1-2-2v-7.68H3.77c-.53 0-.78-.66-.38-1.01Z" />
  ),
  compass: (
    <path
      fillRule="evenodd"
      d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2Zm3.7 4.9-1.9 5.5-5.5 1.9 1.9-5.5Z"
    />
  ),
  user: (
    <path d="M12 4.4a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Zm0 8.7c4.06 0 7.35 2.55 7.35 5.7 0 .94-.76 1.4-1.6 1.4H6.25c-.84 0-1.6-.46-1.6-1.4 0-3.15 3.29-5.7 7.35-5.7Z" />
  ),
  /* The filled twin of the redrawn outline. The two rings are gone from this
     one too: a silhouette that disagrees with its own outline is two icons. */
  "calendar-booking": (
    <path
      fillRule="evenodd"
      d="M6.8 4.6h10.4a3.4 3.4 0 0 1 3.4 3.4v9.6a3.4 3.4 0 0 1-3.4 3.4H6.8a3.4 3.4 0 0 1-3.4-3.4V8a3.4 3.4 0 0 1 3.4-3.4Zm-1.6 5.6v7.4c0 .88.72 1.6 1.6 1.6h10.4c.88 0 1.6-.72 1.6-1.6v-7.4Zm3.4 4.8 2.4 2.4 4.4-4.6 1.3 1.24-5.66 5.92-3.68-3.68Z"
    />
  ),
  key: (
    <path
      fillRule="evenodd"
      d="M18.9 3.06a1 1 0 0 1 1.42 0l.62.62a1 1 0 0 1 0 1.42l-7.9 7.9a4.6 4.6 0 1 1-2.04-2.04ZM7.6 12a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm0 1.9a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z"
    />
  ),
  wallet: (
    <path
      fillRule="evenodd"
      d="M6.2 2.9H17a.9.9 0 1 1 0 1.8H6.2a1.3 1.3 0 0 0 0 2.6h11.6A3.1 3.1 0 0 1 20.9 10.4v7.3a3.1 3.1 0 0 1-3.1 3.1H6.6A3.5 3.5 0 0 1 3.1 17.3V6.1A3.2 3.2 0 0 1 6.2 2.9Zm9.7 10.2a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z"
    />
  ),
};

export function UiIcon({
  name,
  /* `sm` is 20px now, up from 16. See the scale note above. */
  size = ICON_SIZE.sm,
  className,
  label,
  effect,
  /** Plays the effect continuously rather than once on mount or on hover. */
  effectLoop,
  filled,
}: {
  name: UiIconName;
  /** A step on the scale, or its name. Anything else snaps onto the nearest. */
  size?: number | IconSize;
  className?: string;
  /** Accessible name. Omit when a text label sits beside the glyph. */
  label?: string;
  effect?: SymbolEffect;
  effectLoop?: boolean;
  /**
   * Paints the glyph solid instead of stroked. This is what a saved heart or a
   * rated star should use; the previous "active" state was a stroke change of
   * 0.18 CSS pixels, which is invisible.
   *
   * Only honoured for glyphs in FILLABLE above. Asking for it on an
   * open-stroke glyph is silently ignored rather than rendering a blob.
   */
  filled?: boolean;
}) {
  const edge = snapUiIconSize(typeof size === "number" ? size : ICON_SIZE[size]);
  /*
   * A drawn silhouette wins over pouring paint into an outline. If neither
   * exists for this glyph, `filled` is ignored rather than rendering a blob.
   */
  const silhouette = filled ? FILLED_PATHS[name] : undefined;
  const solid = Boolean(filled) && (Boolean(silhouette) || FILLABLE.has(name));
  return (
    <svg
      width={edge}
      height={edge}
      viewBox="0 0 24 24"
      fill={solid ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={(UI_ICON_STROKE_PX * 24) / edge}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[
        effect ? `nf-sym nf-sym--${effect}` : "",
        effect && effectLoop ? "nf-sym--loop" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* A silhouette is a closed shape, so it is filled and NOT stroked: the
          svg's stroke weight stays where every stroked glyph reads it from, and
          the fill turns it off for this one path rather than for the family. */}
      {silhouette ? <g stroke="none">{silhouette}</g> : PATHS[name]}
    </svg>
  );
}
