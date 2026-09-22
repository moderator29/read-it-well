import { readFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const all = { fails: [], onMedia: [], errors: [], unpainted: 0, measured: 0, routes: new Set() };
for (const r of lines) {
  all.fails.push(...r.fails);
  all.onMedia.push(...r.onMedia);
  all.errors.push(...r.errors);
  all.unpainted += r.unpainted;
  all.measured += r.measured;
  for (const rt of r.routes) all.routes.add(`${r.theme} ${rt}`);
}
const byTheme = (t) => all.fails.filter((f) => f.theme === t).length;
console.log(`routes x themes covered: ${all.routes.size}`);
console.log(`leaves measured: ${all.measured}`);
console.log(`BELOW THE FLOOR: ${all.fails.length}  (dark ${byTheme("dark")}, light ${byTheme("light")})`);
console.log(`on a patterned ground (not a verdict): ${all.onMedia.length}`);
console.log(`nothing painted: ${all.unpainted}`);
console.log(`routes that did not open: ${all.errors.length}`);
for (const e of all.errors) console.log(`  ! ${e}`);
console.log("\n--- failures, worst first ---");
const seen = new Map();
for (const f of all.fails.sort((a, b) => a.ratio - b.ratio)) {
  const key = `${f.theme}|${f.cls}|${f.tag}`;
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(f);
}
for (const [key, group] of seen) {
  const f = group[0];
  console.log(`${f.theme.padEnd(5)} ${f.tag}.${f.cls}  x${group.length}  worst ${f.ratio.toFixed(2)}:1  "${f.text}" ${f.size}px  ink rgb(${f.ink}) on rgb(${f.surface})`);
  console.log(`      first seen: ${f.route}`);
}
