/*
 * THE SWEEP REGISTER, BECAUSE A SWEEP NOBODY CAN COUNT IS NOT A SWEEP.
 *
 * The founder's fourth point: "this is a wide platform sweep, not the landing",
 * followed by his fifth: a fresh screenshot per surface beside its reference,
 * and nothing from the broken harness counts. Between them those two ask a
 * question that no worker can answer on their own, because each of them sees
 * only their own slice: HOW MUCH OF THE PLATFORM IS ACTUALLY PROVEN?
 *
 * So this counts it, from the tree rather than from anybody's report.
 *
 * WHY IT IS GENERATED AND NOT WRITTEN BY HAND. A hand-kept register drifts the
 * moment somebody adds a route, and worse, it can claim coverage that does not
 * exist, which is the one failure mode that makes a register harmful rather
 * than merely stale. This one reads the route tree for what exists and the
 * proofs directory for what has been shown, so it cannot say a surface is
 * proven unless a file is there.
 *
 * THE CUTOFF, WHICH IS THE POINT OF THE WHOLE THING. Every visual proof taken
 * before commit c32cd9c on 19 September is VOID by the founder's order, because
 * until then the screenshot harness was lying in four separate ways: headless
 * Chromium silently dropped `backdrop-filter` without the SwiftShader flags, a
 * CSP `strict-dynamic` refused Turbopack's own dev chunks so hydration never
 * completed, `window.scrollTo(0, y)` was a silent no-op because a smooth scroll
 * is an animation that never advances without a compositor, and `next dev` does
 * not hydrate reliably on this box at all. A PNG older than that cutoff is
 * counted as VOID here, not as coverage. It is better for this document to say
 * a surface is unproven than for somebody to close it on a picture of a page
 * that never finished rendering.
 *
 * Usage:  node scripts/design/sweep-register.mjs > docs/design/SWEEP.md
 */
import { execSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(new URL("../..", import.meta.url).pathname);
const APP = resolve(REPO, "apps/web/src/app");
const PROOFS = resolve(REPO, "docs/design/proofs");

/* The commit that made the harness honest. Everything shot before it is void. */
const CUTOFF_COMMIT = "c32cd9c";
const cutoff = new Date(
  execSync(`git -C ${REPO} log -1 --format=%cI ${CUTOFF_COMMIT}`, { encoding: "utf8" }).trim(),
);

/*
 * OWNERSHIP BY ROUTE PREFIX, longest prefix wins. This is the division the
 * five sweep workers were given, written down so the register and the briefs
 * cannot drift apart. "site" is the marketing and legal frontage, which no
 * sweep worker owns and which is therefore the lead's.
 */
const OWNERS = [
  ["/admin", "V5 agent, host and admin"],
  ["/agent", "V5 agent, host and admin"],
  ["/host", "V5 agent, host and admin"],
  ["/wallet", "V2 money"],
  ["/checkout", "V2 money"],
  ["/bookings", "V2 money"],
  ["/trips", "V2 money"],
  ["/inspections", "V2 money"],
  ["/rent/pay", "V2 money"],
  ["/rent/move-in", "V2 money"],
  ["/crypto", "V2 money"],
  ["/messages", "V3 messages and assistant"],
  ["/assistant", "V3 messages and assistant"],
  ["/notifications", "V3 messages and assistant"],
  ["/u", "V4 social and identity"],
  ["/post", "V4 social and identity"],
  ["/stories", "V4 social and identity"],
  ["/around", "V4 social and identity"],
  ["/profile", "V4 social and identity"],
  ["/settings", "V4 social and identity"],
  ["/verification", "V4 social and identity"],
  ["/welcome", "V4 social and identity"],
  ["/start", "V4 social and identity"],
  ["/sign-in", "V4 social and identity"],
  ["/sign-up", "V4 social and identity"],
  ["/forgot-password", "V4 social and identity"],
  ["/reset-password", "V4 social and identity"],
  ["/auth", "V4 social and identity"],
  ["/search", "V1 discovery and listing"],
  ["/listing", "V1 discovery and listing"],
  ["/stays", "V1 discovery and listing"],
  ["/stay", "V1 discovery and listing"],
  ["/restaurants", "V1 discovery and listing"],
  ["/restaurant", "V1 discovery and listing"],
  ["/rent", "V1 discovery and listing"],
  ["/saved", "V1 discovery and listing"],
  ["/home", "V1 discovery and listing"],
  ["/", "site, the lead"],
];

/*
 * WHICH GOVERNING IMAGE RULES WHICH SURFACE. Only the five the founder named
 * are listed, plus the three he added on 19 September. Everything else is
 * honestly marked as having none, because "areas with no reference inherit the
 * register" is a real rule in DESIGN_DIRECTION section 1 rule 5, and pretending
 * a surface has a reference it does not have is how invented chrome gets in.
 */
const GOVERNED = {
  "/": "GOVERNING-landing-desktop-hero.png, GOVERNING-landing-desktop-fullpage.png",
  "/home": "founder/GOVERNING-home-markets-target.png",
  "/search": "founder/GOVERNING-search-filters-target.png",
  "/messages/[id]": "GOVERNING-chat-booking-card.png, founder/GOVERNING-thread-hotel-booking.jpg, founder/GOVERNING-thread-rental-enquiry.jpg",
  "/u/[handle]": "GOVERNING-feed-plus-bloom.png",
  "/stories/[id]": "GOVERNING-flip-mid-turn.png",
};

function routes() {
  const out = [];
  const walk = (dir, url) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "(dev)" || entry.name.startsWith("_")) continue;
      /* A parenthesised segment is a route group and draws no URL segment. */
      const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
      const next = resolve(dir, entry.name);
      if (existsSync(resolve(next, "page.tsx"))) out.push(`${url}${segment}` || "/");
      walk(next, `${url}${segment}`);
    }
  };
  if (existsSync(resolve(APP, "page.tsx"))) out.push("/");
  walk(APP, "");
  return [...new Set(out)].sort();
}

function ownerOf(route) {
  let best = null;
  for (const [prefix, owner] of OWNERS) {
    if (route === prefix || route.startsWith(prefix === "/" ? "/" : `${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = [prefix, owner];
    }
  }
  return best ? best[1] : "unassigned";
}

/* Every proof on disk, with whether it was taken on the honest harness. */
const proofs = [];
if (existsSync(PROOFS)) {
  for (const group of readdirSync(PROOFS, { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    for (const file of readdirSync(resolve(PROOFS, group.name))) {
      if (!/\.(png|jpe?g)$/i.test(file)) continue;
      const full = resolve(PROOFS, group.name, file);
      proofs.push({
        group: group.name,
        file,
        fresh: statSync(full).mtime > cutoff,
        /* The slug a proof file is named for, matched loosely: a file called
           f3-search-filters-open-dark.png is a proof of /search. */
        stem: file.replace(/\.(png|jpe?g)$/i, "").toLowerCase(),
      });
    }
  }
}

function proofsFor(route) {
  /* The last non-parameter segment is the word a proof file would carry. */
  const parts = route.split("/").filter((p) => p && !p.startsWith("["));
  const key = parts.length ? parts[parts.length - 1].toLowerCase() : "landing";
  return proofs.filter((p) => p.stem.split(/[-_]/).includes(key));
}

const all = routes();
const byOwner = new Map();
for (const route of all) {
  const owner = ownerOf(route);
  if (!byOwner.has(owner)) byOwner.set(owner, []);
  byOwner.get(owner).push(route);
}

const lines = [];
lines.push("# The sweep register");
lines.push("");
lines.push(
  "GENERATED by `node scripts/design/sweep-register.mjs`. Do not edit it by hand: it is",
);
lines.push(
  "regenerated from the route tree and the proofs directory, so a hand edit is lost and,",
);
lines.push("worse, a hand edit can claim coverage that does not exist.");
lines.push("");
lines.push(
  `Every proof taken before \`${CUTOFF_COMMIT}\` (${cutoff.toISOString()}) is VOID by the founder's`,
);
lines.push(
  "order of 19 September, because until that commit the screenshot harness was lying in four",
);
lines.push(
  "separate ways. A void proof is counted here as no proof at all, which is the only honest",
);
lines.push("way to count it.");
lines.push("");
lines.push(
  `**${all.length} surfaces.** A surface is DONE only when a fresh proof of it sits beside its`,
);
lines.push(
  "reference and a second pass has audited it, per the founder's standing order that every",
);
lines.push("frontend scope is audited twice before it closes.");
lines.push("");

let fresh = 0;
let voided = 0;
let none = 0;
for (const [owner, list] of [...byOwner.entries()].sort()) {
  lines.push(`## ${owner}`);
  lines.push("");
  lines.push("| surface | governing reference | proof |");
  lines.push("| --- | --- | --- |");
  for (const route of list) {
    const found = proofsFor(route);
    const freshOnes = found.filter((p) => p.fresh);
    const voidOnes = found.filter((p) => !p.fresh);
    let state;
    if (freshOnes.length) {
      state = `${freshOnes.length} fresh (${freshOnes.map((p) => `${p.group}/${p.file}`).join(", ")})`;
      fresh += 1;
    } else if (voidOnes.length) {
      state = `**VOID**, ${voidOnes.length} taken on the broken harness, must be retaken`;
      voided += 1;
    } else {
      state = "none";
      none += 1;
    }
    lines.push(`| \`${route}\` | ${GOVERNED[route] ?? "none, inherits the register" } | ${state} |`);
  }
  lines.push("");
}

lines.push("## The count");
lines.push("");
lines.push(`- ${fresh} surfaces carry at least one proof taken on the honest harness.`);
lines.push(`- ${voided} surfaces carry only void proofs and must be retaken.`);
lines.push(`- ${none} surfaces have no proof at all.`);
lines.push("");
lines.push(
  "A proof is matched to a surface by the last real segment of its route appearing in the",
);
lines.push(
  "file name, so a proof named for something else will not be counted even if it shows the",
);
lines.push(
  "right screen. That is deliberate: the register undercounts rather than overcounts, because",
);
lines.push("a register that flatters the sweep is worse than no register.");

console.log(lines.join("\n"));
