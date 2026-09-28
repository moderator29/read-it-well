import "server-only";

/**
 * SCUML items 20 and 15: the compliance functions are reached by name, the
 * pattern of lib/cron/rpc.ts, until the generated types are regenerated after
 * the migrations are applied. Each call shape is fixed in one file.
 */
type RpcCaller = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: { message?: string | null; code?: string | null } | null;
  }>;
};

export type RpcAnswer = { data: unknown; error: { message: string; code: string | null } | null };

/*
 * "No function by that name": the migration that creates it has not been
 * applied. By code only, the discipline of `lib/money/rpc.ts` `isMissing`: a
 * message saying "does not exist" is as likely to be a missing relation inside
 * a function that ran. This is the one answer that means "the check is not
 * live", which a caller treats differently from "the check could not run".
 */
const UNDEPLOYED_CODES = new Set(["PGRST202", "42883"]);

export function isUndeployed(error: RpcAnswer["error"]): boolean {
  return Boolean(error?.code && UNDEPLOYED_CODES.has(error.code));
}

export async function callRpc(
  client: object,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<RpcAnswer> {
  try {
    const { data, error } = await (client as unknown as RpcCaller).rpc(fn, args);
    if (error) return { data: null, error: { message: error.message ?? "rpc error", code: error.code ?? null } };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "rpc error", code: null } };
  }
}
