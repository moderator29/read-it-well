import { cache } from "react";
import { getListingRepository } from "./repository";

/**
 * ONE LOOKUP PER REQUEST (Track M performance).
 *
 * The listing page read its listing twice, once for the metadata and once for
 * the page, and the stay and restaurant routes read it a third time before
 * handing over to the listing page when there is no accommodation or
 * restaurant row. Each was a round trip before the first byte could leave.
 * React's `cache` shares one read across a request, and only a request: the
 * next visitor, or the next render of this one, reads again.
 */
export const listingById = cache((id: string) => getListingRepository().byId(id));
