import { describe, expect, it } from "vitest";
import { STORAGE_BUCKETS, STORAGE_LIST_PAGE, USER_FOLDERED_BUCKETS } from "./constants";
import { purgeStorage, type StorageDoor, type StorageEntry } from "./storage";

/**
 * The storage purge, which is the half of a deletion everybody forgets.
 *
 * What is pinned: EVERY ONE of the nine buckets is attempted, including the
 * one that is foldered by conversation rather than by person, because a bucket
 * left out of the loop is a bucket nobody ever notices is full; a folder is
 * walked to its leaves and across its pages; the paths the database saw and
 * the paths the bucket lists are unioned, so an object whose row has been lost
 * still goes; a bucket that cannot be listed is reported rather than silently
 * counted as empty; and one unreachable bucket never stops the other eight.
 */

const USER = "11111111-2222-3333-4444-555555555555";

type Tree = Record<string, Record<string, StorageEntry[]>>;

function door(tree: Tree, broken: Set<string> = new Set()): StorageDoor & { removed: Record<string, string[]> } {
  const removed: Record<string, string[]> = {};
  return {
    removed,
    async list(bucket, prefix, offset) {
      if (broken.has(bucket)) return null;
      const page = tree[bucket]?.[prefix] ?? [];
      return page.slice(offset, offset + STORAGE_LIST_PAGE);
    },
    async remove(bucket, paths) {
      if (broken.has(bucket)) return null;
      removed[bucket] = [...(removed[bucket] ?? []), ...paths];
      return { failed: [] };
    },
  };
}

const file = (name: string): StorageEntry => ({ name, id: `id-${name}` });
const folder = (name: string): StorageEntry => ({ name, id: null });

describe("the storage purge", () => {
  it("attempts every bucket, including the one with no folder of theirs", async () => {
    const result = await purgeStorage(door({}), USER, {});
    expect(result.buckets.map((bucket) => bucket.bucket)).toEqual([...STORAGE_BUCKETS]);
    expect(result.buckets).toHaveLength(9);
    expect(result.clean).toBe(true);
  });

  it("walks a folder to its leaves and removes what it finds", async () => {
    const tree: Tree = {
      "host-documents": {
        [USER]: [folder("aaa")],
        [`${USER}/aaa`]: [file("cac.pdf"), file("id.jpg")],
      },
    };
    const d = door(tree);
    const result = await purgeStorage(d, USER, {});
    expect(d.removed["host-documents"]).toEqual([
      `${USER}/aaa/cac.pdf`,
      `${USER}/aaa/id.jpg`,
    ]);
    expect(result.counts["storage_host_documents"]).toBe(2);
  });

  it("pages through a folder bigger than one listing", async () => {
    const many = Array.from({ length: STORAGE_LIST_PAGE }, (_, i) => file(`p${i}.jpg`));
    const tree: Tree = {
      "listing-photos": { [USER]: [...many, file("last.jpg")] },
    };
    const d = door(tree);
    await purgeStorage(d, USER, {});
    expect(d.removed["listing-photos"]).toHaveLength(STORAGE_LIST_PAGE + 1);
    expect(d.removed["listing-photos"]).toContain(`${USER}/last.jpg`);
  });

  it("removes the paths the database saw as well as the ones the bucket lists", async () => {
    const tree: Tree = { avatars: { [USER]: [file("now.jpg")] } };
    const d = door(tree);
    await purgeStorage(d, USER, { avatars: [`${USER}/orphan.jpg`] });
    expect(d.removed["avatars"]?.sort()).toEqual([`${USER}/now.jpg`, `${USER}/orphan.jpg`].sort());
  });

  it("removes a message attachment although it is foldered by conversation", async () => {
    const d = door({});
    const result = await purgeStorage(d, USER, {
      "message-attachments": ["conv-1/one.jpg", "conv-2/two.jpg"],
    });
    expect(d.removed["message-attachments"]).toEqual(["conv-1/one.jpg", "conv-2/two.jpg"]);
    expect(result.counts["storage_message_attachments"]).toBe(2);
  });

  it("reports a bucket it could not read instead of counting it empty", async () => {
    const d = door({ avatars: { [USER]: [file("a.jpg")] } }, new Set(["agent-documents"]));
    const result = await purgeStorage(d, USER, {});
    expect(result.clean).toBe(false);
    const agent = result.buckets.find((bucket) => bucket.bucket === "agent-documents");
    expect(agent?.failed).toBe(true);
    // and the others still went
    expect(d.removed["avatars"]).toEqual([`${USER}/a.jpg`]);
  });

  it("never walks a bucket that has no folder of theirs", async () => {
    expect(USER_FOLDERED_BUCKETS).not.toContain("message-attachments");
    expect(USER_FOLDERED_BUCKETS).toHaveLength(8);
  });

  it("counts only what actually went, so a partial removal cannot read as clean", async () => {
    const stubborn: StorageDoor = {
      async list(_bucket, prefix, offset) {
        if (prefix !== USER || offset > 0) return [];
        return [file("a.jpg"), file("b.jpg")];
      },
      async remove(_bucket, paths) {
        return { failed: paths.slice(1) };
      },
    };
    const result = await purgeStorage(stubborn, USER, {});
    expect(result.clean).toBe(false);
    expect(result.counts["storage_avatars"]).toBe(1);
  });
});
