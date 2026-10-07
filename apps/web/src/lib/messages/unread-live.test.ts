import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";
import { unreadConversationCount } from "./unread-live";

describe("the dock's unread-conversations figure", () => {
  it("counts conversations, not messages", () => {
    expect(
      unreadConversationCount([
        { conversation_id: "a", unread: 5 },
        { conversation_id: "b", unread: 1 },
      ]),
    ).toBe(2);
  });

  it("skips zero, malformed and missing rows", () => {
    expect(
      unreadConversationCount([
        { conversation_id: "a", unread: 0 },
        { conversation_id: null, unread: 3 },
        { conversation_id: "c", unread: "x" },
      ]),
    ).toBe(0);
    expect(unreadConversationCount(null)).toBe(0);
  });

  /* The dock and the rail import this store on every signed-in route, so a
     static import of the browser client would put supabase-js in all of
     their first loads. It is loaded when the first reader mounts instead. */
  it("loads the browser client with import(), never statically", () => {
    const source = withoutComments(readFileSync(join(process.cwd(), "src/lib/messages/unread-live.ts"), "utf8"));
    expect(source).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']\.\.\/supabase\/client["']/m);
    expect(source).toContain('import("../supabase/client")');
  });
});
