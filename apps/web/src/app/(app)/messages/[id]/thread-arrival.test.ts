import { describe, expect, it } from "vitest";
import { adoptBubble, arrivalClass, bubbleKey, type ArrivalBubble } from "./thread-arrival";

type Bubble = ArrivalBubble & { timeLabel: string; state?: "sending" };

describe("a sent message arrives once across adoption", () => {
  const opened = new Set(["m1"]);
  const sent: Bubble = { id: "local-1", mine: true, timeLabel: "", state: "sending" };

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
    const echoed: Bubble[] = [sent, { id: "db-9", mine: true, timeLabel: "10:02" }];
    expect(adoptBubble(echoed, "local-1", "db-9").map((m) => m.id)).toEqual(["db-9"]);
    /* The echo's id is in the seen set (ThreadView adds it), so it carries no second arrival. */
    expect(arrivalClass(new Set([...opened, "db-9"]), { id: "db-9", mine: true })).toBe("");
  });

  it("gives a message from the other side its own direction", () => {
    expect(arrivalClass(opened, { id: "m2", mine: false })).toBe(" nf-msg-in--theirs");
  });
});
