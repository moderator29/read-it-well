import { describe, expect, it } from "vitest";
import { adoptBubble, arrivalClass, bubbleKey, mergeEcho, type ArrivalBubble } from "./thread-arrival";

type Bubble = ArrivalBubble & {
  timeLabel: string;
  body: string;
  imageUrl: string | null;
  state?: "sending" | "failed" | "waiting";
};

describe("a sent message arrives once across adoption", () => {
  const opened = new Set(["m1"]);
  const sent: Bubble = { id: "local-1", mine: true, timeLabel: "", body: "Hi", imageUrl: null, state: "sending" };
  const row = (over: Partial<Bubble> = {}): Bubble => ({ id: "db-9", mine: true, timeLabel: "10:02", body: "Hi", imageUrl: null, ...over });

  it("keeps its key and its arrival class when the real id replaces the temporary one", () => {
    const before = [sent];
    const after = adoptBubble(before, "local-1", "db-9", "10:02");
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe("db-9");
    /* The same element: the key did not change, so React does not remount it. */
    expect(bubbleKey(after[0]!)).toBe(bubbleKey(before[0]!));
    /* And the class it carries is the same string, so nothing restarts. */
    expect(arrivalClass(opened, after[0]!)).toBe(arrivalClass(opened, before[0]!));
    expect(arrivalClass(opened, after[0]!)).toBe(" nf-msg-in--mine");
  });

  it("counts as one arrival across a whole send: the key is one value from start to finish", () => {
    const keys = new Set<string>();
    let list: Bubble[] = [sent];
    keys.add(bubbleKey(list[0]!));
    list = adoptBubble(list, "local-1", "db-9");
    keys.add(bubbleKey(list[0]!));
    /* A second adoption of the same message (a retry result) changes nothing either. */
    list = adoptBubble(list, "db-9", "db-9");
    keys.add(bubbleKey(list[0]!));
    expect(keys.size).toBe(1);
  });

  it("does not animate the history a thread opened with, and drops the temporary bubble when the echo landed first", () => {
    expect(arrivalClass(opened, { id: "m1", mine: false })).toBe("");
    const echoed: Bubble[] = [sent, row()];
    expect(adoptBubble(echoed, "local-1", "db-9").map((m) => m.id)).toEqual(["db-9"]);
  });

  it("gives a message from the other side its own direction", () => {
    expect(arrivalClass(opened, { id: "m2", mine: false })).toBe(" nf-msg-in--theirs");
  });

  describe("the realtime echo of my own send, in both orders (mergeEcho)", () => {
    it("result first: the bubble already has the real id, the echo changes nothing and the class stays", () => {
      const adopted = adoptBubble([sent], "local-1", "db-9", "10:02");
      const classBefore = arrivalClass(opened, adopted[0]!);
      const merged = mergeEcho(adopted, row());
      expect(merged).toEqual(adopted);
      expect(merged).toHaveLength(1);
      expect(bubbleKey(merged[0]!)).toBe("local-1");
      /* `opened` is never added to for an echo, so the class is the one it had. */
      expect(arrivalClass(opened, merged[0]!)).toBe(classBefore);
      expect(classBefore).toBe(" nf-msg-in--mine");
    });

    it("echo first: the row takes the temporary bubble's place and key, then the result has nothing left to do", () => {
      const before = [{ id: "m1", mine: false, timeLabel: "", body: "Hello", imageUrl: null } as Bubble, sent];
      const merged = mergeEcho(before, row());
      expect(merged.map((m) => m.id)).toEqual(["m1", "db-9"]);
      /* One element: the key is the temporary one, and the class is the same string. */
      expect(bubbleKey(merged[1]!)).toBe(bubbleKey(sent));
      expect(arrivalClass(opened, merged[1]!)).toBe(arrivalClass(opened, sent));
      expect(merged[1]!.state).toBeUndefined();
      /* The late result adopts an id that is already there and the temp is already gone. */
      const after = adoptBubble(merged, "local-1", "db-9", "10:02");
      expect(after.map((m) => m.id)).toEqual(["m1", "db-9"]);
      expect(bubbleKey(after[1]!)).toBe("local-1");
    });

    it("pairs each echo with the oldest matching temporary bubble, one for one", () => {
      const second: Bubble = { ...sent, id: "local-2" };
      const merged = mergeEcho(mergeEcho([sent, second], row({ id: "db-1" })), row({ id: "db-2" }));
      expect(merged.map((m) => [m.id, bubbleKey(m)])).toEqual([
        ["db-1", "local-1"],
        ["db-2", "local-2"],
      ]);
    });

    it("a message of mine from another device arrives normally, as a new bubble with the class", () => {
      const merged = mergeEcho([sent], row({ id: "db-7", body: "From my phone" }));
      expect(merged.map((m) => m.id)).toEqual(["local-1", "db-7"]);
      expect(bubbleKey(merged[1]!)).toBe("db-7");
      expect(arrivalClass(opened, merged[1]!)).toBe(" nf-msg-in--mine");
    });

    it("does not pair with a failed bubble, an image bubble or someone else's message", () => {
      expect(mergeEcho([{ ...sent, state: "failed" }], row()).map((m) => m.id)).toEqual(["local-1", "db-9"]);
      expect(mergeEcho([{ ...sent, imageUrl: "blob:x" }], row()).map((m) => m.id)).toEqual(["local-1", "db-9"]);
      const theirs = mergeEcho([sent], row({ mine: false }));
      expect(theirs.map((m) => m.id)).toEqual(["local-1", "db-9"]);
      expect(arrivalClass(opened, theirs[1]!)).toBe(" nf-msg-in--theirs");
    });
  });
});
