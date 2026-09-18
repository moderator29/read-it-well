import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { resolveSession } from "@/lib/actions/session";
import { SystemMoment } from "./offline/SystemMoment";

/**
 * 404: the brand moment with a way to search.
 *
 * Same anatomy as the error boundary and the offline screen (the lockup over
 * the aurora plate, the glass card on its podium), with the numeral in the
 * brand gradient, a sentence that says what happened, and a search field
 * that really searches: it is a plain GET form to `/search`, whose page
 * reads `q` and answers it, so the way out of a dead link is the product's
 * own front door rather than a decorative box.
 *
 * "Back to home" means the home the reader actually has. It pointed at `/`,
 * the landing page, which for a signed-in person is not home at all. This
 * renders on the server, so it can simply ask, and a signed-in reader is
 * offered `/home` instead. The cost is one session read on a page nobody is
 * meant to reach often, and the screen still renders in full if that read
 * comes back with nothing.
 */
export default async function NotFound() {
  const session = await resolveSession();
  const home = session.state === "signed-in" ? "/home" : "/";
  return (
    <SystemMoment home={home}>
      <p className="nf-system__code" aria-hidden="true">
        404
      </p>
      <h1 className="nf-system__title">This page has checked out</h1>
      <p className="nf-system__body">
        The link may be out of date, or the page may have moved. Every place on
        Vallo is still where it should be.
      </p>

      <form action="/search" method="get" role="search">
        <label htmlFor="nf-lost-search" className="sr-only">
          Search property
        </label>
        <div className="nf-system__search">
          <span className="nf-system__search-glyph" aria-hidden="true">
            <UiIcon name="search" size={20} />
          </span>
          <input
            id="nf-lost-search"
            name="q"
            type="search"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search homes, shortlets, land"
            className="nf-field"
          />
        </div>
        <div className="nf-system__actions">
          <Button type="submit" variant="primary" size="lg" full trailingIcon="arrow-right">
            Search
          </Button>
          <ButtonLink href={home} variant="secondary" size="lg" full>
            Back to home
          </ButtonLink>
        </div>
      </form>
    </SystemMoment>
  );
}
