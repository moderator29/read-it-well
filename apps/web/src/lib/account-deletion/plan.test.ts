import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLOSED_TABLES, DESTROYED_TABLES, PURGED_BUCKETS, RETAINED_TABLES } from "./plan";
import { STORAGE_BUCKETS } from "./constants";

/**
 * The ledger against the migration that enforces it.
 *
 * F-17 exists because a legal document promised a deletion the product could
 * not perform. The defence against that happening again is not a better
 * promise, it is a test: every table this codebase SAYS it destroys has to be
 * deleted from in the purge function, and every table it says it keeps has to
 * be updated there rather than deleted.
 *
 * The most important assertion in this file is the last one. The purge must
 * never delete a message and must never repoint a sender, because
 * `messages.sender_id` is NOT NULL, `messages_sender_id_fkey` is ON DELETE
 * CASCADE, and the counterparty's thread has to stay readable with an
 * anonymous sender rather than becoming a hole where a conversation was.
 */

const MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260919160100_b5_the_purge_runs_in_one_transaction.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

/* The purge function's current definition (SEC-13): the destroy list is
   checked against this, the latest `create or replace` of purge_account_rows. */
const PURGE_MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260924020602_the_purge_erases_what_it_promises_and_never_money.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const REQUEST_MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260919160000_b5_an_account_can_ask_to_be_deleted.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const TRANSFER_MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260919210000_p1_a_business_is_never_left_ownerless.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const CLOSE_MIGRATION = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../supabase/migrations/20260919210100_p1_a_future_event_is_cancelled_with_notice.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

/** The executable half of any of them, with the commented probe and header stripped out. */
function executable(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

const BODY = executable(MIGRATION);
const PURGE_BODY = executable(PURGE_MIGRATION);
const TRANSFER_BODY = executable(TRANSFER_MIGRATION);
const CLOSE_BODY = executable(CLOSE_MIGRATION);

describe("the destroy list and the migration agree", () => {
  it("deletes from every table the ledger says is destroyed", () => {
    for (const entry of DESTROYED_TABLES) {
      expect(PURGE_BODY, `${entry.table} is on the destroy list`).toContain(
        `delete from public.${entry.table}`,
      );
    }
  });

  it("the current purge keeps every table the ledger says is kept, and sweeps every bucket", () => {
    for (const entry of RETAINED_TABLES) {
      expect(PURGE_BODY).not.toContain(`delete from public.${entry.table} `);
      expect(PURGE_BODY).not.toContain(`delete from public.${entry.table}\n`);
    }
    for (const bucket of STORAGE_BUCKETS.filter((b) => b !== "message-attachments")) {
      expect(PURGE_BODY, `${bucket} is swept`).toContain(`'${bucket}'`);
    }
    expect(PURGE_BODY).not.toContain("delete from public.messages");
    expect(PURGE_BODY).not.toContain("delete from auth.users");
  });

  it("keeps every table the ledger says is kept, and never deletes from one", () => {
    // profiles and social_profiles are scrubbed in place; the rest are updated
    // or simply counted. What matters is that none of them is deleted from.
    for (const entry of RETAINED_TABLES) {
      expect(BODY, `${entry.table} is on the keep list`).not.toContain(
        `delete from public.${entry.table} `,
      );
      expect(BODY).not.toContain(`delete from public.${entry.table}\n`);
    }
  });

  it("sweeps every bucket the app has", () => {
    expect([...PURGED_BUCKETS]).toEqual([...STORAGE_BUCKETS]);
    for (const bucket of STORAGE_BUCKETS) {
      expect(BODY, `${bucket} is swept`).toContain(`'${bucket}'`);
    }
  });
});

describe("the counterparty's thread survives", () => {
  it("never deletes a message", () => {
    expect(BODY).not.toContain("delete from public.messages");
  });

  it("never repoints a sender, because sender_id is NOT NULL and the stop list forbids relaxing it", () => {
    // `sender_id = v_user` appears as a READ filter, which is how the
    // attachments and the kept count are found. What may never appear is an
    // assignment or an update of the table itself.
    for (const line of BODY.split("\n").filter((row) => row.includes("sender_id"))) {
      expect(line, "sender_id is only ever read").toContain("where");
    }
    expect(BODY).not.toContain("set sender_id");
    expect(BODY).not.toMatch(/update\s+public\.messages/);
    expect(BODY).not.toMatch(/alter\s+table[\s\S]{0,60}?messages/i);
  });

  it("never deletes the auth row, because that would cascade the messages away", () => {
    expect(BODY).not.toContain("delete from auth.users");
  });

  it("counts the messages it kept, so a run can say the thread is still there", () => {
    expect(BODY).toContain("messages_kept");
  });
});

describe("the two restricting keys F-17 names are left alone", () => {
  it("alters no foreign key and drops nothing", () => {
    for (const sql of [BODY, REQUEST_MIGRATION]) {
      const executable = sql
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n");
      expect(executable).not.toMatch(/drop\s+constraint/i);
      expect(executable).not.toMatch(/drop\s+table/i);
      expect(executable).not.toMatch(/drop\s+column/i);
      expect(executable).not.toMatch(/drop\s+function/i);
      expect(executable).not.toMatch(/drop\s+index/i);
      // `drop policy if exists` before a `create policy` is the idempotent
      // shape every migration in this repository uses, and it is the ONLY
      // drop either file is allowed to carry.
      const drops = [...executable.matchAll(/drop\s+(\w+)/gi)].map((match) => match[1]?.toLowerCase());
      for (const kind of drops) expect(kind).toBe("policy");
      expect(executable).not.toMatch(/on\s+delete\s+restrict/i);
      expect(executable).not.toMatch(/alter\s+table[\s\S]{0,40}?alter\s+column/i);
    }
  });

  it("revokes only from functions it created in the same file", () => {
    const revokes = [...BODY.matchAll(/revoke all on function ([a-z_.]+)/g)].map(
      (match) => match[1],
    );
    expect(revokes.length).toBeGreaterThan(0);
    for (const fn of revokes) {
      expect(BODY).toContain(`create or replace function ${fn}`);
    }
  });
});

describe("the grace window is a real clock", () => {
  it("the request migration writes purge_after from the days it is given", () => {
    expect(REQUEST_MIGRATION).toContain("make_interval(days => greatest(p_days, 1))");
  });

  it("the purge refuses a request whose clock has not run out", () => {
    expect(BODY).toContain("if v_req.purge_after > now() then");
    expect(BODY).toContain("'not_due'");
  });

  it("only requests whose clock has run out come back as due", () => {
    expect(BODY).toContain("and purge_after <= now()");
  });

  it("a cancelled request can never be purged", () => {
    expect(BODY).toContain("if v_req.status in ('PURGED', 'CANCELLED') then");
  });

  it("cancelling clears the restore code so it cannot be replayed", () => {
    expect(REQUEST_MIGRATION).toContain("restore_code_hash = null");
  });
});

describe("a business may never be orphaned", () => {
  it("counts a business a stranger can still transact against as a blocker", () => {
    expect(TRANSFER_BODY).toContain("'owned_businesses', v_business");
    expect(TRANSFER_BODY).toContain("or v_business > 0");
  });

  it("does not reopen the negative balance fault of 11.10", () => {
    expect(TRANSFER_BODY).toContain("v_balance > 0");
    expect(TRANSFER_BODY).not.toContain("v_balance <> 0");
  });

  it("moves ownership only through a row somebody accepted", () => {
    // The offer writes a PENDING row and nothing else. The only statement in
    // the file that repoints owner_id lives in the response function.
    expect(TRANSFER_BODY).toContain("create or replace function public.respond_to_business_transfer");
    const offer = TRANSFER_BODY.slice(
      TRANSFER_BODY.indexOf("create or replace function public.offer_business_transfer"),
      TRANSFER_BODY.indexOf("create or replace function public.respond_to_business_transfer"),
    );
    expect(offer).not.toContain("set owner_id");
    expect(offer.length).toBeGreaterThan(0);
  });

  it("refuses to hand a business to somebody who is leaving too", () => {
    expect(TRANSFER_BODY).toContain("'receiver_leaving'");
    // Checked when it is offered AND again when it is accepted, because
    // fourteen days is long enough to change your mind about your own account.
    expect(TRANSFER_BODY.match(/receiver_leaving/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("takes the badge out with the person it vouched for", () => {
    expect(TRANSFER_BODY).toContain("agent_id             = null");
    expect(TRANSFER_BODY).toContain("'identity', 'pending'");
    expect(TRANSFER_BODY).toContain("consents             = '{}'::jsonb");
    expect(TRANSFER_BODY).toContain("hygiene_attested_at  = null");
    expect(TRANSFER_BODY).toContain("licence_attested_at  = null");
  });
});

describe("a future event is cancelled with notice, never orphaned", () => {
  it("resolves every table the closed list names", () => {
    for (const entry of CLOSED_TABLES) {
      expect(CLOSE_BODY, `${entry.table} is on the closed list`).toContain(
        `public.${entry.table}`,
      );
    }
  });

  it("cancels an event rather than deleting it, so the attendees keep their record", () => {
    expect(CLOSE_BODY).toContain("set status        = 'CANCELLED'");
    expect(CLOSE_BODY).not.toContain("delete from public.events");
  });

  it("leaves a past event alone, because history is not ours to rewrite", () => {
    expect(CLOSE_BODY).toContain("and starts_at > now()");
  });

  it("writes a reason, which is what the notification trigger reads out", () => {
    expect(CLOSE_BODY).toContain("cancel_reason = v_reason");
  });

  it("cancels the tables before it suspends the restaurant, or the guests are never told", () => {
    expect(CLOSE_BODY.indexOf("reservations_cancelled")).toBeLessThan(
      CLOSE_BODY.indexOf("businesses_suspended"),
    );
  });

  it("asks the same clock the purge asks, so nobody's evening is cancelled early", () => {
    expect(CLOSE_BODY).toContain("if v_req.purge_after > now() then");
    expect(CLOSE_BODY).toContain("'not_due'");
  });
});

describe("rule 21: born locked, never born public", () => {
  it("revokes execute from anon and authenticated on every function it creates", () => {
    for (const body of [TRANSFER_BODY, CLOSE_BODY]) {
      const created = [...body.matchAll(/create or replace function (public\.[a-z_]+)\(/g)].map(
        (match) => match[1],
      );
      expect(created.length).toBeGreaterThan(0);
      for (const fn of created) {
        const revokes = [...body.matchAll(/revoke all on function ([a-z_.]+)/g)].map(
          (match) => match[1],
        );
        expect(revokes, `${fn} is revoked in its own migration`).toContain(fn);
      }
      // And every revoke names a function this same file created, so nothing
      // is taken away from an object that existed before it.
      for (const fn of [...body.matchAll(/revoke all on function ([a-z_.]+)/g)].map((m) => m[1])) {
        expect(body).toContain(`create or replace function ${fn}(`);
      }
    }
  });

  it("never lets anon back in", () => {
    for (const body of [TRANSFER_BODY, CLOSE_BODY]) {
      for (const line of body.split("\n").filter((row) => row.includes("grant execute"))) {
        expect(line, "anon is never granted execute").not.toContain("anon");
      }
    }
  });
});

describe("the new migrations are additive", () => {
  it("alters no foreign key, drops nothing but a policy, and relaxes no restrict key", () => {
    for (const body of [TRANSFER_BODY, CLOSE_BODY]) {
      expect(body).not.toMatch(/drop\s+constraint/i);
      expect(body).not.toMatch(/drop\s+table/i);
      expect(body).not.toMatch(/drop\s+column/i);
      expect(body).not.toMatch(/drop\s+function/i);
      expect(body).not.toMatch(/drop\s+index/i);
      const drops = [...body.matchAll(/drop\s+(\w+)/gi)].map((match) => match[1]?.toLowerCase());
      for (const kind of drops) expect(kind).toBe("policy");
      expect(body).not.toMatch(/on\s+delete\s+restrict/i);
      expect(body).not.toMatch(/alter\s+table[\s\S]{0,40}?alter\s+column/i);
      expect(body).not.toContain("delete from auth.users");
    }
  });
});

describe("the probes are present and ask the right question", () => {
  it("each migration carries an RLS cross-user read that must fail", () => {
    for (const sql of [MIGRATION, REQUEST_MIGRATION, TRANSFER_MIGRATION, CLOSE_MIGRATION]) {
      expect(sql).toContain("THE RLS CROSS-USER READ THAT MUST FAIL");
      expect(sql).toContain("rollback;");
    }
  });

  it("the new probes end in a deliberate raise, so the transaction rolls itself back", () => {
    for (const sql of [TRANSFER_MIGRATION, CLOSE_MIGRATION]) {
      expect(sql).toContain("PROBE ALL PASS");
    }
  });

  it("the new probes are not vacuous: they prove a row exists before proving it cannot be read", () => {
    for (const sql of [TRANSFER_MIGRATION, CLOSE_MIGRATION]) {
      expect(sql).toContain("the read would be vacuous");
    }
  });
});
