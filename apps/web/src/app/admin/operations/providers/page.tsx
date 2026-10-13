import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { runProviderChecks } from "@/lib/admin/provider-checks";
import { ProviderCheckList } from "./ProviderCheckList";

export const metadata: Metadata = { title: "Provider checks", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Read-only checks of every outside provider, run on the live server
 * (`lib/admin/provider-checks.ts`). Admins only, and every visit re-runs them.
 */
export default async function ProviderChecksPage() {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") notFound();
  const checks = await runProviderChecks();

  return <ProviderCheckList checks={checks} />;
}
