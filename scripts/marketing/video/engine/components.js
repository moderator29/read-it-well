/**
 * THE FILMS' SHARED PIECES: backgrounds, kinetic words, pop-up cards,
 * counters, taps, the desktop cursor, the browser window, captions and grain.
 * The phone lives in phone.js. Every piece is driven by the timeline or by a
 * per-frame hook that reads only the time.
 */

/* ---------- backgrounds ---------- */

/** Deep navy with a soft electric glow from the top: the films' night canvas. */
export function bgNavy(ctx, parent, { glowX = 50, glowY = 8, glow = 0.55 } = {}) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(90% 55% at ${glowX}% ${glowY}%, rgb(0 105 254 / ${glow}) 0%, rgb(0 63 152 / ${glow * 0.45}) 38%, transparent 70%),
        radial-gradient(120% 90% at 50% 110%, rgb(2 6 63 / 0.9) 0%, transparent 60%),
        linear-gradient(180deg, #02063f 0%, #010118 62%, #010118 100%)`,
    },
  }, parent);
}

/** Warm dusk: navy with orange and peach low in the frame (stays, going out). */
export function bgDusk(ctx, parent, { x = 50, y = 96 } = {}) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(80% 45% at ${x}% ${y}%, rgb(255 107 26 / 0.62) 0%, rgb(255 178 122 / 0.22) 36%, transparent 68%),
        radial-gradient(70% 40% at 50% 0%, rgb(0 105 254 / 0.35) 0%, transparent 70%),
        linear-gradient(180deg, #02063f 0%, #0b0a2e 55%, #1a0f24 100%)`,
    },
  }, parent);
}

/** Light studio grey, like the reference product shots. */
export function bgStudio(ctx, parent) {
  return ctx.el("div", {
    class: "fill",
    style: { background: "radial-gradient(80% 60% at 50% 38%, #ffffff 0%, #f2f3f6 55%, #e6e8ee 100%)" },
  }, parent);
}

/** A soft coloured light, for depth behind a subject. */
export function glow(ctx, parent, { x, y, size, color = "rgb(0 105 254 / 0.55)" }) {
  return ctx.el("div", {
    class: "abs",
    style: {
      left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      background: `radial-gradient(closest-side, ${color} 0%, ${color.replace(/[\d.]+\)$/, (a) => `${(parseFloat(a) * 0.45).toFixed(3)})`)} 45%, transparent 100%)`,
    },
  }, parent);
}

/* ---------- words ---------- */

/**
 * Kinetic type: `text` split into masked words. Returns { el, words, masks }:
 * animate `words` (y: "110%" -> 0 reveals a word from under its mask).
 */
export function words(ctx, text, { cls = "display", style = {}, parent = null, tag = "div" } = {}) {
  const el = ctx.el(tag, { class: `abs ${cls}`, style }, parent);
  const out = [];
  const masks = [];
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
    const mask = ctx.el("span", { class: "mask" }, el);
    out.push(ctx.el("span", { class: "word", text: part }, mask));
    masks.push(mask);
  });
  return { el, words: out, masks };
}

/* ---------- pop-up cards ---------- */

/**
 * The "you got paid" card. DESIGN.md section 4 and FACTS.md: only the
 * allowed phrasings, and `example: true` whenever it is illustrative.
 * { theme: "dark"|"light", sticker: codepoint | icon: lucide name, title, line, now, example, fontSize }
 */
export function popup(ctx, { theme = "dark", sticker, icon, title, line, now = "now", example = true, fontSize = 40, parent = null, style = {} }) {
  const card = ctx.el("div", { class: `popup glass-${theme}`, style: { fontSize: `${fontSize}px`, ...style } }, parent);
  const chip = ctx.el("div", { class: "chip" }, card);
  if (sticker) ctx.sticker(sticker, Math.round(fontSize * 1.5), chip);
  else if (icon) {
    const i = ctx.icon(icon, { size: Math.round(fontSize * 1.05), stroke: 2 }, chip);
    i.style.color = theme === "dark" ? "var(--sky)" : "var(--electric)";
  }
  const body = ctx.el("div", { class: "body" }, card);
  ctx.el("div", { class: "title", text: title }, body);
  if (line) ctx.el("div", { class: "line", text: line }, body);
  if (now || example) {
    const meta = ctx.el("div", { class: "meta" }, card);
    if (now) ctx.el("div", { class: "now", text: now }, meta);
    if (example) ctx.el("span", { class: "example-chip", text: "Example" }, meta);
  }
  return card;
}

/**
 * Drops a pop-up in at t: from above (or `from`: "left"|"right"|"below"),
 * overshooting a touch, with the notification chime; out at tOut.
 */
export function popIn(ctx, card, t, { from = "above", distance = 90, tOut = null, sound = "chime_notify", gain = -4 } = {}) {
  const { tl } = ctx;
  const axis = from === "left" || from === "right" ? "x" : "y";
  const sign = from === "above" || from === "left" ? -1 : 1;
  tl.fromTo(card, { [axis]: sign * distance, scale: 0.92, opacity: 0 }, { [axis]: 0, scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.6)" }, t);
  if (sound) ctx.sfx(sound, t, { gain });
  if (tOut != null) tl.to(card, { [axis]: sign * distance * 0.6, opacity: 0, scale: 0.96, duration: 0.28, ease: "power2.in" }, tOut);
}

/* ---------- numbers ---------- */

export const naira = (n) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** Counts `node` from `from` to `to` between t0 and t1 (with counter ticks). */
export function countUp(ctx, node, { from = 0, to, t0, t1, ease = "power2.out", format = naira, ticks = 10, gain = -14 }) {
  const e = ctx.ease(ease);
  ctx.text(node, (t) => format(from + (to - from) * e(ctx.progress(t, t0, t1))));
  for (let k = 0; k < ticks; k += 1) ctx.sfx("counter_tick", t0 + ((t1 - t0) * k) / ticks, { gain });
}

/* ---------- taps, cursor ---------- */

/** A tap on a phone screen at display pixel (x, y): a ripple and the tap sound. */
export function tap(ctx, screen, { x, y, t, size = 240, color = "rgb(143 211 255 / 0.55)", sound = "tap", gain = -6 }) {
  const ring = ctx.el("div", {
    class: "abs",
    style: {
      left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      background: `radial-gradient(closest-side, ${color}, transparent)`, border: "4px solid rgb(255 255 255 / 0.55)", opacity: 0, zIndex: 50,
    },
  }, screen);
  ctx.tl.fromTo(ring, { scale: 0.2, opacity: 0.95 }, { scale: 1, opacity: 0, duration: 0.55, ease: "power2.out" }, t);
  if (sound) ctx.sfx(sound, t, { gain });
  return ring;
}

/** The desktop pointer. Animate its x and y (stage px of its tip). */
export function cursor(ctx, parent, { size = 44 } = {}) {
  const node = ctx.el("div", { class: "abs", style: { left: 0, top: 0, width: `${size}px`, height: `${size}px`, zIndex: 800, filter: "drop-shadow(0 6px 10px rgb(0 0 20 / 0.45))" } }, parent);
  node.innerHTML = `<svg viewBox="0 0 32 32" width="${size}" height="${size}"><path d="M5 3.2v22.6l6.1-5.6 3.9 9 4.1-1.8-3.9-8.9 8.4-.4L5 3.2Z" fill="#fff" stroke="#0b1230" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  return node;
}

/** A click: the pointer dips, a ring opens at its tip, the tap sound. */
export function click(ctx, pointer, t, { ringParent, x, y, sound = "tap", gain = -6 } = {}) {
  ctx.tl.to(pointer, { scale: 0.86, duration: 0.08, ease: "power2.out", transformOrigin: "10% 8%" }, t - 0.02);
  ctx.tl.to(pointer, { scale: 1, duration: 0.22, ease: "power2.out" }, t + 0.08);
  if (ringParent) {
    const ring = ctx.el("div", { class: "abs", style: { left: `${x - 60}px`, top: `${y - 60}px`, width: "120px", height: "120px", borderRadius: "50%", border: "3px solid rgb(143 211 255 / 0.9)", opacity: 0, zIndex: 790 } }, ringParent);
    ctx.tl.fromTo(ring, { scale: 0.2, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.5, ease: "power2.out" }, t);
  }
  if (sound) ctx.sfx(sound, t, { gain });
}

/* ---------- the browser window (desktop film) ---------- */

/**
 * A browser window showing the web app. The content area is 1440 x 900 CSS
 * px (the desktop captures are 2880 x 1800 at 2x); the window is scaled to
 * `width`. Returns { root, content, bar, url }: animate `root` (x, y, scale,
 * rotationX/Y with a transformPerspective), put captures in `content`.
 */
export function browserWindow(ctx, { parent, width = 1500, url = "vallospaces.com", theme = "dark" }) {
  const scale = width / 1440;
  const barH = 56;
  const root = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: "1440px", height: `${900 + barH}px`, transformOrigin: "50% 50%",
      borderRadius: "22px", overflow: "hidden",
      background: theme === "dark" ? "#0b0f2a" : "#ffffff",
      boxShadow: "0 60px 140px -30px rgb(0 0 20 / 0.75), 0 20px 50px -20px rgb(0 0 30 / 0.6), 0 0 0 1.5px rgb(120 170 255 / 0.22)",
    },
  }, parent);
  const bar = ctx.el("div", {
    class: "abs",
    style: {
      left: 0, top: 0, right: 0, height: `${barH}px`, display: "flex", alignItems: "center", gap: "10px", padding: "0 20px",
      background: theme === "dark" ? "linear-gradient(180deg, #151a3d, #10143a)" : "linear-gradient(180deg, #f7f8fb, #eef0f5)",
      borderBottom: theme === "dark" ? "1px solid rgb(120 170 255 / 0.14)" : "1px solid rgb(10 20 60 / 0.08)",
    },
  }, root);
  for (const c of ["#ff5f57", "#febc2e", "#28c840"]) ctx.el("span", { style: { width: "14px", height: "14px", borderRadius: "50%", background: c, opacity: "0.9" } }, bar);
  const pill = ctx.el("div", {
    style: {
      margin: "0 auto", transform: "translateX(-30px)", minWidth: "420px", height: "34px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
      font: "500 16px/1 Inter, sans-serif", letterSpacing: "-0.005em",
      color: theme === "dark" ? "rgb(255 255 255 / 0.78)" : "rgb(10 20 60 / 0.72)",
      background: theme === "dark" ? "rgb(255 255 255 / 0.07)" : "rgb(10 20 60 / 0.05)",
    },
  }, bar);
  const urlText = ctx.el("span", { text: url }, pill);
  const content = ctx.el("div", { class: "abs", style: { left: 0, top: `${barH}px`, width: "1440px", height: "900px", overflow: "hidden" } }, root);
  ctx.gsap.set(root, { scale, transformOrigin: "0 0" });
  return { root, bar, content, url: urlText, scale, width, height: (900 + barH) * scale };
}

/* ---------- captions ---------- */

/**
 * Burned-in captions from the word timings, so both films work muted: the
 * line being spoken on a navy glass pill, words already said in white, the
 * word being said in sky blue, words to come dimmed.
 */
export function installCaptions(ctx) {
  const mobile = ctx.isMobile;
  const maxWords = mobile ? 6 : 9;
  const maxChars = mobile ? 30 : 52;
  const lines = [];
  for (const s of ctx.T.sentences) {
    const ws = ctx.T.words.filter((w) => w.sentence === s.i);
    let cur = [];
    const flush = () => { if (cur.length) lines.push(cur); cur = []; };
    ws.forEach((w, k) => {
      cur.push(w);
      const chars = cur.map((x) => x.word).join(" ").length;
      const punct = /[,…?.:]$/.test(w.word);
      const next = ws[k + 1];
      const nextChars = next ? chars + 1 + next.word.length : 0;
      if (cur.length >= maxWords || nextChars > maxChars || (punct && cur.length >= 3 && next && ws.length - k - 1 >= 2)) flush();
    });
    flush();
  }
  const spans = lines.map((line, k) => {
    const next = lines[k + 1];
    const from = line[0].start - 0.12;
    let to = line[line.length - 1].end + 0.45;
    if (next && next[0].start - 0.12 < to) to = next[0].start - 0.12;
    return { line, from, to };
  });

  /* Centred on y 1290 (mobile: above the TikTok and Reels overlays) or y 960 (desktop). */
  const box = ctx.el("div", { class: "captions", style: { top: mobile ? "1290px" : "960px", transform: "translateY(-50%)" } }, ctx.stage);
  const pill = ctx.el("div", { class: "pill", style: { fontSize: mobile ? "44px" : "34px" } }, box);
  let shown = -1;
  let nodes = [];
  ctx.onFrame((t) => {
    const hidden = ctx.captionGaps.some(([a, b]) => t >= a && t < b);
    const k = hidden ? -1 : spans.findIndex((s) => t >= s.from && t < s.to);
    if (k !== shown) {
      shown = k;
      pill.innerHTML = "";
      nodes = k < 0 ? [] : spans[k].line.map((w, i) => {
        const node = ctx.el("span", { class: "w", text: w.word }, pill);
        if (i < spans[k].line.length - 1) pill.appendChild(document.createTextNode(" "));
        return node;
      });
    }
    box.style.visibility = k < 0 ? "hidden" : "visible";
    if (k < 0) return;
    const s = spans[k];
    const a = ctx.progress(t, s.from, s.from + 0.14);
    const b = 1 - ctx.progress(t, s.to - 0.12, s.to);
    const o = Math.min(a, b);
    pill.style.opacity = String(o);
    pill.style.transform = `translateY(${(1 - a) * 14}px) scale(${0.97 + 0.03 * a})`;
    s.line.forEach((w, i) => {
      const cls = t >= w.end ? "w said" : t >= w.start - 0.02 ? "w now" : "w";
      if (nodes[i].className !== cls) nodes[i].className = cls;
    });
  });
  return { box, pill, lines: spans };
}

/* ---------- grain ---------- */

/**
 * A fine, seeded grain over everything, changing twelve times a second:
 * it keeps the navy gradients from banding in 8-bit video.
 */
export function installGrain(ctx, { opacity = 0.045, tiles = 6 } = {}) {
  const size = 256;
  const rand = ctx.random(20260930);
  const urls = [];
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  for (let k = 0; k < tiles; k += 1) {
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.round(rand() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    urls.push(canvas.toDataURL("image/png"));
  }
  const layer = ctx.el("div", { class: "grain", style: { opacity: String(opacity) } }, ctx.stage);
  const faces = urls.map((u) => ctx.el("div", { class: "fill", style: { backgroundImage: `url(${u})`, backgroundSize: `${size}px ${size}px`, visibility: "hidden" } }, layer));
  let on = -1;
  ctx.onFrame((t) => {
    const k = Math.floor(t * 12) % tiles;
    if (k !== on) {
      if (on >= 0) faces[on].style.visibility = "hidden";
      faces[k].style.visibility = "visible";
      on = k;
    }
  });
  return layer;
}

/* ---------- the spine's question cards ---------- */

/**
 * A glass question card that turns over to its answer (the films' spine:
 * three doubts in frame one, each answered later). Build it at a box
 * { x, y, w, h }; animate `root` (x, y, rotation, scale, opacity) and call
 * turn(t) to flip it to the answer. The back shows the verified mark when
 * `mark` is set.
 */
export function questionCard(ctx, parent, { q, a, box, mark = false, fontSize = null }) {
  const size = fontSize ?? Math.round(Math.min(box.h * 0.26, box.w * 0.075));
  const root = ctx.el("div", { class: "abs", style: { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, perspective: `${box.w * 3}px` } }, parent);
  const inner = ctx.el("div", { class: "abs", style: { inset: 0, transformStyle: "preserve-3d" } }, root);
  const face = (back) => ctx.el("div", {
    class: "abs glass-dark",
    style: {
      inset: 0, borderRadius: `${Math.round(box.h * 0.18)}px`, display: "flex", alignItems: "center", gap: `${Math.round(size * 0.5)}px`,
      padding: `0 ${Math.round(size * 1.1)}px`, backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : "none",
      font: `${back ? 600 : 600} ${back ? Math.round(size * 0.86) : size}px/1.16 Poppins, Inter, sans-serif`, letterSpacing: "-0.02em",
      ...(back ? { background: "linear-gradient(150deg, rgb(0 105 254 / 0.9), rgb(0 63 152 / 0.92))", border: "1.5px solid rgb(143 211 255 / 0.55)" } : {}),
    },
  }, inner);
  const front = face(false);
  front.textContent = q;
  const back = face(true);
  if (mark) ctx.img("/repo/assets/icons/ui/verified-badge.svg", { style: { width: `${Math.round(size * 1.3)}px`, height: `${Math.round(size * 1.3)}px`, flex: "none", filter: "brightness(0) invert(1)" } }, back);
  ctx.el("span", { text: a }, back);
  return {
    root,
    inner,
    front,
    back,
    /** Turns the card over to its answer at t (0.6 s, with a soft pop). */
    turn(t, { sound = "pop", gain = -8 } = {}) {
      ctx.tl.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 0.62, ease: "back.out(1.4)" }, t);
      if (sound) ctx.sfx(sound, t + 0.18, { gain });
    },
  };
}
