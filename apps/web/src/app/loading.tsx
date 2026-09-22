import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import "@/app/css/system.css";

/**
 * The wait, at the root, and therefore the platform's floor.
 *
 * It is here for the landing page above all. `/` is the one route with no
 * segment of its own to hang a boundary on, and it is the most expensive
 * page on the platform to render. It was also the only page a stranger ever
 * sees first, and it had no loading state at all.
 *
 * As a ROOT boundary it is also the fallback for any segment that has not
 * got a closer one. A nested `loading.tsx` always wins for its own subtree,
 * so `(app)`, `(auth)` and `(site)` keep the skeletons that mirror their
 * screens and nothing here overrides them.
 *
 * It draws the landing hero's shape in the register rather than a spinner:
 * the mark, three display lines, a lede, the search pill at its real height
 * inside a glass capsule, and the feature grid as four glass cards. The one
 * ambient is the living canvas the root layout already mounts; nothing here
 * paints a second one.
 */
export default function LoadingRoot() {
  return (
    <LoadingShell label="Loading Vallo" className="nf-shell nf-wait py-section">
      {/* 48 by 46, which is the mark's real 614:587 shape. It was declared
          square here and squared again by `.nf-wait__mark`, so the first
          thing a stranger saw on the slowest page in the product was the
          logo stretched 4.6 per cent. See `design-system/brand/Logo.tsx`. */}
      <Image
        src="/brand/vallo-mark.png"
        alt=""
        aria-hidden="true"
        width={48}
        height={46}
        priority
        className="nf-wait__mark"
      />

      <div className="mt-xl max-w-2xl">
        {/* Three display lines, which is what the hero is. */}
        <Skeleton width="min(18rem, 80%)" height="3.25rem" radius="sm" />
        <Skeleton width="min(20rem, 88%)" height="3.25rem" radius="sm" className="mt-sm" />
        <Skeleton width="min(16rem, 72%)" height="3.25rem" radius="sm" className="mt-sm" />

        <Skeleton width="min(34rem, 100%)" height="1.25rem" radius="sm" className="mt-lg" />

        {/* The search bar: the field and its submit inside one glass panel.
            ROUNDED RECTANGLES, and the comment that stood here cited the
            section 8 amendment, which is WITHDRAWN (DESIGN_DIRECTION 1.4,
            ledger 13.4). Restating a withdrawn amendment is how it survives,
            so the citation goes with the shape.

            A skeleton is a SHAPE and section 1.4 exempts it, so rule 10 is
            right to stay silent. The law reaches these two through what they
            are a picture of: the landing's real search field and its real
            submit both measured 14px on the live page (ledger 13.3), so a
            capsule here is a picture of a control the product does not draw,
            and the page visibly reshapes the moment it loads, which is the one
            thing a skeleton exists to prevent. `md` is 14px, the control rung,
            on a 48px slab: ratio 0.29. Seven siblings were moved in 13.4;
            these two were missed. */}
        <div className="nf-wait__pill">
          <Skeleton height="3rem" radius="md" />
          <Skeleton width="6.5rem" height="3rem" radius="md" className="shrink-0" />
        </div>
      </div>

      <div className="nf-wait__grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-card p-card">
            <Skeleton circle width="2.5rem" />
            <Skeleton width="60%" height="1rem" radius="sm" className="mt-md" />
            <Skeleton width="85%" height="0.75rem" radius="sm" className="mt-xs" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
