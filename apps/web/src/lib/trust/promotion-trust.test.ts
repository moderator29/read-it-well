import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { readdirSync, statSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/testing/fake-supabase";
import { withoutComments } from "@/lib/copy/source-scan";

/* The session for `getAgentContext`, scripted per test (the chip's derivation, below). */
const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/actions/session", () => ({ resolveSession: async () => session.current }));

/**
 * THE BADGE IS NEVER FOR SALE, AND IT IS NEVER DRAWN UNEARNED: ONE TEST FOR
 * BOTH (D61 section 5, D3 guardrail 5, `VALLO_PROMOTION.md` statements 3 and 4).
 *
 * The sweep found false verified ticks; promotion's fifth guardrail says a
 * promoted listing carries no verification it has not earned. Both are the
 * same claim about the same renderers, so they are held here, in the trust
 * area, and the promotion work depends on it:
 *
 *   (a) A MARK ONLY FROM AN EARNED RECORD. Every renderer that draws a
 *       verification mark (`TierBadge`, `VerifiedAvatar`, the listing card's
 *       Verified pill and its proof strip) is fed unearned inputs: a role, an
 *       example, a coarse boolean in the wrong place, a value the published
 *       view never returns, an unprovable date. Nothing may draw. The earned
 *       inputs are drawn too, so a renderer that drew nothing at all would not
 *       pass this by accident.
 *   (b) PROMOTED IS BYTE-IDENTICAL TO UNPROMOTED. Each fixture listing is
 *       drawn plain and inside `PromotedSlot`, and its Verified pill, proof
 *       strip, lister line and tier marks are compared as markup, byte for
 *       byte, and then the whole card is.
 *   (c) A PROMOTED SLOT WITHOUT ITS LABEL FAILS, in every locale.
 *
 * EACH CHECK IS SHOWN TO FAIL ON A BROKEN VARIANT, rendered in the same
 * bundle: a slot that lends the listing a Verified mark, a slot that drops its
 * label, and a badge derived from a role marker (the derivation
 * `agent-badge-derivation.test.ts` forbids in source). If a detector below
 * stopped detecting, its broken variant would pass and this file would go red.
 *
 * Rendered with the ordinary React build through esbuild, as
 * `components/app/listing-card-slice.test.ts` does, with `next/link` and
 * `next/image` stubbed. Fixtures are the preview harness's own
 * (`app/(dev)/preview/f3/fixtures.ts`), with dated proof fields added to a
 * copy of one of them, as `proof-strip.test.ts` dates its own.
 */
const WEB_SRC = join(__dirname, "..", "..");

const STUBS: Record<string, string> = {
  "navigation.js": `
    export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} });
    export const usePathname = () => "/";
    export const useSearchParams = () => new URLSearchParams();`,
  "empty.js": `export {};`,
  "link.js": `
    import { createElement } from "react";
    export default function Link({ href, children, prefetch, scroll, replace, ...rest }) {
      return createElement("a", { href: typeof href === "string" ? href : String(href?.pathname ?? ""), ...rest }, children);
    }`,
  "image.js": `
    import { createElement } from "react";
    export default function Image({ src, alt, fill, priority, sizes, quality, placeholder, blurDataURL, unoptimized, loader, ...rest }) {
      return createElement("img", { src: typeof src === "string" ? src : "", alt, ...rest });
    }`,
};

const ENTRY = `
import { renderToStaticMarkup } from "react-dom/server";
import { getDictionary, LOCALES } from "@vallo/i18n";
import { ListingCard } from "@/components/app/ListingCard";
import { PromotedSlot } from "@/components/promotion/PromotedSlot";
import { TierBadge } from "@/components/trust/TierBadge";
import { VerifiedAvatar } from "@/components/messages/VerifiedAvatar";
import { toBadgeTier } from "@/lib/trust/badge-tier";
import { ClientCopyProvider } from "@/lib/i18n/client-copy";
import { clientCopyOf } from "@/lib/i18n/client-copy-of";
import { EXAMPLE_LISTING, RENTAL, SALE, SHELF } from "@/app/(dev)/preview/f3/fixtures";

const t = getDictionary("en");
const wrap = (node) => renderToStaticMarkup(<ClientCopyProvider copy={clientCopyOf(t)}>{node}</ClientCopyProvider>);

/* One copy of a harness fixture with every dated trust field a card reads. */
const DATED = {
  ...RENTAL,
  id: RENTAL.id.replace(/01$/, "09"),
  listerRole: "agent",
  listerIdentitySeenAt: "2026-08-12T10:00:00Z",
  ownershipVerifiedAt: "2026-08-01T00:00:00Z",
};

/* ---------------------------------------------------- the broken variants */
/* A slot that lends trust: it hands the card a Verified listing. */
function SlotThatLendsTrust({ slot }) {
  return (
    <section data-promoted-slot={slot.slotId}>
      <p><span data-testid="promoted-label">{t.experienceFeatures.promotion.label}</span></p>
      <ListingCard listing={{ ...slot.listing, verified: true, isDemo: false, listerIdentitySeenAt: "2026-09-01T00:00:00Z" }} locale="en" t={t} />
    </section>
  );
}
/* A slot that dropped its label. */
function SlotWithoutLabel({ slot }) {
  return <section data-promoted-slot={slot.slotId}><ListingCard listing={slot.listing} locale="en" t={t} /></section>;
}
/* A badge drawn from a role marker: an approved agent nobody checked. */
function BadgeFromRole({ isAgent }) {
  return <TierBadge tier={isAgent ? "gold" : "none"} />;
}

const slotOf = (listing, i) => ({ slotId: "slot-" + i, tier: "boost", listing });
const FIXTURES = [RENTAL, SALE, ...SHELF, EXAMPLE_LISTING, DATED];

export const html = () => JSON.stringify({
  badge: {
    unearned: [undefined, null, "", "none", "verified", "Gold", "GOLD", "silver", "true", true, 1, {}, []].map(
      (value) => wrap(<TierBadge tier={toBadgeTier(value)} />),
    ),
    earned: ["gold", "platinum"].map((value) => wrap(<TierBadge tier={toBadgeTier(value)} />)),
    avatarUnearned: [undefined, "verified", true, "silver"].map((value) =>
      wrap(<VerifiedAvatar name="Ada" tier={toBadgeTier(value)} kind="agent" />),
    ),
    avatarEarned: wrap(<VerifiedAvatar name="Ada" tier={toBadgeTier("gold")} kind="agent" />),
    brokenFromRole: wrap(<BadgeFromRole isAgent />),
  },
  card: {
    /* Unearned: a listing nobody checked, an example claiming a check, an
       example with dated proof, a role with no check, an unprovable date. */
    unearned: [
      { ...RENTAL, verified: false },
      { ...RENTAL, verified: true, isDemo: true },
      { ...DATED, verified: true, isDemo: true },
      { ...RENTAL, verified: false, listerRole: "agent" },
      { ...RENTAL, verified: false, listerIdentitySeenAt: "not a date", ownershipVerifiedAt: "" },
    ].map((listing, i) => ({
      plain: wrap(<ListingCard listing={listing} locale="en" t={t} index={i} />),
      promoted: wrap(<PromotedSlot slot={slotOf(listing, i)} locale="en" t={t} index={i} />),
    })),
    earned: wrap(<ListingCard listing={DATED} locale="en" t={t} />),
  },
  pairs: FIXTURES.map((listing, i) => ({
    id: listing.id,
    plain: wrap(<ListingCard listing={listing} locale="en" t={t} index={i} />),
    promoted: wrap(<PromotedSlot slot={slotOf(listing, i)} locale="en" t={t} index={i} />),
    lendsTrust: wrap(<SlotThatLendsTrust slot={slotOf({ ...listing, verified: false }, i)} />),
    unlabelled: wrap(<SlotWithoutLabel slot={slotOf(listing, i)} />),
    unpromotedUnverified: wrap(<ListingCard listing={{ ...listing, verified: false }} locale="en" t={t} index={i} />),
  })),
  locales: LOCALES.map((locale) => {
    const tl = getDictionary(locale);
    return {
      locale,
      label: tl.experienceFeatures.promotion.label,
      html: renderToStaticMarkup(
        <ClientCopyProvider copy={clientCopyOf(tl)}><PromotedSlot slot={slotOf(RENTAL, 0)} locale={locale} t={tl} /></ClientCopyProvider>,
      ),
    };
  }),
  emptyLabel: wrap(
    <PromotedSlot slot={slotOf(RENTAL, 0)} locale="en"
      t={{ ...t, experienceFeatures: { ...t.experienceFeatures, promotion: { ...t.experienceFeatures.promotion, label: "  " } } }} />,
  ),
});
`;

type Pair = {
  id: string;
  plain: string;
  promoted: string;
  lendsTrust: string;
  unlabelled: string;
  unpromotedUnverified: string;
};
type Rendered = {
  badge: {
    unearned: string[];
    earned: string[];
    avatarUnearned: string[];
    avatarEarned: string;
    brokenFromRole: string;
  };
  card: { unearned: { plain: string; promoted: string }[]; earned: string };
  pairs: Pair[];
  locales: { locale: string; label: string; html: string }[];
  emptyLabel: string;
};

let R: Rendered;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "nf-promo-trust-"));
  try {
    for (const [name, body] of Object.entries(STUBS))
      writeFileSync(join(dir, name), body);
    writeFileSync(join(dir, "entry.tsx"), ENTRY);
    const out = join(dir, "out.mjs");
    await build({
      entryPoints: [join(dir, "entry.tsx")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: out,
      jsx: "automatic",
      logLevel: "silent",
      alias: {
        "@": WEB_SRC,
        "next/navigation": join(dir, "navigation.js"),
        "next/link": join(dir, "link.js"),
        "next/image": join(dir, "image.js"),
        "server-only": join(dir, "empty.js"),
      },
      nodePaths: [
        join(WEB_SRC, "..", "node_modules"),
        join(WEB_SRC, "..", "..", "..", "node_modules"),
      ],
      define: { "process.env.NODE_ENV": '"production"' },
      external: ["@opentelemetry/api"],
    });
    const mod = (await import(/* @vite-ignore */ pathToFileURL(out).href)) as {
      html: () => string;
    };
    R = JSON.parse(mod.html()) as Rendered;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 90_000);

/* ------------------------------------------------------------- detectors */

/**
 * The whole element that opens at the first tag matching `marker`, nested
 * tags of the same name included. `null` when there is none.
 */
function elementAt(html: string, marker: RegExp): string | null {
  const hit = marker.exec(html);
  if (!hit) return null;
  const start = html.lastIndexOf("<", hit.index);
  const name = /^<([a-zA-Z0-9]+)/.exec(html.slice(start))?.[1];
  if (!name) return null;
  const tags = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, "g");
  tags.lastIndex = start;
  let depth = 0;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    if (m[2] === "/") {
      if (depth === 0) return html.slice(start, tags.lastIndex);
      continue;
    }
    depth += m[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, tags.lastIndex);
  }
  return null;
}

/** Every verification or trust mark a renderer can draw, by its own marker. */
const TRUST_MARKERS: Record<string, RegExp> = {
  verifiedPill: /class="[^"]*nf-badge--verified/,
  tierBadge: /data-testid="tier-badge"/,
  proofStrip: /data-testid="proof-strip(?:-compact)?"/,
  listerLine: /data-testid="lister-role"/,
};
const MARKS = ["verifiedPill", "tierBadge", "proofStrip"] as const;

function trustOf(html: string): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(TRUST_MARKERS).map(([key, marker]) => [
      key,
      elementAt(html, marker),
    ])
  );
}

function marksIn(html: string): string[] {
  return MARKS.filter((key) => TRUST_MARKERS[key]!.test(html));
}

/**
 * The card, with React's `useId` values set to one token. Those ids encode
 * where in the tree a component sits (`_R_9_`), so a card one wrapper deeper
 * gets different ones; they name a heart button's description and carry no
 * meaning. Everything else is compared byte for byte.
 */
function cardOf(html: string): string | null {
  return (
    elementAt(html, /<article\b/)?.replace(/_R_[0-9a-zA-Z]+_/g, "_R_id_") ??
    null
  );
}

const promotionLabel = (html: string) =>
  elementAt(html, /data-testid="promoted-label"/);
function isLabelled(html: string, label: string): boolean {
  const el = promotionLabel(html);
  return (
    el !== null &&
    label.trim() !== "" &&
    el.replace(/<[^>]+>/g, "").trim() === label.trim()
  );
}

/* ----------------------------------------------------------------- (a) */

describe("(a) a verification mark renders only from an earned record", () => {
  it("TierBadge draws nothing for any value the published view does not return as a tier", () => {
    expect(R.badge.unearned.length).toBeGreaterThan(10);
    for (const html of R.badge.unearned) expect(html).toBe("");
    for (const html of R.badge.earned)
      expect(marksIn(html)).toEqual(["tierBadge"]);
  });

  it("VerifiedAvatar draws no mark for an unearned tier, and draws one for an earned one", () => {
    for (const html of R.badge.avatarUnearned)
      expect(marksIn(html)).toEqual([]);
    expect(marksIn(R.badge.avatarEarned)).toEqual(["tierBadge"]);
  });

  it("the listing card draws no Verified pill and no proof line for an unearned listing, promoted or not", () => {
    for (const { plain, promoted } of R.card.unearned) {
      expect(marksIn(plain)).toEqual([]);
      expect(marksIn(promoted)).toEqual([]);
    }
    /* The earned one draws both, so the empty answers above are not a card that draws nothing. */
    expect(marksIn(R.card.earned)).toEqual(["verifiedPill", "proofStrip"]);
  });

  it("the detector fails a badge derived from a role marker", () => {
    expect(marksIn(R.badge.brokenFromRole)).toEqual(["tierBadge"]);
  });
});

/* ----------------------------------------------------------------- (b) */

describe("(b) a promoted listing's trust is byte-identical to the same listing unpromoted", () => {
  it("covers verified, unverified, example and dated listings", () => {
    const kinds = R.pairs.map(
      (pair) => marksIn(pair.plain).join("+") || "none"
    );
    expect(kinds).toContain("none");
    expect(kinds).toContain("verifiedPill");
    expect(kinds).toContain("verifiedPill+proofStrip");
  });

  it("every fixture: badge, verification state and trust signals match byte for byte", () => {
    expect(R.pairs.length).toBeGreaterThanOrEqual(5);
    for (const pair of R.pairs) {
      const plain = trustOf(pair.plain);
      const promoted = trustOf(pair.promoted);
      expect(promoted, pair.id).toEqual(plain);
      /* And the whole card: the slot adds a frame and a label, nothing inside. */
      expect(cardOf(pair.promoted), pair.id).not.toBeNull();
      expect(cardOf(pair.promoted), pair.id).toBe(cardOf(pair.plain));
    }
  });

  it("the comparison fails a slot that lends the listing trust", () => {
    for (const pair of R.pairs) {
      const unpromoted = trustOf(pair.unpromotedUnverified);
      expect(trustOf(pair.lendsTrust), pair.id).not.toEqual(unpromoted);
      expect(cardOf(pair.lendsTrust), pair.id).not.toBe(
        cardOf(pair.unpromotedUnverified)
      );
    }
  });
});

/* ----------------------------------------------------------------- (c) */

describe("(c) a promoted slot always carries its label", () => {
  it("every promoted slot drawn here is labelled", () => {
    for (const pair of R.pairs)
      expect(isLabelled(pair.promoted, "Promoted"), pair.id).toBe(true);
  });

  it("is labelled in the member's own language, in every locale", () => {
    expect(R.locales.length).toBeGreaterThanOrEqual(4);
    for (const { locale, label, html } of R.locales) {
      expect(label.trim(), locale).not.toBe("");
      expect(isLabelled(html, label), locale).toBe(true);
    }
  });

  it("draws nothing at all rather than an unlabelled promoted listing", () => {
    expect(R.emptyLabel).toBe("");
  });

  it("the label is not a trust mark: it wears the neutral tone, never the verified one", () => {
    const label = promotionLabel(R.pairs[0]!.promoted) ?? "";
    expect(label).toMatch(/nf-badge--neutral/);
    expect(marksIn(label)).toEqual([]);
  });

  it("the check fails a slot that dropped its label", () => {
    for (const pair of R.pairs)
      expect(isLabelled(pair.unlabelled, "Promoted"), pair.id).toBe(false);
  });
});

/* ------------------------------------------------- statement 2, by source */

describe("a promoted slot is drawn from a separate input", () => {
  it("takes one slot and never an organic list, a rank or a sort", () => {
    const source = withoutComments(
      readFileSync(
        join(WEB_SRC, "components/promotion/PromotedSlot.tsx"),
        "utf8"
      )
    );
    expect(source).not.toMatch(
      /ranking|rankScore|rankRecommended|\.sort\(|\.splice\(|results|organic/i
    );
    expect(source).toMatch(/listing=\{slot\.listing\}/);
  });
});

/* ------------------------------------- (a) the derivation, not just the drawing */

describe("(a) no surface derives a verified mark from the ladder (audit A9)", () => {
  /**
   * `lib/trust/badge-tier.ts` forbids `verificationTier >= 1 ? ...` anywhere
   * in `src`: the rule lives in the database and is published as the badge.
   * The agent workspace's "Verified" chip broke exactly this
   * (`verified: verification_tier >= 1` in `getAgentContext`), so the guard
   * is a scan for any comparison on a verification tier in code, comments
   * stripped, outside the one file allowed to name the tiers.
   */
  const LADDER_RULE = /\bverification_?[Tt]ier\b\s*(?:\?\?\s*0\s*\)?\s*)?(?:>=|>|===|==)\s*\d/;
  const ALLOWED = new Set([join("lib", "trust", "badge-tier.ts")]);

  function offenders(): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
          const here = path.slice(WEB_SRC.length + 1);
          if (ALLOWED.has(here)) continue;
          withoutComments(readFileSync(path, "utf8"))
            .split("\n")
            .forEach((line, index) => {
              /* Strings are prose (the claims register quotes the database's own rule). */
              const code = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
              if (LADDER_RULE.test(code)) out.push(`${here}:${index + 1}: ${line.trim().slice(0, 100)}`);
            });
        }
      }
    };
    walk(WEB_SRC);
    return out;
  }

  it("finds no tier comparison in code outside badge-tier.ts", () => {
    expect(offenders()).toEqual([]);
  });

  it("the scan catches the shape A9 found", () => {
    for (const line of [
      "verified: (data.verification_tier ?? 0) >= 1,",
      "verified: data.verification_tier >= 1,",
      "const ok = agent.verificationTier > 0;",
    ]) {
      expect(LADDER_RULE.test(line), line).toBe(true);
    }
  });

  it("the workspace chip reads the published badge: a high tier with no badge is no chip, a badge is one", async () => {
    const { getAgentContext } = await import("@/lib/agent/listings-queries");
    const ask = async (row: Record<string, unknown>) => {
      const supabase = fakeSupabase({ agents: { select: { data: row, error: null } } });
      session.current = { state: "signed-in", supabase: supabase.client, user: { id: "u1" } };
      const context = await getAgentContext();
      return context.state === "agent" ? context.agent.verified : null;
    };
    const base = { id: "a1", display_name: "Ada", status: "APPROVED", type: "INDIVIDUAL" };
    /* The ladder says 3; the published badge says nothing. No chip. */
    expect(await ask({ ...base, verification_tier: 3, agent_badges: { tier: "none" } })).toBe(false);
    expect(await ask({ ...base, verification_tier: 3, agent_badges: null })).toBe(false);
    expect(await ask({ ...base, verification_tier: 3, agent_badges: { tier: "verified" } })).toBe(false);
    /* The published badge, as an object or a one-row list. */
    expect(await ask({ ...base, verification_tier: 0, agent_badges: { tier: "gold" } })).toBe(true);
    expect(await ask({ ...base, verification_tier: 1, agent_badges: [{ tier: "gold" }] })).toBe(true);
  });
});
