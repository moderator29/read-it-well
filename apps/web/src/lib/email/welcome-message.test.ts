import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { siteUrl } from "./render";
import { LEGAL_LINE, MARK_PATH, MAX_WIDTH, SIGN_OFF, WORDMARK_ALT, WORDMARK_PATH } from "./theme";
import {
  WELCOME_LANDING,
  WELCOME_ROUTES,
  welcome,
  type SignupRole,
  type WelcomeData,
} from "./welcome-message";
import { welcome as welcomeFromCatalogue } from "./messages";

/**
 * The welcome email, checked as the first thing Vallo ever sends somebody.
 *
 * `shell.test.ts` and `messages.test.ts` already hold every message in the
 * catalogue (the welcome included, through fixtures.ts) to the structural and
 * copy rules. What is here is what is particular to this one: the name, the
 * six versions, the routes every link must resolve to, and the words it must
 * never use.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, "..", "..", "app");

const ROLES: (SignupRole | null)[] = ["renter", "buyer", "landlord", "seller", "agent", null];

const ALL = ROLES.map((role) => ({
  role: role ?? "general",
  message: welcome({ name: "Ada Obi", role }),
}));

/** The words as a reader meets them: tags, comments and the style block gone. */
function visible(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#\d+;|&rarr;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

/** Every page route in the app, as a URL path, route groups removed. */
function appRoutes(): Set<string> {
  const found = new Set<string>();
  const walk = (dir: string, path: string[]): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        if (entry.name === "page.tsx") found.add("/" + path.join("/"));
        continue;
      }
      const segment = entry.name;
      const isGroup = segment.startsWith("(") && segment.endsWith(")");
      walk(join(dir, segment), isGroup ? path : [...path, segment]);
    }
  };
  walk(APP, []);
  return found;
}

/** Every href in a message, as a path relative to the site. */
function hrefs(html: string): string[] {
  const base = siteUrl();
  return [...html.matchAll(/href="([^"]+)"/g)]
    .map((m) => (m[1] ?? "").replace(/&amp;/g, "&"))
    .filter((h) => !h.startsWith("urn:") && !h.startsWith("http://www.w3.org"))
    .map((h) => {
      expect(h.startsWith(base), `${h} is not on this site`).toBe(true);
      return h.slice(base.length);
    });
}

describe("the welcome email carries the person's name", () => {
  it("greets by first name, in the subject, the HTML and the text", () => {
    const m = welcome({ name: "Adaeze Chinwe Obi", role: "renter" });
    expect(m.subject).toBe("Welcome to Vallo, Adaeze");
    expect(visible(m.html)).toContain("Hello Adaeze.");
    expect(flat(m.text)).toContain("Hello Adaeze.");
  });

  it("escapes a name carrying markup characters", () => {
    const m = welcome({ name: `<b>O'Neil&"Co"`, role: "buyer" });
    expect(m.html).not.toContain("<b>O'Neil");
    expect(m.html).toContain("Hello &lt;b&gt;O&#39;Neil&amp;&quot;Co&quot;.");
    // Only whole tags survive in the markup: nothing from the name opened one.
    expect(m.html).not.toMatch(/<b>/);
  });

  it("falls back to a real greeting when there is no usable name", () => {
    for (const data of [{}, { name: "" }, { name: "   " }, { name: "ada@example.com" }] as WelcomeData[]) {
      const m = welcome(data);
      expect(m.subject).toBe("Welcome to Vallo");
      expect(visible(m.html)).toContain("Hello there.");
      expect(flat(m.text)).toContain("Hello there.");
      expect(m.html).not.toMatch(/Hello\s*[,.]\s*</);
    }
  });

  it("greets by handle when there is a handle and no name", () => {
    const m = welcome({ name: null, handle: "@ada_lagos", role: null });
    expect(m.subject).toBe("Welcome to Vallo, ada_lagos");
    expect(flat(m.text)).toContain("Hello ada_lagos.");
  });

  it("is the same function the catalogue exports, so no caller changed", () => {
    expect(welcomeFromCatalogue).toBe(welcome);
  });
});

describe("every role gets its own version", () => {
  it.each(ALL)("$role renders HTML, text, a subject and an inbox line", ({ message }) => {
    expect(message.subject.length).toBeGreaterThan(0);
    expect(message.subject.length).toBeLessThanOrEqual(90);
    expect(message.html).toContain("<!doctype html>");
    expect(message.text.trim().length).toBeGreaterThan(400);
    expect(message.text).not.toContain("<");

    const body = message.html.slice(message.html.indexOf("<body"));
    const pre = body.match(/<span style="display:none[^"]*">([^<]*)<\/span>/);
    expect(pre).not.toBeNull();
    expect((pre?.[1] ?? "").replace(/&#\d+;/g, "").trim().length).toBeGreaterThan(20);
  });

  it("gives each version different first steps", () => {
    const openings = new Set(ALL.map(({ message }) => visible(message.html)));
    expect(openings.size).toBe(ALL.length);
  });

  it("gives the undeclared reader the general version, not a lesser one", () => {
    const general = welcome({ name: "Ada" });
    expect(general.html).toBe(welcome({ name: "Ada", role: null }).html);
    expect(flat(general.text)).toMatch(/Look for a home/);
    expect(flat(general.text)).toMatch(/Find somewhere to stay/);
    expect(flat(general.text)).toMatch(/Have property to let or sell/);
  });

  it.each(ALL)("$role numbers three first steps and one lit button", ({ message }) => {
    expect(flat(message.text)).toMatch(/1\. .+ 2\. .+ 3\. /);
    // One primary action, drawn twice: once as VML for classic Outlook and
    // once as the HTML anchor everyone else gets.
    expect(message.html.split("Step inside").length - 1).toBe(2);
    expect(message.html).toContain("v:roundrect");
    expect(message.html).toContain("<!--[if !mso]><!-->");
  });

  it("the buyer's version still refuses to vouch for a title", () => {
    const text = flat(welcome({ role: "buyer" }).text);
    expect(text).toMatch(/cannot verify it/i);
    expect(text).toMatch(/land registry/i);
  });
});

describe("every link resolves to a real route", () => {
  const routes = appRoutes();

  it.each([...WELCOME_ROUTES])("%s is a page in the app", (route) => {
    expect(routes.has(route), `${route} has no page.tsx`).toBe(true);
    expect(existsSync(APP)).toBe(true);
  });

  it.each(ALL)("$role links only to allowed routes", ({ message }) => {
    const allowed = new Set<string>(WELCOME_ROUTES);
    const found = hrefs(message.html);
    expect(found.length).toBeGreaterThanOrEqual(5);
    for (const path of found) {
      const bare = path.split("?")[0] ?? path;
      expect(allowed.has(bare), `${path} is not on the allowed list`).toBe(true);
    }
  });

  it.each(ALL)("$role sends the button to the first run screen", ({ message }) => {
    const target = siteUrl() + WELCOME_LANDING;
    expect(message.html).toContain(`href="${target}"`);
    expect(message.text).toContain(`Step inside:\n${target}`);
  });

  it.each(ALL)("$role prints every link in the plain text too", ({ message }) => {
    for (const path of hrefs(message.html)) {
      expect(message.text).toContain(siteUrl() + path);
    }
  });
});

describe("the words", () => {
  const BANNED =
    /\b(insured|guarantee|guaranteed|demo|sample|preview|coming soon|welcome aboard|amazing|revolutionary)\b/i;

  it.each(ALL)("$role uses none of the banned words, in markup, comments or text", ({ message }) => {
    for (const part of [message.subject, message.html, message.text]) {
      expect(part).not.toMatch(BANNED);
    }
  });

  it.each(ALL)("$role has no exclamation mark and no em or en dash", ({ message }) => {
    for (const part of [message.subject, visible(message.html), message.text]) {
      expect(part).not.toContain("!");
    }
    for (const part of [message.subject, message.html, message.text]) {
      expect(part).not.toContain("—");
      expect(part).not.toContain("–");
    }
  });

  it.each(ALL)("$role prints no count and no statistic", ({ message }) => {
    // The step numbers are the only figures a reader sees, and the legal line
    // carries the company's registration number.
    const words = visible(message.html).replace(LEGAL_LINE, "");
    const figures = words.match(/\d+/g) ?? [];
    expect(figures.every((f) => ["1", "2", "3"].includes(f))).toBe(true);
    expect(words).not.toMatch(/%/);
  });

  it.each(ALL)("$role closes with the sign-off and the legal line in both renderings", ({ message }) => {
    for (const part of [message.html, message.text]) {
      expect(part).toContain(SIGN_OFF);
      expect(part).toContain(LEGAL_LINE);
    }
  });
});

describe("every statement has evidence in the code", () => {
  it.each(ALL)("$role makes neither claim the closing audit refused", ({ message }) => {
    for (const part of [visible(message.html), flat(message.text)]) {
      // No code checks agents harder than owners: both file the same kind of
      // application to the same admin review.
      expect(part).not.toMatch(/checked more closely/i);
      // Only the identity rung lights anything on a listing (agent_badges
      // .verified is verification_tier >= 1), so no copy may say each step does.
      expect(part).not.toMatch(/each step you complete/i);
    }
  });

  it("says what verification actually shows, where it is offered", () => {
    for (const role of ["landlord", "seller", "agent"] as const) {
      expect(flat(welcome({ role }).text)).toContain(
        "Once a person at Vallo has checked your identity, your listings carry the verified tick.",
      );
    }
  });

  it("describes the agent registration as the form asks it", () => {
    const text = flat(welcome({ role: "agent" }).text);
    expect(text).toContain("how long you have done this and what you charge");
    expect(text).toContain("A person at Vallo reads every registration before you can publish.");
  });
});

describe("it is built to survive a mail client", () => {
  it.each(ALL)("$role is a table layout, 600px and fluid, dark in every layer", ({ message }) => {
    const html = message.html;
    expect(html).toContain('<table role="presentation"');
    expect(html).not.toMatch(/display\s*:\s*(flex|grid|inline-flex|inline-grid)/);
    expect(html).toContain(`max-width:${MAX_WIDTH}px;width:100%;`);
    expect(html).toContain(`<table role="presentation" width="${MAX_WIDTH}"`);
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("@media only screen and (max-width: 480px)");
    expect((html.match(/<style\b/g) ?? []).length).toBe(1);
    expect(html).not.toMatch(/<link\b|<script\b|@import|fonts\.googleapis/i);
  });

  it.each(ALL)("$role puts no words in a picture and gives every image alt text", ({ message }) => {
    const images = message.html.match(/<img\b[^>]*>/g) ?? [];
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toMatch(/\balt="[^"]*"/);
      expect(image).toMatch(/\bwidth="\d+"/);
      expect(image).toMatch(/\bheight="\d+"/);
    }
    expect(images[0]).toContain(MARK_PATH);
    expect(images[1]).toContain(WORDMARK_PATH);
    expect(images[1]).toContain(`alt="${WORDMARK_ALT}"`);
  });

  it.each(ALL)("$role reads completely with images off", ({ message }) => {
    const blind = visible(message.html.replace(/<img\b[^>]*>/g, ""));
    expect(blind).toContain("Vallo");
    expect(blind).toContain("Step inside");
    expect(blind).toContain("Where to begin");
    expect(blind.length).toBeGreaterThan(800);
  });

  it.each(ALL)("$role draws a lit button with a solid fallback", ({ message }) => {
    const html = message.html;
    // Solid colour first, gradient over it, a brighter top edge and a bloom.
    expect(html).toMatch(/background-color:#[0-9A-F]{6};background-image:linear-gradient/);
    expect(html).toMatch(/border-top:1px solid #[0-9A-F]{6};">Step inside/);
    expect(html).toMatch(/box-shadow:0 12px 28px/);
    // 14px on a 52px button: a rounded rectangle, never a capsule.
    expect(html).toContain("border-radius:14px");
  });

  it.each(ALL)("$role stays light", ({ message }) => {
    expect(Buffer.byteLength(message.html, "utf8")).toBeLessThan(40_000);
  });
});
