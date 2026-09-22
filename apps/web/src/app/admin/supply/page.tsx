import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { flatParams } from "../money/_desk/Desk";
import { readPage } from "../money/_desk/derive";
import type { SupplyConsole, SupplyRoleKey } from "../money/_desk/contracts";
import { SUPPLY_ROLE_KEYS } from "../money/_desk/contracts";
import { SupplyDesk, type SupplyFilter } from "./SupplyDesk";
import "../money/_desk/desk.css";

export const metadata: Metadata = {
  title: "Supply",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Rows per page on the supply table. The render draws six. */
const SUPPLY_PAGE_SIZE = 8;

/**
 * The supply desk, as panel 3 of 8E9602E2 draws it.
 *
 * NO EXISTING READ ANSWERS IT. Owners, agents, firms and hosts live across
 * `agents`, `agent_applications` and `businesses`, their listings across
 * `listings` and `accommodations`, and what has been paid to them across
 * `escrows` and `bookings`. `lib/admin/**` is the other session's, so the read
 * that joins them is asked for in `docs/SESSION_B_SCOPE.md` (request 9) with
 * the exact return shape `SupplyDesk` is built against, and this page draws
 * every panel's not-wired state until it lands.
 *
 * The layout's `requireAdmin()` refuses a non-admin before this runs, and
 * every `lib/admin` read repeats that check at its own door, so the read that
 * replaces the placeholder below brings its own guard with it.
 */
export default async function AdminSupplyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const flat = flatParams(params);
  const role = SUPPLY_ROLE_KEYS.find((r) => r === flat.role) as SupplyRoleKey | undefined;
  const filter: SupplyFilter = {
    ...(role ? { role } : {}),
    examples: flat.examples === "1",
    page: readPage(params.page),
  };

  /* Replace with `getSupplyConsole({ ...filter, pageSize: SUPPLY_PAGE_SIZE })`
     when scope request 9 lands, and unwrap its AdminRead. */
  const supply: SupplyConsole | null = null;

  return (
    <SupplyDesk supply={supply} filter={filter} params={flat} locale={locale} pageSize={SUPPLY_PAGE_SIZE} />
  );
}
