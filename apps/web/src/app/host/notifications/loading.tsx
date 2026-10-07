import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";
import "@/app/(app)/notifications/notifications.css";

/**
 * The wait, on the host's notifications: the list's own large header, a day
 * heading with its count, and the rows (a glyph plate, the title and line,
 * the time), as `/agent/notifications` draws it in its workspace.
 */
export default async function LoadingHostNotifications() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).experienceHost.loadingScreens.notifications}>
      <div className="mx-auto w-full max-w-2xl" aria-hidden="true">
        <div className="mb-md">
          <Skeleton width="11rem" height="1.75rem" radius="sm" />
        </div>
        <div className="nf-list-section__head">
          <Skeleton width="4rem" height="0.875rem" radius="sm" />
          <Skeleton width="1.5rem" height="1.5rem" radius="sm" />
        </div>
        <ul className="nf-list-group">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="nf-list-item">
              <div className="nf-list-row nf-list-row--two">
                <span className="nf-list-row__lead">
                  <Skeleton circle width="var(--nf-plate-size-sm)" className="shrink-0" />
                </span>
                <div className="nf-list-row__text">
                  <Skeleton width="60%" height="1rem" radius="sm" />
                  <Skeleton width="85%" height="0.8125rem" radius="sm" />
                </div>
                <Skeleton width="2.5rem" height="0.75rem" radius="sm" className="shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </HostScreenSkeleton>
  );
}
