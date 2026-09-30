import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { REPLY_BAND_MIN_SAMPLE, parseReplyBand, replyBandText } from "./reply-band";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const copy = getDictionary("en").memberKit.replyTime;

describe("reply band (B7)", () => {
  it("words the three bands", () => {
    expect(replyBandText("hour", copy)).toBe("Usually replies within an hour");
    expect(replyBandText("hours", copy)).toBe("Usually replies within a few hours");
    expect(replyBandText("day", copy)).toBe("Usually replies within a day");
  });

  it("prints nothing for null, a slow band or anything unknown", () => {
    for (const v of [null, undefined, "", "slow", "week", 3, {}]) expect(replyBandText(v, copy)).toBeNull();
    expect(parseReplyBand("HOUR")).toBeNull();
  });

  it("keeps the SQL's minimum sample and the explanation in step", () => {
    /* Pending until the lead applies it, then renamed into the main folder. */
    const root = join(__dirname, "../../../../../supabase/migrations");
    const file = [join(root, "pending"), root]
      .filter((dir) => existsSync(dir))
      .flatMap((dir) => readdirSync(dir).map((name) => join(dir, name)))
      .find((path) => path.endsWith(".sql") && path.includes("lister_reply_band"));
    expect(file, "the B7 migration").toBeTruthy();
    const sql = readFileSync(file!, "utf8");
    expect(sql).toContain(`when n < ${REPLY_BAND_MIN_SAMPLE} then null`);
    expect(copy.explain).toContain(`at least ${REPLY_BAND_MIN_SAMPLE}`);
  });
});
