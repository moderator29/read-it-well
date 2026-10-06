import "server-only";

import type { AdminClient } from "@/lib/supabase/service";
import { sweepPaylukCommission, type SweepRow, type SweepVerdict } from "./commission-sweep";

/**
 * The sweep with its real dependencies: the process environment, global
 * fetch, and the service-role client writing `public.payluk_commission_sweeps`
 * (migration b3_payluk_commission_sweep, pending). Shaped as a cron job
 * (`JobVerdict`), for `runCronJob("payluk-commission-sweep", ...)`.
 */
export async function paylukCommissionSweep(admin: AdminClient): Promise<SweepVerdict> {
  const table = () => (admin as unknown as { from: (t: string) => ReturnType<AdminClient["from"]> }).from("payluk_commission_sweeps");
  return sweepPaylukCommission({
    env: process.env,
    fetchImpl: (url, init) => fetch(url, init),
    lastRunAt: async () => {
      const { data, error } = await table().select("started_at").order("started_at", { ascending: false }).limit(1);
      const first = (data as { started_at?: string }[] | null)?.[0];
      /* A read error throws, so the sweep fails closed (skips as paced). */
      if (error) throw new Error("payluk_commission_sweeps unreadable");
      return first?.started_at ? new Date(first.started_at) : null;
    },
    record: async (row: SweepRow) => {
      const { error } = await table().insert(row as never);
      return !error;
    },
  });
}
