import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";

/**
 * The door while its one read is in flight: the card's own outline, so the
 * page does not jump when the card arrives, and the words for what is
 * happening for anybody who cannot see the shimmer.
 */
export default async function DoorLoading() {
  const t = getDictionary(await getLocale());
  return (
    <div className="nf-panel nf-door__card" aria-busy="true" data-testid="door-loading">
      <p className="nf-door__eyebrow">{t.frontDoor.door.loading}</p>
      <div className="nf-door__lead">
        <span className="nf-skeleton nf-door__photo" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-xs" aria-hidden="true">
          <span className="nf-skeleton h-5 w-4/5" />
          <span className="nf-skeleton h-4 w-1/2" />
        </span>
      </div>
      <span className="nf-skeleton h-9 w-3/5" aria-hidden="true" />
      <span className="nf-skeleton h-11 w-full" aria-hidden="true" />
    </div>
  );
}
