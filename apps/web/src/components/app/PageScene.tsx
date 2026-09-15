import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * Page scene anchor.
 *
 * A commissioned brand object dissolved into the canvas behind a page's
 * opening lines. It carries the platform's identity through the app itself:
 * Bookings, Wallet, Saved and the rest stop being generic lists and start
 * looking like rooms in one building.
 *
 * IT TAKES A BRAND OBJECT NAME NOW, NOT AN IMAGE PATH.
 *
 * It used to take `art`, a path into `/brand/story-*.png`: eight large scene
 * renders from the RentMe era. Two of them, `story-verified` and
 * `story-world`, had the old RentMe R-and-house logo MODELLED INTO THE
 * ARTWORK, so the dead brand was shipping on Saved and on the trust strip long
 * after every string had been renamed. A logo baked into a PNG survives a name
 * sweep, which is the lesson worth keeping from this.
 *
 * They are replaced by the 87 commissioned brand objects, which are already in
 * the repository, already on brand, already the platform's own visual language,
 * and roughly a hundredth of the weight: the eight scenes were 6.6MB between
 * them. Nothing here is a stand-in awaiting a better file.
 *
 * Purely decorative and pointer-transparent, sized so it never competes with
 * the content sitting in front of it.
 *
 * WHY THERE ARE TWO DIVS. The scene is deliberately offset past the right edge
 * so it bleeds off the page rather than sitting politely inside a margin. Left
 * to itself that offset counts towards the document's scrollable width, and on
 * a 390px phone it added 29px of horizontal scroll to every screen using this
 * component: Bookings, Wallet, Saved, Rent and Checkout all drifted sideways
 * under a thumb, with nothing there to see. So the outer div takes the same box
 * as the positioning parent and clips, while the inner one carries the offset.
 *
 * The clip is `overflow-x-clip`, on one axis, and that choice is the whole
 * trick. This art is also meant to run vertically past its little parent box,
 * which is only as tall as the page heading, so clipping both axes would slice
 * most of the scene away. `overflow-x` alone would normally force the y axis to
 * `auto` and hand back a scrollbar, but `clip` is exempt from that rule and
 * creates no scroll container at all. The bleed therefore looks exactly as
 * designed in both directions and contributes no scrollable width.
 */
export function PageScene({
  art,
  className,
}: {
  /** A commissioned brand object. See `BrandIconName` for the 87 available. */
  art: BrandIconName;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-x-clip"
    >
      <div
        className={`absolute right-[-14%] top-[-22%] w-[62%] max-w-[300px] sm:right-[-6%] sm:w-[46%] sm:max-w-[380px] ${className ?? ""}`}
      >
        <BrandIcon name={art} fill className="nf-page-scene h-auto w-full" />
      </div>
    </div>
  );
}
