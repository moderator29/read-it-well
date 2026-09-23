import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE SECOND OF THE TWO WELCOME PATHS, TESTED FOR WHAT IT DOES RATHER THAN
 * FOR WHAT IT MENTIONS.
 *
 * The property that matters is not "it tries". It is that this path CANNOT
 * put a second welcome in anybody's inbox, because the trigger on
 * `auth.users` has almost always queued the row already by the time a server
 * action gets here. Three things make that true and all three are asserted:
 *
 *   it never posts anything itself, it asks the database to queue;
 *   it asks for the ONE key both paths compose, by passing only the user id
 *   and letting the SQL build the key;
 *   and `already` is a success, so the claim stamp is kept rather than
 *   released, which is what stops a later call queueing again.
 *
 * The fourth assertion is the one that broke this feature for weeks in the
 * first place: a claim that achieved nothing must be GIVEN BACK, or a
 * deployment with no key marks every account as welcomed and writes to none
 * of them.
 */

const getUserById = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
const updates = vi.hoisted(() => [] as { welcomed_at: string | null }[]);
const claim = vi.hoisted(() => ({ wins: true }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById } },
    rpc,
    from: () => ({
      update: (row: { welcomed_at: string | null }) => {
        updates.push(row);
        const result = {
          eq: () => result,
          is: () => result,
          select: () => result,
          maybeSingle: async () => ({ data: claim.wins ? { id: "u" } : null, error: null }),
          then: (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null }),
        };
        return result;
      },
    }),
  }),
}));

const { welcomeOnce } = await import("./welcome");

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  updates.length = 0;
  claim.wins = true;
  getUserById.mockReset();
  getUserById.mockResolvedValue({
    data: { user: { email_confirmed_at: new Date().toISOString() } },
  });
  rpc.mockReset();
  rpc.mockResolvedValue({ data: "queued", error: null });
});

describe("welcomeOnce queues, and cannot become a second email", () => {
  it("asks the database to queue it, passing an id and never a key or an address", async () => {
    const result = await welcomeOnce(USER);

    expect(result).toBe("queued");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("email_outbox_enqueue_welcome", { p_user: USER });
    /* The key is the SQL's to compose. A caller that passed one could pass a
       different one from the trigger's, and that is two emails. */
    const args = rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Object.keys(args)).toEqual(["p_user"]);
    expect(JSON.stringify(args)).not.toContain("account:welcome");
    expect(JSON.stringify(args)).not.toContain("@");
  });

  it("treats the trigger having got there first as a success and keeps the stamp", async () => {
    rpc.mockResolvedValue({ data: "already", error: null });

    const result = await welcomeOnce(USER);

    expect(result).toBe("queued");
    /* One write, the claim. NOT a release: the row is in the queue and about
       to send, and a column disagreeing with the queue is how a second one
       gets ordered later. */
    expect(updates).toEqual([{ welcomed_at: expect.any(String) }]);
  });

  it("gives the claim back when nothing reached the queue", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "no service key" } });

    const result = await welcomeOnce(USER);

    expect(result).toBe("skipped");
    /* The claim, then the release. Without the release, every account created
       before RESEND_API_KEY arrived is marked welcomed and never written to,
       which is the defect this branch exists for. */
    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({ welcomed_at: null });
  });

  it("does not queue twice when two confirmations race: the loser does nothing", async () => {
    claim.wins = false;

    const result = await welcomeOnce(USER);

    expect(result).toBe("already");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses an address that is still a claim, and an account that is not new", async () => {
    getUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } } });
    expect(await welcomeOnce(USER)).toBe("skipped");
    expect(rpc).not.toHaveBeenCalled();

    getUserById.mockResolvedValue({
      data: { user: { email_confirmed_at: "2026-01-01T00:00:00.000Z" } },
    });
    expect(await welcomeOnce(USER)).toBe("skipped");
    expect(rpc).not.toHaveBeenCalled();
    /* And neither refusal touched the stamp. */
    expect(updates).toHaveLength(0);
  });
});
