import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PostView } from "@/components/social/feed/PostCard";
import { withAuthorTiers } from "./author-badges";

const post = (id: string, authorId: string | null, isAgent = false): PostView =>
  ({
    id,
    author: authorId
      ? { id: authorId, handle: "h", displayLabel: "H", avatarPath: null, isAgent, moderatorOf: null }
      : null,
  }) as PostView;

describe("the feed card's verified mark", () => {
  it("is exactly what person_badge published, per author", () => {
    const tiers = new Map([
      ["a", "gold"],
      ["b", "platinum"],
    ]);
    const out = withAuthorTiers([post("1", "a"), post("2", "b"), post("3", "c")], tiers);
    expect(out.map((p) => p.author?.tier)).toEqual(["gold", "platinum", "none"]);
  });

  it("never comes from being an agent, and an unknown tier draws nothing", () => {
    const out = withAuthorTiers([post("1", "a", true)], new Map([["a", "diamond"]]));
    expect(out[0]?.author?.tier).toBe("none");
  });

  it("leaves a post with no author alone", () => {
    const lone = post("1", null);
    expect(withAuthorTiers([lone], new Map())[0]).toBe(lone);
  });

  it("is drawn by TierBadge on the card, not by the old isAgent tick", () => {
    const card = readFileSync(
      resolve(__dirname, "../../components/social/feed/PostCard.tsx"),
      "utf8",
    );
    expect(card).toContain("<TierBadge tier={post.author.tier}");
    expect(card).not.toMatch(/isAgent \? \(\s*<span\s+className="nf-post__tick"/);
    expect(card).not.toContain('name="verified-badge"');
  });
});
