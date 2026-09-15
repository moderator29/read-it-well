import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE, coveredBuilders } from "./fixtures";
import * as theme from "./theme";

/**
 * The email shell, checked as email rather than as code.
 *
 * `messages.test.ts` checks what each message SAYS. This file checks what every
 * message IS: a piece of HTML that has to survive Outlook's Word engine,
 * Gmail's rewriting, a phone at 360px and an inbox with images switched off,
 * and it checks the five Supabase auth templates by the same rules, because
 * those are the first email anybody ever gets and they used to be a different
 * design from everything after them.
 *
 * Every failure here has happened to a real email system:
 *
 *   a stylesheet link that the client stripped, leaving unstyled text;
 *   a flex container that Outlook rendered as one column of nothing;
 *   copy baked into an image, invisible in the half of inboxes that block them;
 *   an alt attribute repeating text that was already on the page;
 *   a hand-edited template that the generator then silently overwrote;
 *   a palette that drifted between two files nobody diffed.
 *
 * WHAT THIS CANNOT CHECK, and it is worth being blunt about it: no test here
 * proves an email looks right in Outlook 2016, or arrives at all. There is no
 * mail client and no sending key in this environment. What is provable is the
 * markup, the palette, the copy rules and the fact that the generated files
 * match their generator, and that is what is here.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..", "..");
const GENERATOR = join(REPO, "scripts", "build-auth-emails.mjs");
const TEMPLATE_DIR = join(REPO, "supabase", "templates");

const AUTH_TEMPLATES = [
  "confirmation.html",
  "email-change.html",
  "invite.html",
  "magic-link.html",
  "recovery.html",
] as const;

const authHtml = AUTH_TEMPLATES.map((name) => ({
  name,
  html: readFileSync(join(TEMPLATE_DIR, name), "utf8"),
}));

/** Every rendered piece of HTML this product sends, from both generators. */
const EVERY_HTML: { name: string; html: string }[] = [
  ...EVERY_MESSAGE.map(({ name, message }) => ({ name: `message:${name}`, html: message.html })),
  ...authHtml.map(({ name, html }) => ({ name: `auth:${name}`, html })),
];

/** Written as escapes so this file does not contain what it forbids. */
const EM_DASH = "—";
const EN_DASH = "–";

/* ------------------------------------------------ the catalogue is covered */

describe("every message the product can send is rendered by a test", () => {
  it("has a fixture for every builder the catalogue exports", () => {
    const source = readFileSync(join(HERE, "messages.ts"), "utf8");
    const exported = (source.match(/^export function (\w+)/gm) ?? []).map((line) =>
      line.replace("export function ", ""),
    );
    const covered = coveredBuilders();
    const missing = exported.filter((name) => !covered.has(name));

    /*
     * A message with no fixture is a message no test renders, and the one that
     * ships broken is always the newest one. Adding an entry to
     * fixtures.ts is the whole fix.
     */
    expect(missing).toEqual([]);
    expect(exported.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------- email client safety */

describe("every rendered email survives a real mail client", () => {
  it.each(EVERY_HTML)("$name lays out with tables, not flex or grid", ({ html }) => {
    // Outlook on Windows renders through Word, which has no flexbox, no grid
    // and no positioning. A layout built on any of them collapses to a single
    // unstyled column there.
    expect(html).toContain('<table role="presentation"');
    expect(html).not.toMatch(/display\s*:\s*(flex|grid|inline-flex|inline-grid)/);
    expect(html).not.toMatch(/position\s*:\s*(absolute|fixed|sticky)/);
    expect(html).not.toMatch(/\bfloat\s*:/);
  });

  it.each(EVERY_HTML)("$name loads nothing from outside itself", ({ html }) => {
    // Gmail strips <link> and <script>, and a web font request that a client
    // does honour is a round trip somebody pays for on a metered connection.
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)/i);
    expect(html).toContain("-apple-system,BlinkMacSystemFont");
  });

  it.each(EVERY_HTML)("$name carries its styles inline", ({ html }) => {
    /*
     * Gmail strips <style> in some contexts, notably a forwarded message and
     * the Gmail app reading a non-Gmail account. The single <style> block this
     * shell has carries the dark override and nothing that layout or legibility
     * depends on, so the rest has to be inline. Counting is crude and it is
     * enough: it catches the refactor that moves the palette into a class.
     */
    const inline = (html.match(/style="/g) ?? []).length;
    const blocks = (html.match(/<style\b/g) ?? []).length;
    expect(inline).toBeGreaterThan(20);
    expect(blocks).toBe(1);
  });

  it.each(EVERY_HTML)("$name is at most 600px wide and fluid below that", ({ html }) => {
    expect(html).toContain(`max-width:${theme.MAX_WIDTH}px;width:100%;`);
    expect(theme.MAX_WIDTH).toBeLessThanOrEqual(600);
  });

  it.each(EVERY_HTML)("$name declares both colour schemes", ({ html }) => {
    // Without this Apple Mail and iOS apply their own inversion to a palette
    // nobody designed, which turns a hand-built dark card into a third thing.
    expect(html).toContain('name="color-scheme" content="light dark"');
    expect(html).toContain('name="supported-color-schemes" content="light dark"');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
  });

  it.each(EVERY_HTML)("$name is light in the layer every client honours", ({ html }) => {
    /*
     * The inline styles are the layer no client strips, and they must be the
     * LIGHT palette. A dark email that half renders is black text on a black
     * card, in exactly the message carrying a sign-in code. The dark values may
     * appear only inside the <style> block.
     */
    const beforeStyle = html.slice(0, html.indexOf("<style"));
    const afterStyle = html.slice(html.indexOf("</style>"));
    expect(afterStyle).toContain(theme.LIGHT.base);
    expect(afterStyle).toContain(theme.LIGHT.card);
    expect(afterStyle).not.toContain(theme.DARK.base);
    expect(afterStyle).not.toContain(theme.DARK.card);
    expect(beforeStyle).not.toContain(theme.DARK.base);
  });

  it.each(EVERY_HTML)("$name sets a deliberate inbox line", ({ html }) => {
    // Asserted by position: what matters is that a client showing "the first
    // text in the message" shows a sentence somebody wrote rather than the
    // beginning of the layout.
    const body = html.slice(html.indexOf("<body"));
    const hidden = body.match(/<span style="display:none[^"]*">([^<]*)<\/span>/);
    expect(hidden).not.toBeNull();
    expect((hidden?.[1] ?? "").replace(/&#\d+;/g, "").trim().length).toBeGreaterThan(10);
  });
});

/* --------------------------------------------------------- images blocked */

describe("every rendered email reads completely with images blocked", () => {
  it.each(EVERY_HTML)("$name has one image, sized, and it carries no words", ({ html }) => {
    const images = html.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(1);
    const [mark] = images;

    /*
     * Explicit width and height so a blocked image reserves exactly its own box
     * rather than collapsing the lockup or, worse, expanding to a client's
     * default placeholder size and shoving the wordmark off the line.
     */
    expect(mark).toMatch(/\bwidth="\d+"/);
    expect(mark).toMatch(/\bheight="\d+"/);

    /*
     * alt is EMPTY on purpose. The mark carries no words and the wordmark
     * beside it is live text, so alt="Vallo" would render the brand twice for
     * a reader with images off. A non-empty alt here is the signal that
     * somebody has put copy inside a picture, which is unreadable in the half
     * of inboxes that block images and unreadable to a screen reader always.
     */
    expect(mark).toContain('alt=""');
  });

  it.each(EVERY_HTML)("$name still shows the brand and the action as text", ({ name, html }) => {
    // Everything an <img> could have carried, removed. What is left has to be
    // the whole message.
    const blind = html.replace(/<img\b[^>]*>/g, "");
    const visible = blind
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<span style="display:none[\s\S]*?<\/span>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#\d+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    expect(visible).toContain("Vallo");
    expect(visible).toContain(theme.SIGN_OFF);
    // A real message, not a stub: the shortest of these is the sign-in link.
    expect(visible.length).toBeGreaterThan(200);

    // Every link still reachable, so a stripped button is not a dead end.
    if (name.startsWith("auth:")) {
      expect(blind).toContain("If the button does not work");
    }
  });
});

/* ------------------------------------------------------------ the palette */

describe("one palette, and the auth generator has not drifted from it", () => {
  const generator = readFileSync(GENERATOR, "utf8");

  const THEME_COLOURS = [
    ...Object.values(theme.LIGHT),
    ...Object.values(theme.DARK),
    theme.GLOW,
    theme.ELECTRIC,
    theme.SKY,
  ];

  it.each(THEME_COLOURS)("the auth generator uses the theme value %s", (hex) => {
    /*
     * The generator is a plain Node script that runs outside the Next build
     * with no TypeScript loader, so it cannot import theme.ts and the values
     * are mirrored by hand. This is the check that makes that duplication safe
     * rather than merely tolerated: change a colour in theme.ts and this fails
     * until the generator is changed too.
     */
    expect(generator).toContain(hex);
  });

  it("declares no colour the theme has not sanctioned", () => {
    // Every hex the generator declares as a palette constant, as opposed to the
    // gradient stops that are composed from them.
    const declared = (generator.match(/^const [A-Z_]+ = "(#[0-9A-F]{6})";/gm) ?? []).map(
      (line) => (line.match(/#[0-9A-F]{6}/) ?? [""])[0],
    );
    const sanctioned = new Set(THEME_COLOURS.map((hex) => hex.toUpperCase()));
    expect(declared.filter((hex) => !sanctioned.has(hex.toUpperCase()))).toEqual([]);
    expect(declared.length).toBeGreaterThan(10);
  });

  it("keeps raw hex out of the shell and in the theme", () => {
    /*
     * theme.ts is the ONE place a literal colour is correct, because a mail
     * client strips CSS custom properties and a var() that resolves to nothing
     * paints text the colour of its background. render.ts must therefore carry
     * no colour of its own, or the token resolution has two homes again.
     *
     * #FFFFFF is the exception and it is deliberate: it is the text ON brand
     * blue in both schemes, so it is not a themed value and must not flip.
     */
    const render = readFileSync(join(HERE, "render.ts"), "utf8");
    const literals = (render.match(/#[0-9A-Fa-f]{6}/g) ?? []).filter(
      (hex) => hex.toUpperCase() !== "#FFFFFF",
    );
    expect(literals).toEqual([]);
  });

  it("never names a colour outside the brand family", () => {
    // Deep navy-black, dark neon blue, electric blue glow. A warm or purple
    // accent reads as a different product.
    for (const { name, html } of EVERY_HTML) {
      expect(html, name).not.toMatch(/\b(purple|violet|magenta|indigo|fuchsia|cyan|orange)\b/i);
      expect(html, name).not.toMatch(/#(7C3AED|8B5CF6|A855F7|6D28D9|9333EA|C026D3|A78BFA)/i);
    }
  });
});

/* --------------------------------------------------------------- the copy */

describe("the copy rules hold in the markup that ships", () => {
  it.each(EVERY_HTML)("$name contains no em dash or en dash", ({ html }) => {
    expect(html).not.toContain(EM_DASH);
    expect(html).not.toContain(EN_DASH);
  });

  it.each(EVERY_HTML)("$name contains no emoji", ({ html }) => {
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html)).toBe(false);
  });

  it.each(EVERY_HTML)("$name uses the agreed word, never the banned ones", ({ html }) => {
    // "demo", "sample", "preview" and "not live" are banned by spec. "example"
    // is the agreed word. This runs against the shipped markup including its
    // comments, because a comment ships too.
    expect(html).not.toMatch(/\b(demo|sample|preview|not live|coming soon|lorem)\b/i);
  });

  it.each(EVERY_HTML)("$name makes no legal or financial promise", ({ html }) => {
    /*
     * Escrow is CBN-regulated and legal review is pending. Nothing this product
     * sends may say money is guaranteed, insured or protected, and nothing may
     * describe a listing as checked or vetted, because verification here is a
     * ladder most listers have not climbed and an email cannot be corrected
     * once it has landed.
     */
    expect(html).not.toMatch(/\b(guarantee[ds]?|insured|money[- ]back|refund guarantee)\b/i);
    expect(html).not.toMatch(/\byour money is (safe|protected|guaranteed)\b/i);
    expect(html).not.toMatch(/\b(vetted|100%|fully verified|verified listing)\b/i);
  });

  it.each(EVERY_HTML)("$name offers no sign-in method this platform does not have", ({ html }) => {
    // There is no Google or Apple sign in on this platform. The only match
    // allowed is the -apple-system font stack, which every email needs.
    expect(html).not.toMatch(/\bsign in with (google|apple)\b/i);
    expect(html).not.toMatch(/\bgoogle\b/i);
    expect(html.replace(/-apple-system/g, "")).not.toMatch(/\bapple\b/i);
  });

  it.each(EVERY_HTML)("$name advertises no inventory this platform lacks", ({ html }) => {
    /*
     * The restaurant and hotel reservation loops exist in the schema and hold
     * zero rows. An email naming them is advertising something nobody can book,
     * which is the same class of harm as naming a property that does not exist:
     * an inbox has no corrective.
     */
    expect(html).not.toMatch(/\b(restaurants?|hotels?|experiences)\b/i);
  });
});

/* ------------------------------------------- the generated files are current */

describe("the five auth templates are what the generator produces", () => {
  it("regenerates byte for byte", () => {
    /*
     * These files are committed output, and committed output rots: somebody
     * fixes a typo in the HTML, the next person runs the generator, and the fix
     * disappears with no diff to explain it. Running the generator into a
     * temporary directory and comparing is the only check that catches a hand
     * edit before it is silently overwritten.
     */
    const out = mkdtempSync(join(tmpdir(), "vallo-auth-"));
    execFileSync(process.execPath, [GENERATOR], {
      env: { ...process.env, VALLO_AUTH_EMAIL_OUT_DIR: out },
      stdio: "pipe",
    });

    for (const name of AUTH_TEMPLATES) {
      const committed = readFileSync(join(TEMPLATE_DIR, name), "utf8");
      const fresh = readFileSync(join(out, name), "utf8");
      expect(fresh, `${name} was hand edited, or the generator has moved on`).toBe(committed);
    }
  });

  it("emits exactly the five templates Supabase asks for", () => {
    const found = readdirSync(TEMPLATE_DIR)
      .filter((name) => name.endsWith(".html"))
      .sort();
    expect(found).toEqual([...AUTH_TEMPLATES].sort());
  });

  it.each(authHtml)("$name keeps every Supabase placeholder it needs", ({ name, html }) => {
    // A template that lost its placeholder renders a button linking to the
    // literal text "{{ .ConfirmationURL }}", which is a dead sign-in email.
    expect(html).toContain("{{ .ConfirmationURL }}");
    expect(html).toContain("{{ .SiteURL }}");
    expect(html).toContain("{{ .Email }}");
    if (name === "email-change.html") expect(html).toContain("{{ .NewEmail }}");
    if (name === "confirmation.html" || name === "magic-link.html" || name === "recovery.html") {
      // The code is the route through for a reader who will not press a link in
      // an email, which is a reasonable thing to be.
      expect(html).toContain("{{ .Token }}");
    }
  });

  it.each(authHtml)("$name offers one primary action", ({ html }) => {
    /*
     * One clear action per email. The fallback link is the same action in a
     * form a client cannot strip, not a second one, so it is counted separately
     * by looking for the styled button cell rather than for anchors.
     */
    const buttons = (html.match(/mso-padding-alt:16px 34px;/g) ?? []).length;
    expect(buttons).toBe(1);
  });

  it.each(authHtml)("$name says plainly that doing nothing is safe", ({ html }) => {
    /*
     * The single most useful sentence in an auth email, and the one that
     * separates it from the phishing message imitating it: a real one tells you
     * what happens if you ignore it, and never threatens you with a
     * consequence for doing so.
     */
    expect(html).toMatch(/ignore this message|there is nothing to do|do not open the link/i);
    expect(html).not.toMatch(/\b(urgent|immediately|suspended|will be deleted|act now)\b/i);
  });
});

/* -------------------------------------------------------------- the weight */

describe("emails stay light, because data here is metered and expensive", () => {
  it.each(EVERY_HTML)("$name is well under the Gmail clipping threshold", ({ html }) => {
    /*
     * Gmail clips a message past roughly 102KB and hides the rest behind "View
     * entire message", which on this product would hide the button. Nothing
     * here should come close, and the real reason for the budget is smaller
     * than Gmail: a reader on a metered Nigerian connection pays for every
     * kilobyte of a message they did not ask for.
     */
    const bytes = Buffer.byteLength(html, "utf8");
    expect(bytes).toBeLessThan(40_000);
  });
});
