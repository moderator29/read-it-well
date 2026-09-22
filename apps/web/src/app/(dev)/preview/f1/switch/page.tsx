import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ChromePreview } from "../ChromePreview";
import type { Workspace } from "@/lib/supply/workspaces";

/**
 * The dock with the centre switch, and the sheet behind it, beside
 * `GOVERNING-01` screens one and two.
 *
 * WHY THIS PAGE EXISTS. The founder's ruling of 22 September is that the
 * sheet always offers the full set of choices, "even when I already hold a
 * workspace". The state that used to be wrong is therefore ONE workspace
 * held: the trigger short-circuited into a straight toggle and the sheet
 * never opened at all. A harness that signs nobody in holds nothing, so the
 * state with the defect in it could not be photographed. One fixture
 * workspace, and it can.
 *
 * THE FIXTURES ARE SHAPES, NOT FACTS. They exercise two of the five standings
 * so the shot shows a real "Verified" mark and a real "Pending review" mark
 * side by side, which is what the sheet draws when the DATABASE says APPROVED
 * and SUBMITTED. The product never reads this file: `(dev)/preview` 404s in
 * production and the shell's own list comes from `getWorkspacesView`.
 */
const WORKSPACES: Workspace[] = [
  {
    key: "supply:11111111-1111-4111-8111-111111111111",
    kind: "owner",
    name: "Seyifunmi Adeyemi",
    standing: "active",
    side: "property",
    href: "/agent/dashboard",
  },
  {
    key: "firm:22222222-2222-4222-8222-222222222222",
    kind: "firm",
    name: "Acme Properties Ltd",
    standing: "pending",
    side: "property",
    href: "/agent/dashboard",
  },
];

/**
 * `?held=one` is the state the founder's item 4 is about, so it has its own
 * URL rather than a code edit: exactly one workspace, which is what used to
 * turn the trigger into a silent toggle.
 */
export default async function SwitchPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const held = Array.isArray(params.held) ? params.held[0] : params.held;
  const workspaces = held === "one" ? WORKSPACES.slice(0, 1) : WORKSPACES;
  return (
    <ChromePreview
      t={getDictionary(await getLocale())}
      route="/home"
      workspaces={workspaces}
      currentProfile={{ kind: "personal" }}
    />
  );
}
