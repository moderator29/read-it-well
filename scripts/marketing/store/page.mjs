/**
 * The HTML document every store image is drawn in: the fonts, the shared
 * styles of the parts in components.mjs, and the one script that fits a
 * headline to its measure.
 */
import { fontCss } from "./lib.mjs";

const BASE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #010118; overflow: hidden; }
  body { -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; font-family: "Inter", sans-serif; }
  #stage { position: relative; overflow: hidden; }
  .half { position: absolute; top: 0; overflow: hidden; }
  .g, .hl, .pop, .st, .pill, .phone, .card, .abs { position: absolute; }
  .phone { display: block; }
  img { display: block; }

  /* headline */
  .hl h1 { font-family: "Poppins", sans-serif; letter-spacing: -0.03em; font-feature-settings: "kern" 1; }
  .hl .ln { display: inline; white-space: nowrap; }
  .hl .ln.acc { -webkit-background-clip: text; background-clip: text; color: transparent; padding-bottom: 0.08em; }
  .hl .serif { font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; letter-spacing: -0.01em; font-size: 1.14em; line-height: 0.9; padding-right: 0.04em; }
  .hl .sub { font-family: "Inter", sans-serif; font-weight: 500; line-height: 1.36; margin-top: 0.9em; letter-spacing: -0.006em; }
  .eyebrow { display: flex; margin-bottom: 40px; }
  .ebpill { display: inline-flex; align-items: center; gap: 14px; font: 600 30px/1 "Inter", sans-serif; padding: 16px 28px 16px 22px; border-radius: 999px; letter-spacing: 0.01em; }
  .eyebrow.dk .ebpill { background: rgb(92 159 255 / 0.12); box-shadow: inset 0 0 0 1.5px rgb(130 180 255 / 0.30); color: #D6E6FF; }
  .eyebrow.lt .ebpill { background: rgb(0 105 254 / 0.07); box-shadow: inset 0 0 0 1.5px rgb(0 105 254 / 0.20); color: #0B3FA8; }

  /* pop-up card */
  .pop { display: flex; align-items: center; font-family: "Inter", sans-serif; }
  .pop.dk { color: #FFFFFF;
    background: linear-gradient(180deg, rgb(22 31 92 / 0.97) 0%, rgb(12 18 66 / 0.97) 100%);
    box-shadow: inset 0 0 0 1.5px rgb(120 170 255 / 0.35), 0 60px 110px -30px rgb(0 0 12 / 0.9), 0 20px 44px -14px rgb(0 0 20 / 0.6); }
  .pop.lt { color: #0A1030;
    background: rgb(255 255 255 / 0.92);
    box-shadow: inset 0 0 0 1px rgb(10 20 70 / 0.06), 0 50px 90px -30px rgb(20 30 90 / 0.40), 0 14px 30px -10px rgb(20 30 90 / 0.18);
    -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6); }
  .pchip { flex: none; border-radius: 50%; display: grid; place-items: center; }
  .pchip img { filter: drop-shadow(0 6px 10px rgb(0 0 30 / 0.35)); }
  .pop.dk .pchip.electric { background: radial-gradient(120% 120% at 30% 18%, rgb(130 185 255 / 0.40) 0%, rgb(0 105 254 / 0.22) 60%, rgb(0 86 208 / 0.20) 100%); box-shadow: inset 0 0 0 1.5px rgb(150 195 255 / 0.40); }
  .pop.lt .pchip.electric { background: radial-gradient(120% 120% at 30% 18%, #EAF2FF 0%, #D7E6FF 100%); box-shadow: inset 0 0 0 1.5px rgb(0 105 254 / 0.14); }
  .pop .pchip.warm { background: radial-gradient(120% 120% at 30% 18%, rgb(255 190 130 / 0.45) 0%, rgb(255 107 26 / 0.22) 70%); box-shadow: inset 0 0 0 1.5px rgb(255 190 140 / 0.40); }
  .pop .pchip.mint { background: radial-gradient(120% 120% at 30% 18%, rgb(140 255 200 / 0.40) 0%, rgb(20 180 110 / 0.22) 70%); box-shadow: inset 0 0 0 1.5px rgb(150 255 205 / 0.35); }
  .pop .pchip.solid.solid.solid { background: linear-gradient(160deg, #4A95FF 0%, #0069FE 55%, #0050C8 100%); box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.35), 0 12px 26px -6px rgb(0 86 208 / 0.6); }
  .ptxt { flex: 1; min-width: 0; }
  .ptop { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
  .pright { display: inline-flex; align-items: center; flex: none; }
  .ptitle { font-weight: 700; letter-spacing: -0.012em; white-space: nowrap; }
  .pline { font-weight: 500; margin-top: 8px; white-space: nowrap; letter-spacing: -0.004em; }
  .pop.dk .pline { color: rgb(208 222 255 / 0.84); }
  .pop.lt .pline { color: rgb(10 16 48 / 0.64); }
  .pamt { font-weight: 700; margin-top: 10px; letter-spacing: -0.015em; }
  .pop.dk .pamt { color: #7BF1B8; }
  .pop.lt .pamt { color: #0A8A52; }
  .pmeta { font-weight: 500; white-space: nowrap; }
  .pop.dk .pmeta { color: rgb(200 214 250 / 0.78); }
  .pop.lt .pmeta { color: rgb(10 16 48 / 0.62); }

  /* Example chip, as the product draws it */
  .ex { display: inline-flex; align-items: center; border-radius: 999px; font-family: "Inter", sans-serif; font-weight: 600; line-height: 1; white-space: nowrap; letter-spacing: 0.005em; }
  .ex.dk { background: rgb(1 1 24 / 0.50); box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / 0.26); color: #E8EFFF; }
  .ex.lt { background: rgb(8 16 50 / 0.05); box-shadow: inset 0 0 0 1.5px rgb(8 16 50 / 0.14); color: #34406B; }

  /* pill */
  .pill { display: inline-flex; align-items: center; border-radius: 999px; font-family: "Inter", sans-serif; font-weight: 600; white-space: nowrap; line-height: 1; letter-spacing: -0.005em; }
  .pill.dk { color: #E4EDFF; background: linear-gradient(180deg, rgb(26 36 100 / 0.86), rgb(12 18 64 / 0.84)); box-shadow: inset 0 0 0 1.5px rgb(120 170 255 / 0.32), 0 24px 50px -16px rgb(0 0 16 / 0.7); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); }
  .pill.dk.on { color: #FFFFFF; background: linear-gradient(160deg, #3F8CFF 0%, #0069FE 60%, #0052CC 100%); box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.28), 0 24px 50px -14px rgb(0 105 254 / 0.65); }
  .pill.lt { color: #0B1640; background: rgb(255 255 255 / 0.94); box-shadow: inset 0 0 0 1px rgb(10 20 70 / 0.07), 0 24px 50px -18px rgb(20 30 90 / 0.35); }
  .pill.lt.on { color: #FFFFFF; background: linear-gradient(160deg, #3F8CFF 0%, #0069FE 60%, #0052CC 100%); }

  /* a generic glass card (cost lines, stacks) */
  .card { font-family: "Inter", sans-serif; }
  .card.dk { color: #FFFFFF; background: linear-gradient(180deg, rgb(28 38 104 / 0.92) 0%, rgb(12 18 66 / 0.90) 100%);
    box-shadow: inset 0 0 0 1.5px rgb(120 170 255 / 0.32), inset 0 2px 0 rgb(255 255 255 / 0.09), 0 40px 80px -24px rgb(0 0 16 / 0.8), 0 12px 28px -8px rgb(0 0 30 / 0.45);
    -webkit-backdrop-filter: blur(24px) saturate(1.4); backdrop-filter: blur(24px) saturate(1.4); }
  .card.lt { color: #0A1030; background: rgb(255 255 255 / 0.94); box-shadow: inset 0 0 0 1px rgb(10 20 70 / 0.06), 0 40px 80px -30px rgb(20 30 90 / 0.35), 0 12px 28px -12px rgb(20 30 90 / 0.16); }
`;

const FIT = `
  (() => {
    for (const el of document.querySelectorAll('.hl')) {
      const h1 = el.querySelector('h1');
      const max = +el.dataset.max;
      let size = +el.dataset.size;
      const min = size * 0.72;
      const widest = () => Math.max(...[...h1.querySelectorAll('.ln')].map((s) => s.getBoundingClientRect().width));
      while (widest() > max && size > min) { size -= 1; h1.style.fontSize = size + 'px'; }
      el.dataset.fit = String(size);
    }
  })();
`;

/** One page: `width` x `height` CSS pixels holding `body`. */
export function page({ width, height, body, css = "" }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss()}${BASE}${css}
  #stage { width: ${width}px; height: ${height}px; }
  html, body { width: ${width}px; height: ${height}px; }
  </style></head><body><div id="stage">${body}</div><script>document.fonts.ready.then(() => { ${FIT}; window.__fit = true; });</script></body></html>`;
}
