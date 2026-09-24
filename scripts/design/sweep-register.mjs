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
 * Usage:  node scripts/design/sweep-register.mjs > /tmp/SWEEP.md
 * The output is local: docs/design/proofs/ is git-ignored, so the register
 * describes one machine's shots. The last committed register is
 * docs/archive/SWEEP.md.
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
 * WHEN A PROOF WAS TAKEN IS A FACT ABOUT THE COMMIT, NOT ABOUT THE DISK, AND
 * READING IT OFF THE DISK MADE THIS REGISTER SELF-CLEARING.
 *
 * Until 22 September this file asked `statSync(file).mtime`. A git checkout
 * writes every file it materialises with the time of the checkout, so in any
 * fresh clone, any worktree and any CI runner EVERY proof in the tree is newer
 * than the cutoff and every VOID surface silently becomes proven. Measured on
 * this box on 22 September: the same script over the same 600 proof files
 * reported `58 fresh, 15 void` in the long-lived working copy and
 * `73 fresh, 0 void` in a worktree checked out ten minutes earlier. Nothing
 * had been shot. The fifteen surfaces the founder ordered retaken had cleared
 * themselves by being cloned.
 *
 * That is the exact failure this file's own header calls harmful: not a stale
 * count, a count that grows on its own. So the date now comes from git, which
 * is the same answer on every machine and cannot be changed by touching a file.
 * One `git log` walks the whole proofs tree; a file git has never seen (a shot
 * taken on this machine and not yet committed) is genuinely new and is treated
 * as fresh, which is the only reading that lets today's work count today.
 */
function proofCommitDates() {
  const map = new Map();
  let log = "";
  try {
    log = execSync(
      `git -C ${REPO} log --format=%x00%cI --name-only -- docs/design/proofs`,
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  } catch {
    return map;
  }
  let when = null;
  for (const line of log.split("\n")) {
    if (line.startsWith("\u0000")) {
      when = new Date(line.slice(1));
      continue;
    }
    const path = line.trim();
    if (!path || !when) continue;
    /* First mention wins: `git log` is newest first, so that is the last
       commit that touched the file, which is when the proof last changed. */
    if (!map.has(path)) map.set(path, when);
  }
  return map;
}
const COMMITTED = proofCommitDates();

/*
 * OWNERSHIP BY ROUTE PREFIX, longest prefix wins. This is the division of
 * routes into sweep groups. "site" is the marketing and legal frontage,
 * which belongs to no group.
 */
const OWNERS = [
  ["/admin", "V5 agent, host and admin"],
  ["/agent", "V5 agent, host and admin"],
  ["/host", "V5 agent, host and admin"],
  ["/wallet", "V2 money"],
  ["/checkout", "V2 money"],
  ["/bookings", "V2 money"],
  ["/bookings?side=stays", "V2 money"],
  ["/bookings?kind=inspection", "V2 money"],
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
  ["/search?market=rent", "V1 discovery and listing"],
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
  /*
   * THESE TWO WERE POINTED AT THE WRONG SURFACES, AND ONE OF THEM WAS THE
   * FLAGSHIP.
   *
   * `GOVERNING-feed-plus-bloom.png` draws THE FEED: the location chip, the
   * story rings, the For you / Following capsule, the cards and the plus that
   * blooms. That is `/around`, and `around/page.tsx` says so in its own first
   * docblock, "Around: the feed, to `GOVERNING-feed-plus-bloom.png`". It was
   * assigned here to `/u/[handle]`, which is a person's profile and draws none
   * of those five things. So F4's flagship deliverable was credited to a page
   * it does not govern, and `/around` carried "none, inherits the register"
   * while being the one route in the tree with a founder render of its own.
   *
   * `GOVERNING-flip-mid-turn.png` draws the SIDE FLIP, the whole-shell turn
   * between the property side and the stays side. `SideFlip` is mounted by
   * `AppShell` (line 238), so it governs every authenticated route and no
   * single one of them. It was assigned to `/stories/[id]`, which is the story
   * viewer and does not mount it at all. A governing image with no single route
   * is recorded as exactly that rather than parked on the nearest page, because
   * parking it is how a surface gets closed on a picture of something else.
   */
  "/around": "GOVERNING-feed-plus-bloom.png",
};

/*
 * A GOVERNING IMAGE THAT RULES THE SHELL RATHER THAN A ROUTE. Printed in the
 * register's own preamble so it is not lost, and not attached to a route,
 * because attaching it to one would say something false about that route.
 */
const GOVERNED_SHELL = [
  ["`SideFlip`, mounted by `AppShell`, so on every authenticated route", "GOVERNING-flip-mid-turn.png"],
];

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
        /* Git's answer, not the disk's. A proof git has never seen was taken
           on this machine and has not been committed yet, so it is new. */
        fresh: (COMMITTED.get(`docs/design/proofs/${group.name}/${file}`) ?? new Date()) > cutoff,
        /* The slug a proof file is named for, matched loosely: a file called
           f3-search-filters-open-dark.png is a proof of /search. */
        stem: file.replace(/\.(png|jpe?g)$/i, "").toLowerCase(),
      });
    }
  }
}

/*
 * A HYPHENATED SEGMENT COULD NEVER MATCH, AND THAT IS NINE SURFACES THE
 * REGISTER WAS STRUCTURALLY UNABLE TO COUNT.
 *
 * The matcher split a file name on hyphens and underscores and asked whether
 * the route's key was one of the pieces. That works for `/help` and `/trips`.
 * It can never work for `/sign-in`, because the split that produces the
 * haystack destroys the needle: "sign-in-390-dark" becomes
 * ["sign","in","390","dark"], which does not contain "sign-in" and never
 * will, whatever the file is called. The same held for /sign-up,
 * /forgot-password, /reset-password, /delete-account, /rent/move-in and
 * /auth/callback.
 *
 * So the register was reporting "none" for the entire front door of the
 * product as a property of its own arithmetic rather than of the proofs
 * directory, and no amount of shooting those screens could have changed the
 * number. That is the one failure mode this file's own header calls harmful:
 * not a stale count, a count that cannot be corrected by doing the work.
 *
 * The fix keeps the rule exactly as strict. A proof still matches only on
 * WHOLE tokens, never on a substring, so "signature-dark.png" still does not
 * prove /sign-in. A key that is itself hyphenated is simply matched as the
 * consecutive RUN of tokens it splits into, which is what "the last real
 * segment appears in the file name" meant all along.
 */
function tokensContainRun(tokens, run) {
  if (run.length === 0) return false;
  for (let i = 0; i + run.length <= tokens.length; i += 1) {
    let hit = true;
    for (let j = 0; j < run.length; j += 1) {
      if (tokens[i + j] !== run[j]) {
        hit = false;
        break;
      }
    }
    if (hit) return true;
  }
  return false;
}

/*
 * A LAST SEGMENT IS NOT A ROUTE, AND THE REGISTER WAS CREDITING ONE PICTURE
 * TO EVERY ROUTE THAT ENDED IN THE SAME WORD.
 *
 * A2 wrote this down before anybody read it as coverage: `a2/privacy-390-dark.png`
 * and `a2/terms-390-dark.png` are shots of the PUBLIC `/privacy` and `/terms`,
 * and the matcher was also crediting them to `/legal/privacy` and `/legal/terms`,
 * which nobody has ever photographed. It was never two routes. Matching on the
 * last segment alone, twenty three keys in this tree are shared by two or more
 * routes: `/start` and `/host/start`, `/verification` and `/agent/verification`,
 * `/notifications` and `/settings/notifications`, `/search` and `/stays/search`,
 * and so on down. `/host/start` appeared today and was born already counted as
 * proven, off a picture of a screen in a different product area, without anybody
 * touching it. That is the failure mode this file's own header calls harmful:
 * not a stale count, a count that grows on its own.
 *
 * THE RULE NOW, AND IT ONLY BITES WHERE THERE IS A REAL COLLISION. A proof is
 * still matched by the last real segment of a route, exactly as before, and
 * where that segment belongs to ONE route the proof is credited to it and
 * nothing changes: `e/send-390-dark.png` is still the proof of `/wallet/send`,
 * because no other route in the tree ends in "send". Where the segment is
 * shared, the file name has to say which one it means: the route whose WHOLE
 * path appears in the name as a consecutive run takes it, longest path first,
 * so `privacy-390-dark.png` proves `/privacy` and `agent-messages-390-dark.png`
 * proves `/agent/messages`. Where the colliding routes differ only by a
 * parameter segment, which a file name cannot speak to, the shallowest takes
 * it: `bookings-390-dark.png` is the list, not somebody's booking. And where
 * two genuinely different paths end in the same word and neither is named,
 * NEITHER is credited, because the picture can only be of one of them.
 *
 * AND A DROPPED MATCH IS PRINTED RATHER THAN SWALLOWED. A proof whose name
 * reaches a route's last segment but does not identify it is recorded against
 * that route as AMBIGUOUS, naming the file, so the owner can rename it and
 * recover the coverage. It counts as no proof, because it is not one, but it
 * does not disappear.
 */
const all = routes();

function runOf(route) {
  const parts = route.split("/").filter((p) => p && !p.startsWith("["));
  return parts.length ? parts.join("-").toLowerCase().split(/[-_]/) : ["landing"];
}
function depthOf(route) {
  return route.split("/").filter(Boolean).length;
}
function lastKeyOf(route) {
  const parts = route.split("/").filter((p) => p && !p.startsWith("["));
  return (parts.length ? parts[parts.length - 1] : "landing").toLowerCase().split(/[-_]/);
}

const credited = new Map(all.map((r) => [r, []]));
const ambiguous = new Map(all.map((r) => [r, []]));
for (const proof of proofs) {
  const tokens = proof.stem.split(/[-_]/);
  const candidates = all.filter((r) => tokensContainRun(tokens, lastKeyOf(r)));
  if (candidates.length === 0) continue;
  let winners;
  if (candidates.length === 1) {
    winners = candidates;
  } else {
    const named = candidates.filter((r) => tokensContainRun(tokens, runOf(r)));
    if (named.length) {
      const longest = Math.max(...named.map((r) => runOf(r).length));
      winners = named.filter((r) => runOf(r).length === longest);
    } else if (new Set(candidates.map((r) => runOf(r).join("-"))).size === 1) {
      /* They are one path with parameter children hanging off it. */
      winners = candidates;
    } else {
      winners = [];
    }
    if (winners.length > 1) {
      const shallowest = Math.min(...winners.map(depthOf));
      winners = winners.filter((r) => depthOf(r) === shallowest);
    }
  }
  for (const r of winners) credited.get(r).push(proof);
  for (const r of candidates) if (!winners.includes(r)) ambiguous.get(r).push(proof);
}

function proofsFor(route) {
  return credited.get(route) ?? [];
}
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
for (const [where, image] of GOVERNED_SHELL) {
  lines.push(`**Governs the shell, not a route:** ${image} rules ${where}.`);
  lines.push("");
}
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
let unnamed = 0;
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
    } else if ((ambiguous.get(route) ?? []).length) {
      const near = ambiguous.get(route);
      state = `**AMBIGUOUS**, the name does not carry this whole path (${near
        .map((p) => `${p.group}/${p.file}`)
        .join(", ")}); rename it to \`${runOf(route).join("-")}-...\` to count it`;
      unnamed += 1;
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
lines.push(
  `- ${unnamed} surfaces have a proof whose name reaches their last segment but not their whole path, and are counted as unproven until it is renamed.`,
);
lines.push(`- ${none} surfaces have no proof at all.`);
lines.push("");
lines.push(
  "A proof is matched to a surface by EVERY non-parameter segment of its route appearing in",
);
lines.push(
  "the file name as a consecutive run, so a proof named for something else will not be counted",
);
lines.push(
  "even if it shows the right screen, and `privacy-390-dark.png` proves `/privacy` without also",
);
lines.push(
  "being credited to `/legal/privacy` and `/settings/privacy`, which nobody has photographed.",
);
lines.push(
  "That is deliberate: the register undercounts rather than overcounts, because a register",
);
lines.push("that flatters the sweep is worse than no register.");

console.log(lines.join("\n"));
