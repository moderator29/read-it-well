import Image from "next/image";

/**
 * Page scene anchor.
 *
 * A commissioned scene dissolved into the canvas behind a page's opening
 * lines, the same treatment the landing hero gets. It carries the platform's
 * identity through the app itself: Bookings, Wallet, Saved and the rest stop
 * being generic lists and start looking like rooms in one building.
 *
 * Purely decorative and pointer-transparent, sized so it never competes with
 * the content sitting in front of it.
 */
export function PageScene({
  art,
  className,
}: {
  art: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute right-[-14%] top-[-22%] -z-10 w-[62%] max-w-[300px] sm:right-[-6%] sm:w-[46%] sm:max-w-[380px] ${className ?? ""}`}
    >
      <Image
        src={art}
        alt=""
        width={900}
        height={900}
        sizes="(max-width: 640px) 62vw, 380px"
        className="nf-page-scene h-auto w-full"
      />
    </div>
  );
}
