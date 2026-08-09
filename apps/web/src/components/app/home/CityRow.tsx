import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * "Explore your city", and the two controls beside it.
 *
 * The city is read from the caller's own profile: their local government where
 * they have set one, otherwise their state. The chevron opens the screen that
 * changes it, so the label is never a dead label. The circle on the right is
 * search, given the weight the reference board gives it.
 *
 * When nobody has told us where they are, the line says so plainly and the
 * chevron becomes the invitation to answer, rather than the product guessing
 * Lagos at somebody in Kano.
 */
export function CityRow({
  label,
  context,
  isOwn,
  signedIn,
}: {
  label: string;
  context: string;
  isOwn: boolean;
  signedIn: boolean;
}) {
  const changeHref = signedIn ? "/settings/place" : "/sign-in";
  const shown = label || "Choose your city";

  return (
    <div className="mt-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-medium text-[var(--nf-content-secondary)]">
          Explore your city
        </p>
        <Link
          href={changeHref}
          aria-label={
            isOwn ? `Your city is ${shown}. Change it.` : `Choose the city you explore from.`
          }
          className="nf-tap mt-1 inline-flex max-w-full items-center gap-1.5 rounded-[var(--nf-radius-sm)] text-[var(--nf-content-primary)] transition-opacity hover:opacity-80"
        >
          <UiIcon
            name="location"
            size={20}
            className="shrink-0 text-[var(--nf-brand-secondary)]"
          />
          <span className="truncate text-[1.0625rem] font-bold">{shown}</span>
          <UiIcon
            name="chevron-down"
            size={16}
            className="shrink-0 text-[var(--nf-content-muted)]"
          />
        </Link>
        <p className="mt-0.5 text-[0.75rem] text-[var(--nf-content-muted)]">
          {isOwn ? context : "Set yours to see what is happening around you"}
        </p>
      </div>

      {/*
        THE SECOND SEARCH CONTROL IS GONE.

        A filled brand circle here, beside the person's own city, three rows
        above the full search field this screen already carries, and one tab
        away from Explore, whose entire purpose is searching. Three doors to one
        room on one screen, and this was the one with the loudest paint on it:
        a glowing gradient disc pulling the eye away from the name of the place
        the row exists to state.

        The row is what it says it is now: where you are, and what is happening
        around you.
      */}
    </div>
  );
}
