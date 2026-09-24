/**
 * THE VOICE, AS RULES A MACHINE CAN CHECK (V-97).
 *
 * `docs/design/VOICE.md` is the prose. This is the part of it that can fail a
 * build: the length limits, the phrases no state may say, and the rule that a
 * state which leaves somebody stuck offers them a way onward. The State kit
 * (`components/ui/State.tsx`) and the sweep (`scripts/design/state-sweep.mjs`)
 * both read the same numbers, so the kit and its check cannot drift apart.
 *
 * Pure: no React, no I/O. Everything here is tested in `voice.test.ts`.
 */

export const STATE_KINDS = ["loading", "empty", "offline", "error", "done"] as const;
export type StateKind = (typeof STATE_KINDS)[number];

/** A title a phone can show on one or two lines at 390px, never three. */
export const TITLE_MAX = 40;
/** One sentence, and one a person reads without scrolling. */
export const BODY_MAX = 180;

/**
 * Phrases no state says, with the reason each is banned. Matched whole-word and
 * case-blind. A reason is kept beside each so a writer who trips one learns
 * why rather than finding a synonym. Schedule promises ("soon", "the moment
 * the keys land") are not repeated here: `lib/copy/banned-phrases.test.ts`
 * already fails them everywhere in the product.
 */
export const BANNED_PHRASES: ReadonlyArray<{ phrase: string; why: string }> = [
  { phrase: "checked out", why: "a hotel joke, on a screen renters and landlords share" },
  { phrase: "oops", why: "a shrug; say what happened" },
  { phrase: "whoops", why: "a shrug; say what happened" },
  { phrase: "uh oh", why: "a shrug; say what happened" },
  { phrase: "something went wrong", why: "says nothing; say what did not happen and what is safe" },
  { phrase: "click here", why: "the action names its destination" },
  { phrase: "all good", why: "asserts what the code has not checked" },
  { phrase: "don't worry", why: "asserts what the code has not checked" },
];

/** Labels that name no destination. An action says where it goes. */
export const EMPTY_LABELS: ReadonlySet<string> = new Set(["ok", "okay", "continue", "click here", "go", "done", "submit"]);

/** Kinds that leave a person with nothing to do unless the state offers it. */
export const KINDS_NEEDING_AN_ACTION: ReadonlySet<StateKind> = new Set(["empty", "offline", "error"]);

export type StateCopy = {
  kind: StateKind;
  title: string;
  body: string;
  /** The labels of the actions the state offers, primary first. */
  actions?: readonly string[];
};

export type VoiceProblem =
  | { code: "title_long"; length: number }
  | { code: "body_long"; length: number }
  | { code: "title_empty" }
  | { code: "body_empty" }
  | { code: "banned"; phrase: string; why: string }
  | { code: "label_vague"; label: string }
  | { code: "no_action" }
  | { code: "too_many_actions"; count: number };

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The banned phrases a piece of copy contains, in list order. */
export function bannedPhrasesIn(text: string): Array<{ phrase: string; why: string }> {
  const normal = text.replace(/[‘’]/g, "'");
  return BANNED_PHRASES.filter(({ phrase }) => new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i").test(normal));
}

/**
 * Everything wrong with a state's copy, or an empty list. A loading state has
 * no body or action of its own to judge: only its title (the screen-reader
 * label) is checked.
 */
export function stateCopyProblems(copy: StateCopy): VoiceProblem[] {
  const problems: VoiceProblem[] = [];
  const title = copy.title.trim();
  const body = copy.body.trim();
  const actions = (copy.actions ?? []).map((label) => label.trim()).filter(Boolean);

  if (!title) problems.push({ code: "title_empty" });
  else if (title.length > TITLE_MAX) problems.push({ code: "title_long", length: title.length });

  if (copy.kind !== "loading") {
    if (!body) problems.push({ code: "body_empty" });
    else if (body.length > BODY_MAX) problems.push({ code: "body_long", length: body.length });
  }

  for (const hit of bannedPhrasesIn(`${title} ${body} ${actions.join(" ")}`)) {
    problems.push({ code: "banned", phrase: hit.phrase, why: hit.why });
  }

  for (const label of actions) {
    if (EMPTY_LABELS.has(label.toLowerCase())) problems.push({ code: "label_vague", label });
  }
  if (actions.length > 2) problems.push({ code: "too_many_actions", count: actions.length });
  if (KINDS_NEEDING_AN_ACTION.has(copy.kind) && actions.length === 0) problems.push({ code: "no_action" });

  return problems;
}

/** The glyph plate's tone for each kind: the state's colour, from the tokens. */
export const STATE_TONE: Record<Exclude<StateKind, "loading">, "brand" | "success" | "error" | "pending"> = {
  empty: "brand",
  offline: "pending",
  error: "error",
  done: "success",
};

/**
 * The live-region role a kind announces with. An error interrupts; loading and
 * done report; an empty or offline screen is simply the page.
 */
export function stateRole(kind: StateKind): "alert" | "status" | undefined {
  if (kind === "error") return "alert";
  if (kind === "loading" || kind === "done") return "status";
  return undefined;
}
