/*
 * THE A/B DIFF, WHICH IS THE ONLY VALID READING OF THESE TWO RUNS.
 *
 * The absolute count from `probe-contrast.mjs` cannot be trusted below the
 * first viewport, because the full-page capture the probe samples does not
 * faithfully contain everything the rects describe on a long route. That is
 * proven separately with a marker test.
 *
 * It does not need to be trusted for THIS question. Both arms are the same
 * build, the same routes, the same probe and the same machine; only four token
 * declarations differ. Whatever the capture gets wrong, it gets wrong
 * identically in both arms, so it cancels in the difference. A failure present
 * in AFTER and absent in BEFORE is caused by the change. A failure present in
 * both is older than the change and is somebody else's to route.
 */
import { readFileSync } from "node:fs";
const load = (p) => {
  const fails = [];
  const errors = [];
  let measured = 0;
  const routes = new Set();
  for (const line of readFileSync(p, "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    fails.push(...r.fails);
    errors.push(...r.errors);
    measured += r.measured;
    for (const rt of r.routes) routes.add(`${r.theme} ${rt}`);
  }
  return { fails, errors, measured, routes };
};
const key = (f) => `${f.theme}|${f.route}|${f.tag}|${f.cls}|${f.text}`;
const after = load(process.argv[2]);
const before = load(process.argv[3]);

const bMap = new Map(before.fails.map((f) => [key(f), f]));
const aMap = new Map(after.fails.map((f) => [key(f), f]));

const introduced = after.fails.filter((f) => !bMap.has(key(f)));
const removed = before.fails.filter((f) => !aMap.has(key(f)));
const shared = after.fails.filter((f) => bMap.has(key(f)));
const worsened = shared.filter((f) => f.ratio < bMap.get(key(f)).ratio - 0.05);
const improved = shared.filter((f) => f.ratio > bMap.get(key(f)).ratio + 0.05);

const n = (s) => `dark ${[...s].filter((f) => f.theme === "dark").length}, light ${[...s].filter((f) => f.theme === "light").length}`;
console.log(`BEFORE (edge tokens as they were): ${before.fails.length} below the floor (${n(before.fails)}), ${before.measured} leaves, ${before.routes.size} route/theme pairs, ${before.errors.length} did not open`);
console.log(`AFTER  (one container ink):        ${after.fails.length} below the floor (${n(after.fails)}), ${after.measured} leaves, ${after.routes.size} route/theme pairs, ${after.errors.length} did not open`);
console.log();
console.log(`present in AFTER and not in BEFORE (caused by the change): ${introduced.length}`);
introduced.sort((a, b) => a.ratio - b.ratio).forEach((f) =>
  console.log(`  ${f.theme.padEnd(5)} ${f.ratio.toFixed(2)}:1  ${f.route}  ${f.tag}.${f.cls}  "${f.text}"  ink rgb(${f.ink}) on rgb(${f.surface})`),
);
console.log();
console.log(`present in BEFORE and not in AFTER (fixed by the change): ${removed.length}`);
removed.sort((a, b) => a.ratio - b.ratio).forEach((f) =>
  console.log(`  ${f.theme.padEnd(5)} ${f.ratio.toFixed(2)}:1  ${f.route}  ${f.tag}.${f.cls}  "${f.text}"`),
);
console.log();
console.log(`in both, and WORSE after: ${worsened.length}`);
worsened.forEach((f) => console.log(`  ${f.theme.padEnd(5)} ${bMap.get(key(f)).ratio.toFixed(2)} -> ${f.ratio.toFixed(2)}  ${f.route}  ${f.tag}.${f.cls}  "${f.text}"`));
console.log();
console.log(`in both, and BETTER after: ${improved.length}`);
improved.forEach((f) => console.log(`  ${f.theme.padEnd(5)} ${bMap.get(key(f)).ratio.toFixed(2)} -> ${f.ratio.toFixed(2)}  ${f.route}  ${f.tag}.${f.cls}  "${f.text}"`));
console.log();
console.log(`in both, unchanged: ${shared.length - worsened.length - improved.length}`);
