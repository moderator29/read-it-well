import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * THE HOST WORKSPACE READS ITS WORDS FROM THE DICTIONARY (C11b).
 *
 * `app/host` and `components/host` passed English straight into `title=`,
 * `body=`, `label=`, `placeholder=` and `aria-label=`: about a hundred props
 * no completeness measure could see, so a Hausa, Yoruba or Igbo host met
 * English across the whole workspace. They moved into `hostWorkspace`
 * (`packages/i18n/src/locales/host-workspace.en.ts`) on 30 September 2026.
 *
 * The rule from here: a string literal with a word in it, given to one of
 * those props, in these two trees, is refused. The files below still carried
 * some when this test was written, because other work was open in them; each
 * is a CEILING that may fall and may not rise, and a file not listed must
 * have none. Moving a literal out lowers a ceiling; delete the row at zero.
 */
const SRC = join(__dirname, "..", "..");
const SURFACES = ["app/host", "components/host"];
const SPOKEN = new Set(["title", "body", "label", "placeholder", "aria-label", "subtitle", "note", "alt", "empty", "emptyTitle"]);

const STILL_ENGLISH: Record<string, number> = {
  /* Open in other work on 30 September (C1 to C4 and the host desk). */
  "app/host/bookings/page.tsx": 7,
  "app/host/calendar/page.tsx": 7,
  "app/host/decide/page.tsx": 2,
  "app/host/earnings/page.tsx": 3,
  "app/host/earnings/statement/page.tsx": 2,
  "app/host/reservations/ReservationsBoard.tsx": 6,
  "app/host/reviews/page.tsx": 2,
  "components/host/DecideView.tsx": 11,
  "components/host/StatementView.tsx": 6,
  "components/host/calendar/CalendarSync.tsx": 4,
  "components/host/calendar/RateCalendar.tsx": 9,
  "components/host/calendar/RatePlanSheet.tsx": 3,
  "components/host/calendar/SelectionPanel.tsx": 6,
  "components/host/reviews/HostReviewCard.tsx": 3,
  "components/host/reviews/HostReviewsView.tsx": 6,
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

export function spokenLiterals(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      SPOKEN.has(node.name.getText(source)) &&
      /[A-Za-z]{2}/.test(node.initializer.text)
    ) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      hits.push(`${file}:${line}: ${node.name.getText(source)}="${node.initializer.text.slice(0, 60)}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe("the host workspace's words come from the dictionary", () => {
  it("recognises a spoken literal and leaves an expression alone", () => {
    const sample = 'const a = <X title="Your tables" body={t.x} label={hw.y} aria-label="Menu" className="nf-x" />;';
    expect(spokenLiterals("s.tsx", sample)).toHaveLength(2);
  });

  it("no file carries more English props than it did, and a new file carries none", () => {
    const over: string[] = [];
    for (const surface of SURFACES) {
      for (const path of walk(join(SRC, surface))) {
        const file = relative(SRC, path).split("\\").join("/");
        const hits = spokenLiterals(file, readFileSync(path, "utf8"));
        const ceiling = STILL_ENGLISH[file] ?? 0;
        if (hits.length > ceiling) over.push(...hits);
      }
    }
    expect(over, "Put the words in hostWorkspace (host-workspace.en.ts) and read them from the dictionary.").toEqual([]);
  });
});
