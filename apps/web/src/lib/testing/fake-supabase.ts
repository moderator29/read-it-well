/**
 * A stand-in for a Supabase client in server action tests. Test-only: nothing
 * in the product imports it.
 *
 * Every `from(table)` call returns a builder that records the operation and
 * the filters it was given, and resolves to whatever the test scripted for
 * that table and operation. The point is to assert what an action DID to the
 * database (which writes it issued, with which filters, and which it never
 * issued at all), not only what it returned.
 */
export type Op = "select" | "insert" | "update" | "upsert" | "delete" | "rpc";

export type Call = {
  table: string;
  op: Op;
  values?: unknown;
  filters: [string, string, unknown][];
};

export type Answer = { data?: unknown; error?: unknown; count?: number | null } | "throw";

export type Script = Partial<Record<string, Partial<Record<Op, Answer | ((call: Call) => Answer)>>>>;

export function fakeSupabase(script: Script = {}) {
  const calls: Call[] = [];

  function answerFor(call: Call): Answer {
    const entry = script[call.table]?.[call.op];
    if (typeof entry === "function") return entry(call);
    return entry ?? { data: call.op === "select" ? null : null, error: null };
  }

  function builder(table: string) {
    const call: Call = { table, op: "select", filters: [] };
    let recorded = false;
    const record = () => {
      if (!recorded) {
        calls.push(call);
        recorded = true;
      }
    };
    const settle = () => {
      record();
      const answer = answerFor(call);
      if (answer === "throw") return Promise.reject(new Error(`${table}.${call.op} threw`));
      return Promise.resolve({ data: null, error: null, count: null, ...answer });
    };
    const chain: Record<string, unknown> = {};
    const filter = (kind: string) => (column: string, value?: unknown) => {
      call.filters.push([kind, column, value]);
      return chain;
    };
    for (const kind of ["eq", "neq", "in", "is", "gte", "lte", "gt", "lt", "like", "ilike", "contains", "match", "or", "not"]) {
      chain[kind] = filter(kind);
    }
    for (const passthrough of ["order", "limit", "range", "returns", "abortSignal"]) chain[passthrough] = () => chain;
    chain.select = (_columns?: string) => chain;
    chain.insert = (values: unknown) => {
      call.op = "insert";
      call.values = values;
      return chain;
    };
    chain.update = (values: unknown) => {
      call.op = "update";
      call.values = values;
      return chain;
    };
    chain.upsert = (values: unknown) => {
      call.op = "upsert";
      call.values = values;
      return chain;
    };
    chain.delete = () => {
      call.op = "delete";
      return chain;
    };
    chain.single = settle;
    chain.maybeSingle = settle;
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => settle().then(resolve, reject);
    return chain;
  }

  const client = {
    from: (table: string) => builder(table),
    rpc: (fn: string, args?: unknown) => {
      const call: Call = { table: fn, op: "rpc", values: args, filters: [] };
      calls.push(call);
      const answer = answerFor(call);
      if (answer === "throw") return Promise.reject(new Error(`${fn} threw`));
      return Promise.resolve({ data: null, error: null, ...answer });
    },
  };

  return {
    client,
    calls,
    /** Every call of one operation on one table. */
    of: (table: string, op: Op) => calls.filter((c) => c.table === table && c.op === op),
    /** True when any write (insert/update/upsert/delete/rpc) was issued. */
    wrote: () => calls.some((c) => c.op !== "select"),
  };
}
