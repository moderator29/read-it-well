import { permanentRedirect } from "next/navigation";

/**
 * The directory used to live here, reached from a "Manage places" button.
 *
 * It is settings now: the control on the feed is a gear, and what it opens is
 * everything that decides what the feed shows you - your places, the country's
 * directory, the way to suggest a place. The route moved with the framing.
 *
 * A permanent redirect rather than a deletion. Somebody has this path in a
 * bookmark or an open tab, and 404ing them to save a nine-line file would be a
 * poor trade.
 */
export default function AroundManageRedirect() {
  permanentRedirect("/around/settings");
}
