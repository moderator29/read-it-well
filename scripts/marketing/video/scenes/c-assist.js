/**
 * ROWS 32 to 34: THE ASSISTANT (72.69 to 79.62), both films. STORYBOARD v3.1.
 *
 * 32  A huge "?" drops into WORDS, then shrinks and slides into the caret of
 *     the assistant's input (lifted off the screen on mobile, the window's
 *     own field echoed large on desktop) as the phone (window) rises.
 * 33  The real question types in and is sent; the screen becomes the real
 *     answer on light (assistant-caution-2-lt), revealed top to bottom;
 *     "Prices", "Areas" and "How renting works" land as plain type beside it.
 * 34  The answer rests; the phone (window) leaves by 78.9; the ground falls to
 *     night and the stars come out; the cut to the wall is on the beat, 79.62.
 */
import { orb, press, browserWindow } from "../engine/components.js";
import { track, ramp, spring, during, place, dispToStage, screenImage, measure, SHADOW, mix } from "./c-kit.js";

const QUESTION = "What is a caution deposit?";

export async function buildAssist(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const tSend = ctx.beat(131.4); // the send press (75.81)
  const tBubble = tSend + 0.05;
  const typeFrom = K.r33 + 0.08;
  const typeTo = K.prices + 0.36;
  const leave = [ctx.beat(135.9), ctx.beat(136.6)]; // the phone leaves: 78.40 to 78.81
  const night = [ctx.beat(136.3), ctx.beat(137.7)]; // the ground falls to night: 78.63 to 79.44
  const revealFrom = tBubble + 0.1;
  const revealTo = K.renting - 0.05;

  /* ================= the ground: light, then night after the phone leaves ================= */
  const sky = ctx.scene("c32-sky", K.r32 - 0.3, K.r35 + 0.02, { z: 1 });
  ctx.el("div", { class: "fill", style: { background: `radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.07) 0%, rgb(0 105 254 / 0) 70%), linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)` } }, sky);
  /* night falls from the top: a tall navy curtain with a long soft edge */
  const curtain = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H * 2}px`, background: "linear-gradient(180deg, #000a2e 0%, #02063f 32%, #010118 50%, rgb(2 6 63 / 0.85) 62%, rgb(2 6 63 / 0.35) 80%, rgb(2 6 63 / 0) 100%)" } }, sky);
  const glowN = ctx.el("div", { class: "fill", style: { opacity: 0, background: "radial-gradient(70% 42% at 50% 40%, rgb(0 105 254 / 0.28) 0%, rgb(0 105 254 / 0) 70%)" } }, sky);
  const stars = [];
  {
    const rand = ctx.random(3401);
    const n = M ? 34 : 44;
    for (let i = 0; i < n; i += 1) {
      const x = 30 + rand() * (ctx.W - 60);
      const y = 30 + rand() * ctx.H * 0.66;
      const s = 1.6 + rand() * rand() * 3;
      const node = ctx.el("div", { class: "abs", style: { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, width: `${s.toFixed(2)}px`, height: `${s.toFixed(2)}px`, borderRadius: "50%", background: rand() < 0.3 ? "#cfe8ff" : "#ffffff", opacity: 0 } }, sky);
      stars.push({ node, t: night[0] + 0.25 + rand() * 0.55, ph: rand() * 6.28, sp: 1.5 + rand() * 2.5 });
    }
  }
  ctx.sfx("sparkle", ctx.beat(137), { offset: -4 });
  during(ctx, K.r32 - 0.3, K.r35 + 0.02, (t) => {
    const n = ramp(ctx, t, night[0], night[1], "power2.inOut");
    curtain.style.transform = `translateY(${(-ctx.H * 2 + n * ctx.H * 2).toFixed(1)}px)`;
    curtain.style.visibility = n > 0 ? "" : "hidden";
    glowN.style.opacity = ramp(ctx, t, night[1] - 0.3, night[1] + 0.1).toFixed(3);
    for (const s of stars) {
      const on = ramp(ctx, t, s.t, s.t + 0.4, "power2.out");
      s.node.style.opacity = on > 0 ? (on * (0.6 + 0.4 * Math.sin(t * s.sp + s.ph) ** 2)).toFixed(3) : "0";
    }
  });

  /* ================= the "?" ================= */
  const qScene = ctx.scene("c32-q", K.r32 - 0.3, K.r33 + 0.05, { z: 10 });
  const qSize = M ? 700 : 620;
  const q = ctx.el("div", {
    class: "abs c-display-800",
    text: "?",
    style: {
      left: "0px", top: "0px", fontSize: `${qSize}px`, lineHeight: "1", padding: "0 0.05em",
      background: "linear-gradient(165deg, #8fd3ff 0%, #3d8bff 34%, #0069fe 60%, #003f98 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    },
  }, qScene);
  ctx.sfx("pop_low", K.r32, { offset: -2 });
  ctx.sfx("whoosh_short", K.questionEnd - 0.03, { offset: -4 });

  let caret; // stage position of the caret, where the "?" ends
  let sendAt; // stage position of the send button
  const shownText = (t) => QUESTION.slice(0, Math.round(QUESTION.length * ramp(ctx, t, typeFrom, typeTo, "none")));
  const caretBlink = (t) => (t < typeFrom || (t > typeTo && t < tSend) ? (Math.floor((t - K.questionEnd) * 2.2) % 2 === 0 ? 1 : 0) : 1);
  for (let i = 0; i < 10; i += 1) ctx.sfx(`type_key_${(i % 6) + 1}`, typeFrom + ((typeTo - typeFrom) * (i + 0.5)) / 10, { offset: -6 });
  ctx.sfx("bubble_send", tBubble, { offset: -2 });

  /* the input bar as the product draws it (assistant-lt, display x 48-1271,
     y 2643-2820), rebuilt at scale k: field, sparkle, text, send button */
  const inputBar = (parent, k) => {
    const w = (1271 - 48) * k;
    const h = (2820 - 2643) * k;
    const body = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px` } }, parent);
    const field = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${(1080 - 48) * k}px`, height: `${h}px`, borderRadius: `${40 * k}px`, background: "#ebebe7", border: `${Math.max(1.5, 3 * k).toFixed(1)}px solid #d9dcd7`, boxShadow: SHADOW.light } }, body);
    const spark = ctx.el("div", { class: "abs", style: { left: `${(100 - 48) * k}px`, top: `${(h - 58 * k) / 2}px`, color: "#0a5ad4" } }, field);
    ctx.icon("sparkle", { size: Math.round(58 * k), stroke: 2.2 }, spark);
    const row = ctx.el("div", { class: "abs", style: { left: `${(185 - 48) * k}px`, top: "0px", height: `${h}px`, display: "flex", alignItems: "center", font: `400 ${(46 * k).toFixed(1)}px/1 Inter, sans-serif`, letterSpacing: "-0.005em", whiteSpace: "nowrap" } }, field);
    const ph = ctx.el("span", { text: "Type your message", style: { color: "rgb(104 112 126)" } }, row);
    const typed = ctx.el("span", { text: "", style: { color: "#0b1230", fontWeight: "500" } }, row);
    const car = ctx.el("span", { style: { display: "inline-block", width: `${Math.max(2, 4 * k).toFixed(1)}px`, height: `${(56 * k).toFixed(1)}px`, marginLeft: "2px", background: "var(--electric)", borderRadius: "2px" } }, row);
    const send = ctx.el("div", { class: "abs", style: { left: `${(1105 - 48) * k}px`, top: `${(h - 166 * k) / 2}px`, width: `${166 * k}px`, height: `${166 * k}px`, borderRadius: "50%", background: "#eef2f8", border: `${Math.max(1.5, 3 * k).toFixed(1)}px solid #dce4ee`, display: "grid", placeItems: "center", color: "rgb(145 160 180)", boxShadow: SHADOW.light } }, body);
    ctx.icon("arrow-up", { size: Math.round(62 * k), stroke: 2.2 }, send);
    return { body, w, h, ph, typed, car, send, caretX: (185 - 48) * k + 3, sendX: (1105 - 48 + 83) * k };
  };
  const drawInput = (bar, t) => {
    const txt = shownText(t);
    bar.typed.textContent = t < tBubble ? txt : "";
    bar.ph.style.display = txt.length > 0 && t < tBubble ? "none" : "";
    bar.car.style.opacity = t < K.questionEnd + 0.6 || t >= tSend ? "0" : String(caretBlink(t));
    const lit = ramp(ctx, t, tSend - 0.02, tSend + 0.06) * (1 - ramp(ctx, t, tSend + 0.2, tSend + 0.4));
    bar.send.style.background = lit > 0.01 ? `rgb(${mix(238, 0, lit).toFixed(0)} ${mix(242, 105, lit).toFixed(0)} ${mix(248, 254, lit).toFixed(0)})` : "#eef2f8";
    bar.send.style.color = lit > 0.5 ? "#ffffff" : "rgb(145 160 180)";
  };

  if (M) {
    /* PHONE_HIGH moved right (v3.1: side content moves the phone to cx 640) */
    const P = { ...L.PHONE_HIGH, cx: 640 };
    const p = S.light;
    const at = (x, y) => dispToStage(P, x, y);
    const lt = screenImage(ctx, p, "assistant-lt");
    const ans = screenImage(ctx, p, "assistant-caution-2-lt");
    ctx.onFrame((t) => {
      /* runs on every frame: the phone outlives these rows */
      const on = t >= K.r32 + 0.5 && t < K.r35 + 0.02;
      const r = ramp(ctx, t, revealFrom, revealTo, "power1.inOut");
      lt.style.visibility = on && r < 1 ? "" : "hidden";
      ans.style.visibility = on && r > 0 ? "" : "hidden";
      /* the answer streams in: a soft edge moving down the screen */
      const edge = -6 + r * 112;
      const mask = r >= 1 ? "none" : `linear-gradient(180deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 6).toFixed(2)}%)`;
      ans.style.maskImage = mask;
      ans.style.webkitMaskImage = mask;
    });
    /* the phone rises around the "?" into PHONE_HIGH, holds, and leaves by 78.9 */
    p.poses.push({
      t0: K.r32 + 0.5, t1: leave[1] + 0.02,
      fn: (t) => ({
        cx: P.cx, height: P.height, fov: 24, rz: 0,
        cy: track(ctx, t, [[K.questionEnd - 0.05, P.cy + 1250], [K.questionEnd + 0.72, P.cy, "land"], [leave[0], P.cy], [leave[1], P.cy + 1350, "leave"]]),
        rx: track(ctx, t, [[K.questionEnd - 0.05, 16], [K.questionEnd + 0.8, 0, "land"], [leave[0], 0], [leave[1], 14, "leave"]]),
        ry: track(ctx, t, [[K.questionEnd - 0.05, 8], [K.questionEnd + 0.8, 0, "land"], [leave[0], 0], [leave[1], -6, "leave"]]),
        opacity: 1 - ramp(ctx, t, leave[1] - 0.12, leave[1]),
      }),
    });

    /* the input, lifted off the screen over the phone's empty lower half */
    const k = 880 / (1271 - 48);
    const inputScene = ctx.scene("c32-input", K.r32 + 0.8, tBubble + 0.5, { z: 8 });
    const bar = inputBar(inputScene, k);
    const home = { x: 560, y: 1004 };
    const onScreen = at((48 + 1271) / 2, (2643 + 2820) / 2);
    const sScreen = onScreen.s / k;
    caret = { x: home.x - bar.w / 2 + bar.caretX, y: home.y };
    sendAt = { x: home.x - bar.w / 2 + bar.sendX, y: home.y };
    const liftFrom = K.questionEnd + 0.2;
    const liftTo = K.questionEnd + 0.62;
    during(ctx, K.r32 + 0.8, tBubble + 0.5, (t) => {
      const up = ramp(ctx, t, liftFrom, liftTo, "land");
      const down = ramp(ctx, t, tBubble + 0.04, tBubble + 0.42, "power3.inOut");
      const u = up * (1 - down);
      place(bar.body, { x: mix(onScreen.x, home.x, u), y: mix(onScreen.y, home.y, u), s: mix(sScreen, 1, u), o: Math.min(1, up * 4) * (1 - ramp(ctx, t, tBubble + 0.3, tBubble + 0.42)) });
      bar.body.firstChild.style.boxShadow = u > 0.2 ? SHADOW.light : "none";
      bar.send.style.boxShadow = u > 0.2 ? SHADOW.light : "none";
      drawInput(bar, t);
    });
    /* the question flies from the field into its bubble in the thread */
    const b0 = at(516, 596);
    const b1 = at(1140, 800);
    const bubbleTo = { x: (b0.x + b1.x) / 2, y: (b0.y + b1.y) / 2, w: b1.x - b0.x };
    const fly = ctx.el("div", {
      class: "abs",
      text: QUESTION,
      style: {
        left: "0px", top: "0px", padding: "0.7em 1em", borderRadius: "0.9em", whiteSpace: "nowrap", visibility: "hidden",
        font: `500 ${(46 * k).toFixed(1)}px/1.2 Inter, sans-serif`, color: "#fff", background: "linear-gradient(180deg, #1f7dff, #0056e0)", boxShadow: SHADOW.light,
      },
    }, inputScene);
    during(ctx, K.r32 + 0.8, tBubble + 0.5, (t) => {
      const u = ramp(ctx, t, tBubble, tBubble + 0.34, "power3.inOut");
      const w0 = fly.offsetWidth;
      place(fly, { x: mix(caret.x + w0 / 2 - 6, bubbleTo.x, u), y: mix(home.y, bubbleTo.y, u) - Math.sin(u * Math.PI) * 50, s: mix(1, bubbleTo.w / w0, u), o: (t >= tBubble ? 1 : 0) * (1 - ramp(ctx, t, tBubble + 0.34, tBubble + 0.46)) });
    });
    /* the pointer presses send */
    const ptr = orb(ctx, inputScene, { size: 44 });
    during(ctx, K.r32 + 0.8, tBubble + 0.5, (t) => {
      const x = track(ctx, t, [[tSend - 0.45, sendAt.x + 90], [tSend - 0.06, sendAt.x, "glide"], [tSend + 0.4, sendAt.x + 120, "power2.in"]]);
      const y = track(ctx, t, [[tSend - 0.45, sendAt.y + 150], [tSend - 0.06, sendAt.y - 12, "glide"], [tSend + 0.4, sendAt.y + 160, "power2.in"]]);
      const o = ramp(ctx, t, tSend - 0.45, tSend - 0.3) * (1 - ramp(ctx, t, tSend + 0.16, tSend + 0.36));
      ptr.style.left = `${(x - 22).toFixed(2)}px`;
      ptr.style.top = `${(y - 22).toFixed(2)}px`;
      ptr.style.opacity = o.toFixed(3);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
    });
    press(ctx, ptr, tSend, { sound: "tap", offset: 0, ring: false });
  } else {
    /* Desktop: the window at WINDOW_LEFT, the field echoed large in
       RIGHT_PANEL; after the send the camera pushes in to hero scale on the answer. */
    const W = L.WINDOW_LEFT;
    const winScene = ctx.scene("c32-win", K.r32 + 0.5, K.r35 + 0.02, { z: 4 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "light" });
    const lt = ctx.img(ctx.src.capture("d-assistant-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const ans = ctx.img(ctx.src.capture("d-assistant-caution-2-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", visibility: "hidden" } }, win.content);
    const fieldCover = ctx.el("div", { class: "abs", style: { left: "648px", top: "838px", width: "380px", height: "34px", background: "#ebebe7" } }, win.content);
    const fieldText = ctx.el("div", { class: "abs", style: { left: "654px", top: "843px", font: "500 17px/24px Inter, sans-serif", color: "#0b1230", whiteSpace: "nowrap" } }, win.content);
    const fieldCaret = ctx.el("div", { class: "abs", style: { left: "654px", top: "845px", width: "2px", height: "20px", background: "var(--electric)" } }, win.content);
    const s0 = W.width / 1440;
    const s1 = 1600 / 1440; // hero scale, 1.111
    const focus = { x: 924, y: 318 };
    const pushTo = { x: 800 - focus.x * s1, y: 530 - (56 + focus.y) * s1 };
    const pose = (t) => {
      const rise = ramp(ctx, t, K.questionEnd - 0.05, K.questionEnd + 0.75, "land");
      const push = ramp(ctx, t, tBubble + 0.05, tBubble + 1.15, "power3.inOut");
      const out = ramp(ctx, t, leave[0], leave[1], "leave");
      return { x: mix(W.x, pushTo.x, push), y: mix(W.y + 900 * (1 - rise), pushTo.y, push) + out * 1100, s: mix(s0, s1, push), o: Math.min(1, rise * 3) * (1 - ramp(ctx, t, leave[1] - 0.1, leave[1])) };
    };
    const C = (cx, cy, t) => { const q2 = pose(t); return { x: q2.x + cx * q2.s, y: q2.y + (56 + cy) * q2.s }; };
    caret = C(655, 855, K.questionEnd + 0.8);
    sendAt = C(1251, 855, K.questionEnd + 0.8);
    during(ctx, K.r32 + 0.5, K.r35 + 0.02, (t) => {
      const { x, y, s, o } = pose(t);
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(5)})`;
      win.root.style.opacity = o.toFixed(4);
      win.root.style.visibility = o > 0.001 ? "" : "hidden";
      const r = ramp(ctx, t, revealFrom, revealTo, "power1.inOut");
      lt.style.visibility = r < 1 ? "" : "hidden";
      ans.style.visibility = r > 0 ? "" : "hidden";
      const edge = -6 + r * 112;
      const mask = r >= 1 ? "none" : `linear-gradient(180deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 6).toFixed(2)}%)`;
      ans.style.maskImage = mask;
      ans.style.webkitMaskImage = mask;
      const txt = shownText(t);
      const showTyped = t < tBubble;
      fieldCover.style.visibility = showTyped && txt.length > 0 ? "" : "hidden";
      fieldText.textContent = showTyped ? txt : "";
      fieldCaret.style.left = `${654 + (showTyped ? fieldText.offsetWidth : 0) + 1}px`;
      fieldCaret.style.opacity = t < K.questionEnd + 0.7 || t >= tSend ? "0" : String(caretBlink(t));
    });
    /* the echo: the field, large, in RIGHT_PANEL */
    const R = L.RIGHT_PANEL;
    const bar = inputBar(winScene, (R.w - 40) / (1271 - 48));
    const echoHome = { x: R.x + R.w / 2, y: R.y + 300 };
    during(ctx, K.r32 + 0.5, K.r35 + 0.02, (t) => {
      const up = ramp(ctx, t, K.questionEnd + 0.4, K.questionEnd + 0.85, "land");
      const out = ramp(ctx, t, tBubble + 0.02, tBubble + 0.36, "power2.in");
      place(bar.body, { x: echoHome.x, y: echoHome.y + (1 - up) * 40 - out * 30, s: 0.94 + 0.06 * up, o: up * (1 - out) });
      drawInput(bar, t);
    });
    /* the pointer clicks the window's send button */
    const ptr = orb(ctx, winScene, { size: 40 });
    during(ctx, K.r32 + 0.5, K.r35 + 0.02, (t) => {
      const x = track(ctx, t, [[tSend - 0.55, sendAt.x + 260], [tSend - 0.06, sendAt.x, "glide"], [tSend + 0.5, sendAt.x + 300, "power2.in"]]);
      const y = track(ctx, t, [[tSend - 0.55, sendAt.y - 120], [tSend - 0.06, sendAt.y, "glide"], [tSend + 0.5, sendAt.y + 80, "power2.in"]]);
      const o = ramp(ctx, t, tSend - 0.55, tSend - 0.4) * (1 - ramp(ctx, t, tSend + 0.2, tSend + 0.45));
      ptr.style.left = `${(x - 20).toFixed(2)}px`;
      ptr.style.top = `${(y - 20).toFixed(2)}px`;
      ptr.style.opacity = o.toFixed(3);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
    });
    press(ctx, ptr, tSend, { ringParent: winScene, x: sendAt.x, y: sendAt.y, sound: "tap", offset: 0 });
  }

  /* ================= the "?": drop into WORDS, hold, into the caret ================= */
  {
    const centre = M ? { x: 540, y: L.WORDS.y + L.WORDS.h / 2 } : { x: 960, y: 500 };
    const land = K.r32 + 0.04;
    const toCaret = [K.questionEnd - 0.03, K.questionEnd + 0.72];
    const inkH = qSize * 0.72;
    const caretH = M ? 30 : 20;
    during(ctx, K.r32 - 0.3, K.r33 + 0.05, (t) => {
      const drop = ramp(ctx, t, K.r32 - 0.26, land, "power2.in");
      const kick = spring(t, land, { freq: 2.2, decay: 6.5 });
      const u = ramp(ctx, t, toCaret[0], toCaret[1], "power3.inOut");
      const x = mix(centre.x, caret.x, u);
      const y = mix(mix(centre.y - (M ? 1400 : 1000), centre.y, drop), caret.y, ramp(ctx, t, toCaret[0], toCaret[1], "power2.in"));
      const s = mix(1, caretH / inkH, ramp(ctx, t, toCaret[0], toCaret[1], "power3.in"));
      const thin = ramp(ctx, t, toCaret[1] - 0.14, toCaret[1], "power2.in");
      const bob = 5 * Math.sin((t - land) * 2.6) * ramp(ctx, t, land, land + 0.3) * (1 - u);
      place(q, { x, y: y + bob, sx: s * (1 + 0.06 * kick) * (1 - 0.9 * thin), sy: s * (1 - 0.08 * kick), o: drop > 0 ? 1 - ramp(ctx, t, toCaret[1] - 0.04, toCaret[1]) : 0 });
    });
  }

  /* ================= the topics, as plain type beside the device ================= */
  const words = ctx.scene("c33-words", K.r33, K.r34 + 1.3, { z: 9 });
  {
    const size = M ? 54 : 60;
    const items = M
      ? [
        { lines: ["Prices"], t: K.prices, anchor: "right", x: 382, y: 612 },
        { lines: ["Areas"], t: K.areas, anchor: "right", x: 382, y: 704 },
        { lines: ["How renting", "works"], t: K.renting, anchor: "right", x: 382, y: 826 },
      ]
      : [
        { lines: ["Prices"], t: K.prices, anchor: "left", x: 1450, y: 400 },
        { lines: ["Areas"], t: K.areas, anchor: "left", x: 1450, y: 500 },
        { lines: ["How renting", "works"], t: K.renting, anchor: "left", x: 1450, y: 620 },
      ];
    const nodes = items.map((it) => {
      const s = it.lines.length > 1 ? Math.round(size * (M ? 0.86 : 0.9)) : size;
      const n = ctx.el("div", { class: "abs c-display", style: { left: "0px", top: "0px", fontSize: `${s}px`, lineHeight: "1.06", color: "#0b1230", whiteSpace: "nowrap", textAlign: it.anchor } }, words);
      it.lines.forEach((ln, i) => { if (i) n.appendChild(document.createElement("br")); n.appendChild(document.createTextNode(ln)); });
      return { ...it, n, w: Math.max(...it.lines.map((ln) => measure(ln, `700 ${s}px "C Poppins"`))) };
    });
    if (M) ctx.hideCaptions(K.prices - 0.13, K.works - 0.13);
    during(ctx, K.r33, K.r34 + 1.3, (t) => {
      nodes.forEach((it, i) => {
        const inU = ramp(ctx, t, it.t - 0.08, it.t + 0.38, "land");
        const outU = ramp(ctx, t, leave[0] - 0.1 + i * 0.04, leave[0] + 0.2 + i * 0.04, "power2.in");
        const cx = it.anchor === "right" ? it.x - it.w / 2 : it.x + it.w / 2;
        /* each word slides out from the device's side */
        const dx = M ? 50 : -50;
        place(it.n, { x: cx + dx * (1 - inU), y: it.y - outU * 30, o: Math.min(1, inU * 2) * (1 - outU) });
      });
    });
  }
}
