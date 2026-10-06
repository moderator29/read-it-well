// Stills benchmark: warm-up, then N renders at a fixed size; prints min / median / max.
//
//   node scripts/marketing/phone3d/test/bench.mjs [--size 1600x2000] [--shadow drop] [--runs 2] [--no-msaa]

import os from 'node:os';
import { createPhoneStudio } from '../studio.mjs';
import { makeTestScreen } from './make-test-screen.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const [W, H] = opt('size', '1600x2000').split('x').map(Number);
const shadow = opt('shadow', 'drop');
const runs = +opt('runs', 2);
const msaa = !args.includes('--no-msaa');
const screen = await makeTestScreen();

const t0 = performance.now();
const studio = await createPhoneStudio({ msaa });
console.log(`startup + warm-up: ${Math.round(performance.now() - t0)} ms, load avg ${os.loadavg().map((v) => v.toFixed(1)).join(' ')}`);

const poses = ['front', 'three-quarter-left', 'hero-low', 'top-down-steep', 'flat-tilt'];
const totals = [];
// first render at this size allocates the canvas buffers; not counted
await studio.render({ screen, pose: 'front', width: W, height: H, shadow });
for (let k = 0; k < runs; k++) {
  for (const pose of poses) {
    const r = await studio.render({ screen, pose, width: W, height: H, shadow, model: k % 2 ? 'android' : 'island' });
    totals.push(r.timings.total);
    console.log(`${pose.padEnd(20)} ${JSON.stringify(r.timings)}`);
  }
}
totals.sort((a, b) => a - b);
console.log(
  `${W}x${H} (x2 supersampled${msaa ? ', 4x MSAA' : ''}, shadow ${shadow}): ` +
    `min ${totals[0]} ms, median ${totals[Math.floor(totals.length / 2)]} ms, max ${totals[totals.length - 1]} ms ` +
    `over ${totals.length} renders; load avg ${os.loadavg().map((v) => v.toFixed(1)).join(' ')}`,
);
await studio.close();
