/**
 * The part of a source file a reader could ever see.
 *
 * ---------------------------------------------------------------------------
 * A SWEEP FOR BANNED COPY CANNOT READ COMMENTS, AND THIS ONE HAS TO.
 *
 * Half the comments in this repository quote the sentence they replaced, on
 * purpose, so the next person knows what was wrong with it. `Unreachable.tsx`
 * opens by printing "switches on shortly" four times. A sweep that matched raw
 * source would fail on the file that fixed the fault, which is the fastest way
 * to get a guard switched off.
 *
 * So the comments come out first, and what is left is code, string literals
 * and JSX text, which is everything a person can actually read.
 *
 * WHY A SCANNER AND NOT A REGEX. `source.replace(/\/\*[\s\S]*?\*\//g, "")` is
 * the obvious version and it is wrong in both directions here. It deletes the
 * middle of `"https://vallospaces.com/*"` inside a string, and it cannot see that the
 * `//` in `/\bhttps?:\/\//i` is inside a regular expression rather than the
 * start of a line comment. Both shapes are live in `payment-copy.ts` and in
 * the CSP route. A five-state walk is longer and it is right.
 *
 * Comments are replaced with spaces rather than removed, so a line number in a
 * failure message still points at the line the phrase is on.
 */

/**
 * Characters after which a `/` opens a regular expression rather than dividing.
 *
 * `<` and `>` are deliberately absent. `</div>` is a closing JSX tag on almost
 * every page in this product, and treating that slash as the start of a regex
 * swallowed the text of the next element, which is precisely the live copy the
 * sweep exists to read.
 */
const REGEX_PREFIX = new Set("(,=:[!&|?{};+-*%~^".split(""));

const REGEX_KEYWORDS = new Set([
  "return",
  "typeof",
  "case",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "do",
  "else",
  "yield",
  "await",
]);

function opensRegex(before: string): boolean {
  const trimmed = before.replace(/\s+$/, "");
  if (trimmed.length === 0) return true;
  const last = trimmed[trimmed.length - 1] ?? "";
  if (REGEX_PREFIX.has(last)) return true;
  const word = /([A-Za-z_$][\w$]*)$/.exec(trimmed);
  return word ? REGEX_KEYWORDS.has(word[1] ?? "") : false;
}

/** What a run of characters turned out to be. */
type Piece = { kind: "code" | "comment" | "string" | "regex"; text: string; line: number };

/**
 * One walk, four kinds of run. Everything above is derived from this, so the
 * rules about what a comment is live in exactly one place.
 */
function scan(source: string): Piece[] {
  const pieces: Piece[] = [];
  const n = source.length;
  let i = 0;
  let line = 1;
  let code = "";
  let codeLine = 1;

  const flushCode = () => {
    if (code.length > 0) pieces.push({ kind: "code", text: code, line: codeLine });
    code = "";
  };
  const take = (from: number, to: number) => source.slice(from, to);
  const advance = (text: string) => {
    line += text.split("\n").length - 1;
  };

  while (i < n) {
    const ch = source[i] as string;
    const next = i + 1 < n ? (source[i + 1] as string) : "";

    if (ch === "/" && next === "/") {
      flushCode();
      const start = i;
      while (i < n && source[i] !== "\n") i++;
      pieces.push({ kind: "comment", text: take(start, i), line });
      continue;
    }

    if (ch === "/" && next === "*") {
      flushCode();
      const start = i;
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i = Math.min(i + 2, n);
      const text = take(start, i);
      pieces.push({ kind: "comment", text, line });
      advance(text);
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      flushCode();
      const start = i;
      const startLine = line;
      i++;
      while (i < n) {
        const c = source[i] as string;
        i++;
        if (c === "\\" && i < n) {
          i++;
          continue;
        }
        if (c === ch) break;
        /* A quote left open at the end of a line is a mistake, not a string
           that runs on. Backticks genuinely do run on, so they are exempt. */
        if (c === "\n" && ch !== "`") break;
      }
      const text = take(start, i);
      pieces.push({ kind: "string", text, line: startLine });
      advance(text);
      continue;
    }

    if (ch === "/" && opensRegex(source.slice(Math.max(0, i - 80), i))) {
      flushCode();
      const start = i;
      i++;
      let inClass = false;
      while (i < n) {
        const c = source[i] as string;
        i++;
        if (c === "\\" && i < n) {
          i++;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "\n") break;
        else if (c === "/" && !inClass) break;
      }
      pieces.push({ kind: "regex", text: take(start, i), line });
      continue;
    }

    if (code.length === 0) codeLine = line;
    code += ch;
    if (ch === "\n") line++;
    i++;
  }

  flushCode();
  return pieces;
}

/**
 * `source` with every comment blanked out and everything else left exactly
 * where it was. This is what a reader can see: code, strings and JSX text.
 */
export function withoutComments(source: string): string {
  return scan(source)
    .map((piece) =>
      piece.kind === "comment" ? piece.text.replace(/[^\n]/g, " ") : piece.text,
    )
    .join("");
}

/**
 * Only the contents of string and template literals, with the line each one
 * starts on.
 *
 * WHY THIS EXISTS BESIDE `withoutComments`. A word can be banned as copy and
 * still be the right name for a variable. `trips` is a column on the profile
 * counts and has to stay one; "the trip" in a sentence a support agent reads
 * out is the banned synonym. Matching the whole of the live source cannot tell
 * those apart and would force an exemption list that grows until the guard is
 * decoration.
 *
 * ITS LIMIT, SAID OUT LOUD: JSX text is not a string literal, so a terminology
 * sweep built on this reads copy held in constants and props and not copy typed
 * between two tags. The schedule sweep reads everything and does not have that
 * hole; this one trades the hole for not crying wolf about identifiers.
 */
export function stringLiterals(source: string): { line: number; text: string }[] {
  return scan(source)
    .filter((piece) => piece.kind === "string")
    .map((piece) => ({ line: piece.line, text: piece.text.slice(1, -1) }));
}
