import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import "@/app/css/home.css";

/**
 * The location row under the greeting (UIUX item 15): a QUIET row, no box,
 * with the pin, the place ("Lekki, Lagos") and the chevron that changes it.
 *
 * The city is read from the caller's own profile: their local government where
 * they have set one, otherwise their state. The chevron opens the screen that
 * changes it, so the label is never a dead label. When nobody has told us
 * where they are, the line says so plainly and the chip becomes the invitation
 * to answer, rather than the product guessing Lagos at somebody in Kano.
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
    <Link
      href={changeHref}
      aria-label={
        isOwn ? `Your city is ${shown}. Change it.` : `Choose the city you explore from.`
      }
      className="nf-home__loc nf-home__loc--quiet nf-tap mt-inline"
    >
      <UiIcon name="location" size={20} className="nf-home__loc-pin" />
      <span className="nf-home__loc-name">
        {shown}
        {isOwn && context ? `, ${context}` : ""}
        {!isOwn && (
          <span className="nf-home__loc-sub">Set yours to see what is happening around you</span>
        )}
      </span>
      <UiIcon name="chevron-down" size={20} className="nf-home__loc-chev" />
    </Link>
  );
}
