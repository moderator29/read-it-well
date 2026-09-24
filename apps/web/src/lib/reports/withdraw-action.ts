"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveSession } from "../actions/session";

/**
 * TAKE A REPORT BACK. V-89.
 *
 * Only the reporter, only while it is open or being reviewed, through
 * `public.withdraw_my_report`, which checks both in the database and writes
 * the audit row. A code, not a sentence: the screen owns the words.
 */
export async function withdrawMyReport(input: unknown): Promise<{ state: "ok" | "closed" | "failed" }> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { state: "failed" };
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "failed" };
  try {
    const { data, error } = (await (session.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
    }).rpc("withdraw_my_report", { p_report: parsed.data.id })) as { data: unknown; error: unknown };
    const status = (data as { status?: string } | null)?.status;
    if (error) return { state: "failed" };
    if (status === "ok") {
      revalidatePath("/settings/help");
      return { state: "ok" };
    }
    return { state: status === "closed" ? "closed" : "failed" };
  } catch {
    return { state: "failed" };
  }
}
