#!/usr/bin/env node
/**
 * R2 DEAD CONTROL SWEEP.
 *
 * Parses every .tsx file in apps/web/src with the TypeScript compiler's JSX
 * parser (not a grep) and flags interactive controls that render but cannot do
 * anything:
 *
 *   DEAD_BUTTON        a <button>/<Button> with no onClick, no submit type, no
 *                      form action, and no enclosing <form> that could carry it
 *   NOOP_HANDLER       onClick/onSubmit/onChange whose body is empty, or only
 *                      preventDefault()s
 *   HASH_HREF          href="#" or href="" on an <a>/<Link>/<ButtonLink>
 *   MISSING_HREF       an <a>/<Link>/<ButtonLink> with no href at all
 *   ALWAYS_DISABLED    disabled or disabled={true}, a permanently dead control
 *   DEAD_INPUT         a controlled <input>/<select>/<textarea> with a value but
 *                      no onChange and no readOnly, so typing does nothing
 *
 * Usage:  node scripts/audit/dead-controls.mjs [--json] [--all] [--filter <substr>]
 *
 * By default dev-only surfaces (app/(dev)/**) are excluded; --all includes them.
 * Exit code is 1 when any finding is at severity `high`.
 */

import {
  ts,
  SRC,
  walkFiles,
  read,
  parse,
  lineOf,
  rel,
  tagNameOf,
  attrsOf,
  literalAttr,
  isTrueAttr,
  isNoopHandler,
  heading,
} from "./lib/tsx.mjs";

const argv = process.argv.slice(2);
const AS_JSON = argv.includes("--json");
const INCLUDE_DEV = argv.includes("--all");
const filterIdx = argv.indexOf("--filter");
const FILTER = filterIdx >= 0 ? argv[filterIdx + 1] : null;

/* Tags that are buttons: they must be able to do something on press. */
const BUTTON_TAGS = new Set(["button", "Button", "IconButton", "SaveControl"]);
/* Tags that are links: they must go somewhere. */
const LINK_TAGS = new Set(["a", "Link", "ButtonLink", "NavLink"]);
/* Tags that are form fields. */
const FIELD_TAGS = new Set(["input", "select", "textarea"]);

/* Handler names that make a control live. */
const ACTIVATORS = [
  "onClick",
  "onPress",
  "onPointerDown",
  "onMouseDown",
  "onSelect",
  "onToggle",
  "formAction",
  "action",
  "onKeyDown",
];

const findings = [];

function add(kind, severity, file, line, tag, detail) {
  findings.push({ kind, severity, file: rel(file), line, tag, detail });
}

/**
 * Walks up the JSX ancestry to find an enclosing <form>. A button with no
 * onClick inside a form that has an action or onSubmit is a submit button and
 * is therefore live, so we must not flag it.
 */
function enclosingFormIsLive(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isJsxElement(cur)) {
      const tag = tagNameOf(cur.openingElement);
      if (tag === "form" || tag === "Form") {
        const a = attrsOf(cur.openingElement);
        return a.has("action") || a.has("onSubmit") || a.has("__spread__");
      }
    }
    cur = cur.parent;
  }
  return false;
}

/** True when the element sits anywhere inside a <form> tag at all. */
function insideForm(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isJsxElement(cur)) {
      const tag = tagNameOf(cur.openingElement);
      if (tag === "form" || tag === "Form") return true;
    }
    cur = cur.parent;
  }
  return false;
}

function checkElement(file, sf, node) {
  const tag = tagNameOf(node);
  if (!tag) return;
  const attrs = attrsOf(node);
  const line = lineOf(sf, node);
  const spread = attrs.has("__spread__");

  /* Permanently disabled controls, whatever the tag. */
  const disabled = attrs.get("disabled") ?? attrs.get("aria-disabled");
  if (isTrueAttr(disabled) && (BUTTON_TAGS.has(tag) || LINK_TAGS.has(tag) || FIELD_TAGS.has(tag))) {
    add(
      "ALWAYS_DISABLED",
      "medium",
      file,
      line,
      tag,
      "disabled is a literal true, so this control can never be pressed",
    );
  }

  /* No-op handlers on anything. */
  for (const name of ["onClick", "onSubmit", "onChange", "onPress", "onSelect"]) {
    const attr = attrs.get(name);
    if (attr && isNoopHandler(attr)) {
      add("NOOP_HANDLER", "high", file, line, tag, `${name} does nothing when fired`);
    }
  }

  if (LINK_TAGS.has(tag)) {
    const href = attrs.get("href");
    if (!href && !spread) {
      /* <a> without href is not a link at all; ButtonLink requires href by type. */
      add("MISSING_HREF", "high", file, line, tag, "a link with no href goes nowhere");
    } else {
      const value = literalAttr(href);
      if (value !== null && (value === "#" || value === "" || value === "javascript:void(0)")) {
        add("HASH_HREF", "high", file, line, tag, `href is ${JSON.stringify(value)}`);
      }
    }
  }

  if (BUTTON_TAGS.has(tag)) {
    if (spread) return; // a spread may carry the handler; not provable here
    const hasActivator = ACTIVATORS.some((n) => attrs.has(n));
    const typeValue = literalAttr(attrs.get("type"));
    const isSubmit = typeValue === "submit" || (tag === "button" && typeValue === null && !attrs.has("type"));
    const hasFormAttr = attrs.has("form");
    if (hasActivator) return;
    /* `SaveControl` and friends take the object they act on as props. */
    if (tag === "SaveControl") return;
    if (attrs.has("href")) return; // Button rendering as a link
    if (isSubmit && (enclosingFormIsLive(node) || hasFormAttr)) return;
    if (insideForm(node) && (typeValue === "submit" || typeValue === null)) {
      add(
        "DEAD_BUTTON",
        "medium",
        file,
        line,
        tag,
        "submit button inside a form with no action and no onSubmit",
      );
      return;
    }
    if (typeValue === "submit" || hasFormAttr) return;
    add(
      "DEAD_BUTTON",
      "high",
      file,
      line,
      tag,
      "no onClick, no submit type, no form action: pressing it does nothing",
    );
  }

  if (FIELD_TAGS.has(tag)) {
    if (spread) return;
    const inputType = literalAttr(attrs.get("type"));
    /* A hidden input carries a value into a form submit; it is never typed in. */
    if (inputType === "hidden") return;
    const hasValue = attrs.has("value") || attrs.has("checked");
    const hasChange = attrs.has("onChange") || attrs.has("onInput");
    const readOnly = attrs.has("readOnly") || attrs.has("disabled");
    const uncontrolled = attrs.has("defaultValue") || attrs.has("defaultChecked");
    /* An uncontrolled radio/checkbox in a native form submit carries `value`
       as the submitted datum rather than as controlled state. */
    if ((inputType === "radio" || inputType === "checkbox") && !attrs.has("checked")) return;
    if (hasValue && !hasChange && !readOnly && !uncontrolled) {
      add(
        "DEAD_INPUT",
        "high",
        file,
        line,
        tag,
        "controlled field with a value but no onChange: the user cannot type in it",
      );
    }
  }
}

const files = walkFiles(SRC, [".tsx"]).filter((f) => {
  if (!INCLUDE_DEV && f.includes(`${"app"}/(dev)/`)) return false;
  if (f.endsWith(".test.tsx")) return false;
  if (FILTER && !f.includes(FILTER)) return false;
  return true;
});

/*
 * A FILE THIS SWEEP COULD NOT READ IS NOT A FILE WITH NOTHING WRONG IN IT.
 *
 * Until this list existed, an unreadable or unparseable file was skipped by a
 * bare `continue` and the run then printed the number of files it INTENDED to
 * parse, followed by "PASS: no dead control at high severity". A parser that
 * choked on every file in the tree would have produced exactly that sentence,
 * and the whole point of the sweep is to be the thing that says a control is
 * dead. A green light that cannot see what it is reporting on is worse than no
 * light, so these are counted, named and they fail the run.
 */
const unreadable = [];

for (const file of files) {
  let text;
  try {
    text = read(file);
  } catch (err) {
    unreadable.push({ file, reason: err instanceof Error ? err.message : String(err) });
    continue;
  }
  if (!text.includes("<")) continue;
  let sf;
  try {
    sf = parse(file, text);
  } catch (err) {
    unreadable.push({ file, reason: err instanceof Error ? err.message : String(err) });
    continue;
  }
  const go = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      checkElement(file, sf, node);
    }
    ts.forEachChild(node, go);
  };
  ts.forEachChild(sf, go);
}

const ORDER = { high: 0, medium: 1, low: 2 };
findings.sort(
  (a, b) => ORDER[a.severity] - ORDER[b.severity] || a.file.localeCompare(b.file) || a.line - b.line,
);

if (AS_JSON) {
  process.stdout.write(
    JSON.stringify({ scanned: files.length - unreadable.length, unreadable, findings }, null, 2) + "\n",
  );
} else {
  console.log(heading("R2 dead control sweep"));
  console.log(
    `Parsed ${files.length - unreadable.length} of ${files.length} .tsx files under apps/web/src${INCLUDE_DEV ? "" : " (dev previews excluded)"}.`,
  );
  for (const row of unreadable) {
    console.log(`  [UNREAD] ${row.file}: ${row.reason}`);
  }
  const byKind = new Map();
  for (const f of findings) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
  for (const f of findings) {
    console.log(`  [${f.severity.toUpperCase().padEnd(6)}] ${f.kind.padEnd(16)} ${f.file}:${f.line}  <${f.tag}>  ${f.detail}`);
  }
  console.log(heading("Summary"));
  for (const [kind, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(18)} ${n}`);
  }
  const high = findings.filter((f) => f.severity === "high").length;
  console.log(`\n  total ${findings.length}, high ${high}, unread ${unreadable.length}`);
  if (unreadable.length > 0) {
    console.log(
      `\nFAIL: ${unreadable.length} file(s) could not be read or parsed, so this run did not look at them and cannot say they are clean.\n`,
    );
  } else {
    console.log(high === 0 ? "\nPASS: no dead control at high severity.\n" : `\nFAIL: ${high} dead controls at high severity.\n`);
  }
}

process.exit(unreadable.length > 0 || findings.some((f) => f.severity === "high") ? 1 : 0);
