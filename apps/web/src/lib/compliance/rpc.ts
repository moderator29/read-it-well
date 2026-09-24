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
