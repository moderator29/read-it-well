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
  .g, .hl, .pop, .phone, .abs { position: absolute; }
  .phone { display: block; }
  img { display: block; }

  /* headline (DESIGN.md section 6a) */
  .hl h1 { font-family: "Poppins", sans-serif; letter-spacing: -0.03em; font-feature-settings: "kern" 1; }
  .hl .ln { display: inline; white-space: nowrap; }
  .hl .sub { font-family: "Inter", sans-serif; font-weight: 500; line-height: 1.3; margin-top: 0.7em; letter-spacing: -0.005em; white-space: nowrap; }

  /* pop-up card (DESIGN.md section 4), opaque navy glass */
  .pop { display: flex; align-items: center; font-family: "Inter", sans-serif; }
  .pop.dk { color: #FFFFFF;
    background: linear-gradient(180deg, rgb(22 31 92 / 0.97) 0%, rgb(12 18 66 / 0.97) 100%);
    box-shadow: inset 0 0 0 1.5px rgb(120 170 255 / 0.35), 0 60px 110px -30px rgb(0 0 12 / 0.9), 0 20px 44px -14px rgb(0 0 20 / 0.6); }
  .pchip { flex: none; border-radius: 50%; display: grid; place-items: center; }
  .pop .pchip.solid { background: linear-gradient(160deg, #4A95FF 0%, #0069FE 55%, #0050C8 100%); box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.3); }
  .ptxt { flex: 1; min-width: 0; }
  .ptop { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
  .pright { display: inline-flex; align-items: center; flex: none; }
  .ptitle { font-weight: 700; letter-spacing: -0.012em; white-space: nowrap; }
  .pline { font-weight: 500; margin-top: 8px; white-space: nowrap; letter-spacing: -0.004em; color: rgb(208 222 255 / 0.84); }
  .pamt { font-weight: 700; margin-top: 10px; letter-spacing: -0.015em; color: #7BF1B8; }
  .pmeta { font-weight: 500; white-space: nowrap; color: rgb(200 214 250 / 0.78); }

  /* the Example chip, as the product draws it */
  .ex { display: inline-flex; align-items: center; border-radius: 999px; font-family: "Inter", sans-serif; font-weight: 600; line-height: 1; white-space: nowrap; letter-spacing: 0.005em; }
  .ex.dk { background: rgb(1 1 24 / 0.50); box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / 0.26); color: #E8EFFF; }
`;

const FIT = `
  (() => {
    for (const el of document.querySelectorAll('.hl')) {
      const h1 = el.querySelector('h1');
      const max = +el.dataset.max;
      let size = +el.dataset.size;
      const min = size * 0.9;
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
