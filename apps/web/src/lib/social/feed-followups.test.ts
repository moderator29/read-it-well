/**
 * B-7: the feed follow-ups.
 *
 * (a) A social report files its kind in lower case, the spelling the database's
 *     `private.notify_report()` links from, so "Report received" opens the
 *     post rather than the notifications list.
 * (b) The author can delete their own story comment, through their own RLS
 *     and a soft delete, and is told the truth when that path is not there.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../testing/fake-supabase";

const state = vi.hoisted(() => ({
  session: null as unknown,
  allowed: true,
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => state.revalidated.push(path) }));
vi.mock("./flag", () => ({ SOCIAL_OFF_MESSAGE: "off", isSocialEnabled: async () => true }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => state.session,
}));
vi.mock("../security/rate-limit", () => ({
  consume: async () => (state.allowed ? { allowed: true } : { allowed: false, retryAfterSeconds: 60 }),
  retryIn: () => "in a minute",
  subjectForUser: (id: string) => `user:${id}`,
}));

const { reportPost, reportProfile } = await import("./posts-actions");
const { deleteStoryComment, reportStoryComment } = await import("./stories-actions");
const { SOCIAL_REPORT_KIND } = await import("./report-kinds");

const ME = "11111111-1111-4111-8111-111111111111";
const THEM = "22222222-2222-4222-8222-222222222222";
const POST = "33333333-3333-4333-8333-333333333333";
const COMMENT = "44444444-4444-4444-8444-444444444444";
const STORY = "55555555-5555-4555-8555-555555555555";

let db: ReturnType<typeof fakeSupabase>;
function signedIn(script: Parameters<typeof fakeSupabase>[0] = {}) {
  db = fakeSupabase(script);
  state.session = { state: "signed-in", user: { id: ME }, supabase: db.client };
}

beforeEach(() => {
  state.allowed = true;
  state.revalidated = [];
  signedIn({ reports: { insert: { data: null } } });
});

describe("B-7a: report kinds the notify trigger can link", () => {
  it("files a post report as `post`", async () => {
    expect(await reportPost({ postId: POST, reason: "SCAM" })).toEqual({ ok: true, data: null });
    const [insert] = db.of("reports", "insert");
    expect(insert?.values).toMatchObject({ reporter_id: ME, target_type: "post", target_id: POST });
  });

  it("files a story comment and a profile in lower case too", async () => {
    await reportStoryComment({ commentId: COMMENT, reason: "SCAM" });
    await reportProfile({ userId: THEM, reason: "SCAM" });
    const kinds = db.of("reports", "insert").map((c) => (c.values as { target_type: string }).target_type);
    expect(kinds).toEqual(["story_comment", "social_profile"]);
  });

  it("uses only lower-case kinds, like every other report path", () => {
    for (const kind of Object.values(SOCIAL_REPORT_KIND)) expect(kind).toBe(kind.toLowerCase());
  });

  it("every social kind has a link in the applied notify_report, and a word in the reporter's own list", () => {
    const sql = readFileSync(
      new URL(
        "../../../../../supabase/migrations/20260929122523_b7_report_links_and_own_story_comment_removal.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const body = sql.slice(sql.indexOf("create or replace function private.notify_report()"), sql.indexOf("-- 3 (before 2"));
    expect(body).toContain("lower(coalesce(new.target_type, ''))");
    for (const kind of Object.values(SOCIAL_REPORT_KIND)) expect(body).toContain(`when '${kind}'`);

    const words = readFileSync(
      new URL("../../../../../packages/i18n/src/locales/platform.en.ts", import.meta.url),
      "utf8",
    );
    for (const kind of Object.values(SOCIAL_REPORT_KIND)) expect(words).toMatch(new RegExp(`\\b${kind}: "`));
  });

  it("the link names an id only: the post page is where RLS decides what a reporter sees", () => {
    const sql = readFileSync(
      new URL(
        "../../../../../supabase/migrations/20260929122523_b7_report_links_and_own_story_comment_removal.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(sql).toContain("when 'post'           then '/post/' || new.target_id");
    /* The acknowledgement body is fixed text: nothing of the reported content. */
    expect(sql).toContain("'Thank you. Our team reviews every report, and we will act on this one without you having to chase it.'");
  });
});

describe("B-7b: deleting your own story comment", () => {
  it("removes it through the caller's own client and the invoker function", async () => {
    signedIn({ remove_own_story_comment: { rpc: { data: STORY } } });
    expect(await deleteStoryComment({ commentId: COMMENT })).toEqual({ ok: true, data: null });
    const [call] = db.of("remove_own_story_comment", "rpc");
    expect(call?.values).toEqual({ p_comment_id: COMMENT });
    /* No hard delete, no direct update: the soft delete lives in the function. */
    expect(db.calls.filter((c) => c.op === "delete" || c.op === "update")).toHaveLength(0);
    expect(state.revalidated).toContain(`/stories/${STORY}`);
  });

  it("says it could not, when nothing matched (not yours, gone, or held)", async () => {
    signedIn({ remove_own_story_comment: { rpc: { data: null } } });
    const result = await deleteStoryComment({ commentId: COMMENT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/could not be deleted/);
  });

  it("before the migration is applied, says it is not switched on and changes nothing", async () => {
    signedIn({ remove_own_story_comment: { rpc: { data: null, error: { code: "PGRST202" } } } });
    const result = await deleteStoryComment({ commentId: COMMENT });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/not switched on yet/) });
    expect(db.calls.filter((c) => c.op !== "rpc")).toHaveLength(0);
  });

  it("a database error is a retry, not a claim it was deleted", async () => {
    signedIn({ remove_own_story_comment: { rpc: { data: null, error: { code: "XX000" } } } });
    const result = await deleteStoryComment({ commentId: COMMENT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/still there/);
  });

  it("refuses a malformed id, a signed-out caller and a paced one before the database", async () => {
    signedIn();
    expect((await deleteStoryComment({ commentId: "not-a-uuid" })).ok).toBe(false);
    state.allowed = false;
    expect((await deleteStoryComment({ commentId: COMMENT })).ok).toBe(false);
    state.allowed = true;
    state.session = { state: "signed-out" };
    expect(await deleteStoryComment({ commentId: COMMENT })).toEqual({ ok: false, error: "signed out" });
    expect(db.calls).toHaveLength(0);
  });

  it("the applied migration keeps RLS as it was: invoker function, no member delete policy", () => {
    const sql = readFileSync(
      new URL(
        "../../../../../supabase/migrations/20260929122523_b7_report_links_and_own_story_comment_removal.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const fn = sql.slice(sql.indexOf("create or replace function public.remove_own_story_comment"));
    expect(fn).toMatch(/security invoker/);
    expect(fn).not.toMatch(/security definer/i);
    expect(fn).toContain("and author_id = (select auth.uid())");
    expect(sql).not.toMatch(/create policy[^;]+story_comments[^;]+for delete/i);
    expect(sql).toMatch(/revoke all on function public\.remove_own_story_comment\(uuid\) from public, anon;/);
  });
});
