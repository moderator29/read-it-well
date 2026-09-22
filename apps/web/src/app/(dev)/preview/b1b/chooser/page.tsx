import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { isSide, type Side } from "@/lib/side.constants";
import { AddWorkspaceChooser } from "@/components/supply/AddWorkspaceChooser";

/**
 * ADD A WORKSPACE, `GOVERNING-02`, FOR THE SHAPE PROOF.
 *
 * `/profile/setup` sits behind the signed-in gate in `proxy.ts`, because
 * `profile` is a protected first segment, and the proof server has no session.
 * The three registration forms were already photographed this way and the
 * chooser in front of them was not, which is why the ledger carried rows for
 * `GOVERNING-03`, `04` and `05` and none for `02`.
 *
 * So this mounts the SAME component under the same `PageHeader` the route
 * puts above it, at the same shell width, and a script walks it: choose a
 * door, watch the lit state and the one primary arrive, press through to the
 * overview. It is never the proof of a write, and there is no write here to
 * prove: the chooser's only effect is a route change.
 *
 * `side` is read from the query so both sets of doors can be photographed.
 * The route itself reads it from the query and then from the cookie, and a
 * cookie is not a thing a screenshot script can honestly set for a visitor who
 * has never chosen a side.
 */
export const dynamic = "force-dynamic";

export default async function PreviewWorkspaceChooser({
  searchParams,
}: {
  searchParams: Promise<{ side?: string }>;
}) {
  const [{ side: asked }, locale]: [{ side?: string }, Locale] = await Promise.all([
    searchParams,
    getLocale(),
  ]);
  const t = getDictionary(locale);
  const side: Side = isSide(asked) ? asked : "property";

  /* `nf-shell` and the section padding are what `AppShell` puts around every
     page, restated here because the harness renders without the shell. */
  return (
    <div className="nf-shell py-section-tight">
      <AddWorkspaceChooser t={t} side={side} />
    </div>
  );
}
