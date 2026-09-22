/*
 * IS THE FULL-PAGE SAMPLE READING THE RIGHT PIXELS?
 *
 * `probe-contrast.mjs` takes ONE full-page screenshot and then reads each
 * element's `getBoundingClientRect` out of it. That is three orders of
 * magnitude cheaper than a shot per element and it is correct for ordinary
 * flow content. It is NOT correct for anything the browser paints somewhere
 * other than where the rect says: a `position: fixed` bar, an element in a
 * scrolled subtree, or an element whose rect is relative to a viewport that a
 * full-page capture has just resized.
 *
 * So this re-measures the same elements the honest slow way: scroll each one
 * into view, shoot the VIEWPORT, and read the rect out of that. Where the two
 * agree the original number stands. Where they disagree the original number is
 * an artefact of the capture and not a fact about the product.
 */
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const BASE = "http://127.0.0.1:3220";
const SP = "/tmp/claude-0/-home-user-read-it-well/6683fd27-f2f3-5b70-8a27-4cc917444da7/scratchpad";
const targets = JSON.parse(readFileSync(process.argv[2], "utf8"));

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

function lum([r, g, b]) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };

const byRoute = new Map();
for (const t of targets) {
  const k = `${t.theme}|${t.route}`;
  if (!byRoute.has(k)) byRoute.set(k, []);
  byRoute.get(k).push(t);
}

const out = [];
for (const [key, items] of byRoute) {
  const [theme, route] = key.split("|");
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme, deviceScaleFactor: 2 });
  try {
    await page.addInitScript((t) => { try { localStorage.setItem("nf_theme", t); } catch {} }, theme);
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    await page.evaluate((t) => {
      if (t === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    }, theme);
    await page.waitForTimeout(600);

    for (const item of items) {
      /*
       * MATCH ON THE CLASS LIST AS WELL AS THE TEXT, and this correction came
       * out of being wrong once.
       *
       * The first pass matched on tag and text alone and then re-measured
       * whatever it found. On `/preview/p3/admin-businesses` two different
       * elements carry the words "Government issued ID": a heading the probe
       * never flagged and a 14px label inside a checklist row that it did. The
       * verifier measured the heading, got 20:1, and would have reported the
       * probe as wrong about an element it had never looked at. The probe
       * records the class list; a verifier that ignores it is checking a
       * different question.
       */
      const handle = await page.evaluateHandle(({ tag, cls, text }) => {
        const own = (el) => { let s = ""; for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue; return s.replace(/\s+/g, " ").trim(); };
        const want = cls.split(".").filter(Boolean);
        const all = [...document.querySelectorAll(tag)].filter(
          (el) => own(el).slice(0, 28) === text && want.every((c) => el.classList.contains(c)),
        );
        return all[0] ?? null;
      }, { tag: item.tag, cls: item.cls, text: item.text.slice(0, 28) });
      const el = handle.asElement();
      if (!el) { out.push({ ...item, verified: null, note: "element not found on re-open" }); continue; }
      await el.evaluate((n) => n.scrollIntoView({ block: "center", behavior: "instant" }));
      await page.waitForTimeout(250);
      const shot = (await page.screenshot({ type: "png" })).toString("base64");
      const res = await page.evaluate(
        async ({ src, dpr, tag, cls, text }) => {
          const own = (e) => { let s = ""; for (const n of e.childNodes) if (n.nodeType === 3) s += n.nodeValue; return s.replace(/\s+/g, " ").trim(); };
          const want = cls.split(".").filter(Boolean);
          const el = [...document.querySelectorAll(tag)].find(
            (e) => own(e).slice(0, 28) === text && want.every((c) => e.classList.contains(c)),
          );
          if (!el) return null;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2 || r.top < 0 || r.bottom > innerHeight) return { offscreen: true };
          const img = new Image();
          img.src = "data:image/png;base64," + src;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(Math.round(r.x * dpr), Math.round(r.y * dpr), Math.max(1, Math.round(r.width * dpr)), Math.max(1, Math.round(r.height * dpr))).data;
          const hist = new Map();
          for (let i = 0; i < d.length; i += 4) {
            const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
            hist.set(k, (hist.get(k) ?? 0) + 1);
          }
          const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
          const total = d.length / 4;
          const surface = sorted[0][0].split(",").map(Number);
          const share = sorted[0][1] / total;
          const L = (v) => { const f = (x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
          const ls = L(surface);
          let ink = surface, best = 0;
          for (const [k, n] of sorted) {
            if (n / total < 0.002) break;
            const v = k.split(",").map(Number);
            const d2 = Math.abs(L(v) - ls);
            if (d2 > best) { best = d2; ink = v; }
          }
          return { ink, surface, share: Math.round(share * 100) / 100 };
        },
        { src: shot, dpr: 2, tag: item.tag, cls: item.cls, text: item.text.slice(0, 28) },
      );
      if (!res) out.push({ ...item, verified: null, note: "not found in viewport pass" });
      else if (res.offscreen) out.push({ ...item, verified: null, note: "cannot be brought fully into a 390x844 viewport" });
      else out.push({ ...item, verified: ratio(res.ink, res.surface), vInk: res.ink, vSurface: res.surface, vShare: res.share });
    }
  } catch (e) {
    for (const item of items) out.push({ ...item, verified: null, note: e.message.split("\n")[0] });
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
