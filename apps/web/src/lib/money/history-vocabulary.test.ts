import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * THE HISTORY SCREENS MAY NOT SPEAK THE CUSTODY ERA'S WORD.
 *
 * Vallo holds nobody's money (docs/MONEY_ARCHITECTURE.md), and the old name
 * for the thing that held it is the one word most likely to make a reader
 * believe it still does. These screens copied that era's LOOK and nothing
 * else, so every file they added is read here, name and contents, and the
 * word is refused anywhere in it: copy, class names, custom properties,
 * identifiers and comments alike.
 *
 * The word is assembled rather than written, so this file passes its own rule.
 */
const WORD = new RegExp(["wal", "let"].join(""), "i");

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FILES = [
  "lib/money/history-model.ts",
  "lib/money/history-model.test.ts",
  "lib/money/history.ts",
  "lib/money/history-vocabulary.test.ts",
  "lib/admin/money-export.ts",
  "lib/admin/money-export.test.ts",
  "app/css/money-history.css",
  "app/(app)/payments/page.tsx",
  "app/host/earnings/page.tsx",
  "app/admin/money/export/route.ts",
  "app/admin/_components/MoneyHistoryPanel.tsx",
  "components/app/money-history/HistoryHero.tsx",
  "components/app/money-history/HistoryList.tsx",
  "components/app/money-history/HistoryStates.tsx",
  "components/app/money-history/EarningsHistory.tsx",
  "lib/agent/photo-decode.ts",
  "lib/agent/photo-decode.test.ts",
];

describe("the payments and earnings history files", () => {
  it.each(FILES)("%s never says it", (file) => {
    expect(WORD.test(file)).toBe(false);
    const text = readFileSync(join(SRC, file), "utf8");
    const hits = text.split("\n").flatMap((line, i) => (WORD.test(line) ? [`${i + 1}: ${line.trim()}`] : []));
    expect(hits).toEqual([]);
  });
});
