import { resolveSession } from "@/lib/actions/session";
import { listMyAreas } from "@/lib/social/areas-queries";
import { FabDock, type FabArea } from "./FabDock";

/**
 * The way to say something, from anywhere on the social layer.
 *
 * Until now the only composer in the product sat inside one area page, which
 * meant the answer to "how do I post?" was "find the right place first, then
 * scroll to the top of it". That is a feature you have to be taught. A dock
 * that is on screen wherever the conversation is does not need teaching.
 *
 * Two things, because two is what there is: write something, or ask the
 * assistant. Not a menu of six.
 *
 * This resolves the session and the places somebody is actually in, so the
 * sheet opens with a real list rather than fetching one after the tap. It is a
 * server component for that reason alone; everything a person touches lives in
 * `FabDock`.
 */
export async function AroundFab({
  currentAreaId,
}: {
  /** Preselected when the dock is opened from inside a place. */
  currentAreaId?: string;
}) {
  const session = await resolveSession();

  /* Signed out, the dock still renders and its actions lead to sign-in. A
     control that disappears for the people who most need to know what this
     product does is a control working against itself. Unconfigured is the one
     case where it does not render: there is genuinely nothing behind it. */
  if (session.state === "unconfigured") return null;

  const signedIn = session.state === "signed-in";
  const mine = signedIn ? await listMyAreas() : [];

  /* Only places that are actually open. `posts_insert_self` refuses a post into
     anything that is not ACTIVE, so offering a paused or still-proposed place
     in the picker would be offering a refusal. */
  const areas: FabArea[] = mine
    .filter((area) => area.status === "ACTIVE")
    .map((area) => ({ id: area.id, name: area.name, city: area.city }));

  return (
    <FabDock
      signedIn={signedIn}
      areas={areas}
      currentAreaId={currentAreaId && areas.some((a) => a.id === currentAreaId) ? currentAreaId : undefined}
    />
  );
}
