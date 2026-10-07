"use server";

/**
 * The preview harness's opt-out: it writes nothing and answers ok, so the
 * switch can be seen working on sample data. The product route uses
 * app/(app)/leaderboard/actions.ts.
 */
export async function previewSetHidden(hidden: boolean, businessId?: string): Promise<{ ok: boolean }> {
  void hidden;
  void businessId;
  return { ok: true };
}
