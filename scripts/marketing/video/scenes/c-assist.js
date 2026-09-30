/**
 * ROWS 32 to 34: THE ASSISTANT (72.69 to 79.62), both films.
 *
 * 32  A huge "?" drops to the centre, then shrinks and slides into the caret
 *     of the assistant's input bar (lifted off the screen on mobile, the
 *     window's own field on desktop) as the phone (window) rises around it.
 * 33  The real question types in and is sent; the screen becomes the real
 *     answer (assistant-caution-2), revealed top to bottom; the ground dims
 *     toward evening; three topic chips light as they are named; the
 *     product's own assistant robot peeks from behind the device.
 * 34  The answer rests; the sky goes from day to night and the stars come
 *     out; the robot nods. A cut on the beat at 79.62 to the pill wall.
 */
import { orb, press, tap, browserWindow } from "../engine/components.js";
import { track, ramp, spring, during, place, chip, dispToStage, screenImage, SHADOW, mix } from "./c-kit.js";

const QUESTION = "What is a caution deposit?";

export async function buildAssist(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const tSend = ctx.beat(131.4); // the send press (75.81)
  const tBubble = tSend + 0.05;
  const typeFrom = K.r33 + 0.08;
  const typeTo = K.prices + 0.36;
  const nightFrom = K.r34;
  const nightTo = K.r34 + 2.0;

  /* ================= the sky: mist, then evening, then night ================= */
  const skyScene = ctx.scene("c32-sky", K.r32 - 0.3, K.r35 + 0.02, { z: 1 });
  ctx.el("div", { class: "fill", style: { background: `radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.07) 0%, rgb(0 105 254 / 0) 70%), linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)` } }, skyScene);
  const evening = ctx.el("div", { class: "fill", style: { opacity: 0, background: "linear-gradient(180deg, #c9d3ee 0%, #d9d6ec 52%, #ecd3cf 100%)" } }, skyScene);
  const nightL = ctx.el("div", { class: "fill", style: { opacity: 0, background: "radial-gradient(70% 42% at 50% 38%, rgb(0 105 254 / 0.3) 0%, rgb(0 105 254 / 0) 70%), linear-gradient(180deg, #000a2e 0%, #02063f 50%, #010118 100%)" } }, skyScene);
  const dusk = ctx.el("div", { class: "fill", style: { opacity: 0, background: "radial-gradient(90% 32% at 50% 104%, rgb(255 138 80 / 0.55) 0%, rgb(255 178 122 / 0.18) 45%, rgb(255 178 122 / 0) 75%)" } }, skyScene);
  /* stars: seeded dots in the upper sky, twinkling */
  const stars = [];
  {
    const rand = ctx.random(3401);
    const n = M ? 46 : 60;
    for (let i = 0; i < n; i += 1) {
      const x = rand() * ctx.W;
      const y = rand() * ctx.H * (M ? 0.62 : 0.7);
      const s = 1.6 + rand() * rand() * 3.4;
      const node = ctx.el("div", { class: "abs", style: { left: `${x.toFixed(1)}px`, top: `${y.toFixed(1)}px`, width: `${s.toFixed(2)}px`, height: `${s.toFixed(2)}px`, borderRadius: "50%", background: rand() < 0.3 ? "#cfe8ff" : "#ffffff", boxShadow: s > 3 ? "0 0 6px 1px rgb(160 210 255 / 0.55)" : "none", opacity: 0 } }, skyScene);
      stars.push({ node, t: nightFrom + 0.7 + rand() * 1.1, ph: rand() * 6.28, sp: 1.5 + rand() * 2.5 });
    }
  }
  ctx.sfx("sparkle", ctx.beat(137), { offset: -4 });
  during(ctx, K.r32 - 0.3, K.r35 + 0.02, (t) => {
    const ev = ramp(ctx, t, tBubble, tBubble + 1.1, "power1.inOut");
    const nt = ramp(ctx, t, nightFrom, nightTo, "sine.inOut");
    evening.style.opacity = (0.8 * ev * (1 - nt)).toFixed(4);
    dusk.style.opacity = (Math.sin(Math.PI * Math.min(1, nt * 1.2)) * 0.9 + ev * 0.25 * (1 - nt)).toFixed(4);
    nightL.style.opacity = nt.toFixed(4);
    for (const s of stars) {
      const on = ramp(ctx, t, s.t, s.t + 0.5, "power2.out");
      s.node.style.opacity = on > 0 ? (on * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph) ** 2)).toFixed(3) : "0";
    }
  });

  /* ================= the "?" ================= */
  const qScene = ctx.scene("c32-q", K.r32 - 0.3, K.r33 + 0.05, { z: 10 });
  const q = ctx.el("div", {
    class: "abs c-display-800",
    text: "?",
    style: {
      left: "0px", top: "0px", fontSize: M ? "980px" : "820px", lineHeight: "1", padding: "0 0.05em",
      background: "linear-gradient(165deg, #8fd3ff 0%, #3d8bff 34%, #0069fe 60%, #003f98 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    },
  }, qScene);
  ctx.sfx("pop_low", K.r32, { offset: -2 });
  ctx.sfx("whoosh_short", K.questionEnd - 0.03, { offset: -4 });

  /* ================= the device: phone (mobile) or window (desktop) ================= */
  let caret; // stage position of the caret, where the "?" ends
  let typed = []; // text nodes that show the question as it types
  let setScreens; // (t) -> screen layers
  let sendAt; // stage position of the send button
  const shownText = (t) => QUESTION.slice(0, Math.round(QUESTION.length * ramp(ctx, t, typeFrom, typeTo, "none")));

  /* key clicks while typing */
  for (let i = 0; i < 10; i += 1) ctx.sfx(`type_key_${(i % 6) + 1}`, typeFrom + ((typeTo - typeFrom) * (i + 0.5)) / 10, { offset: -6 });

  if (M) {
    const P = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
    const p = S.light;
    const lt = screenImage(ctx, p, "assistant-lt");
    const dk = screenImage(ctx, p, "assistant");
    const ans = screenImage(ctx, p, "assistant-caution-2");
    const revealFrom = tBubble + 0.1;
    const revealTo = K.renting - 0.05;
    setScreens = (t) => {
      const on = t >= K.r32 + 0.5 && t < K.r35 + 0.02;
      const x = ramp(ctx, t, tBubble, tBubble + 0.3, "power1.inOut");
      lt.style.visibility = on && x < 1 ? "" : "hidden";
      dk.style.visibility = on && x > 0 ? "" : "hidden";
      dk.style.opacity = x.toFixed(4);
      const r = ramp(ctx, t, revealFrom, revealTo, "power1.inOut");
      ans.style.visibility = on && r > 0 ? "" : "hidden";
      /* the answer streams in: a soft edge moving down the screen */
      const edge = -6 + r * 112;
      ans.style.maskImage = r >= 1 ? "none" : `linear-gradient(180deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 6).toFixed(2)}%)`;
      ans.style.webkitMaskImage = ans.style.maskImage;
      const dark = x > 0.5;
      p.frame.style.background = dark ? "#01031b" : "#f3f4f1";
      p.screen.style.background = p.frame.style.background;
    };
    ctx.onFrame((t) => { if (t >= K.r32 - 0.1 && t < K.r35 + 0.1) setScreens(t); });

    /* the phone rises around the "?" into PHONE_HIGH and holds to the cut */
    p.poses.push({
      t0: K.r32 + 0.5, t1: K.r35 + 0.02,
      fn: (t) => ({
        cx: P.cx, height: P.height, fov: 24,
        cy: track(ctx, t, [[K.questionEnd - 0.05, P.cy + 1350], [K.questionEnd + 0.72, P.cy, "land"]]),
        rx: track(ctx, t, [[K.questionEnd - 0.05, 16], [K.questionEnd + 0.8, 0, "land"]]),
        ry: track(ctx, t, [[K.questionEnd - 0.05, 8], [K.questionEnd + 0.8, 0, "land"]]),
        rz: 0,
        opacity: 1,
      }),
    });

    /* the input bar, redrawn from assistant-lt (display x 48-1271, y 2643-2820) at 0.64 */
    const k = 0.64;
    const bar = { w: (1271 - 48) * k, h: (2820 - 2643) * k };
    const home = { x: 540, y: 944 };
    const inScreen = dispToStage(P, (48 + 1271) / 2, (2643 + 2820) / 2);
    const bodyScene = ctx.scene("c32-input", K.r32 + 0.8, tBubble + 0.5, { z: 8 });
    const body = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${bar.w}px`, height: `${bar.h}px` } }, bodyScene);
    const field = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${(1080 - 48) * k}px`, height: `${bar.h}px`, borderRadius: `${40 * k}px`, background: "#ebebe7", border: "2px solid #d9dcd7", boxShadow: SHADOW.light } }, body);
    const spark = ctx.el("div", { class: "abs", style: { left: `${(100 - 48) * k}px`, top: `${(bar.h - 58 * k) / 2}px`, color: "#0a5ad4" } }, field);
    ctx.icon("sparkle", { size: Math.round(58 * k), stroke: 2.2 }, spark);
    const textRow = ctx.el("div", { class: "abs", style: { left: `${(185 - 48) * k}px`, top: "0px", height: `${bar.h - 4}px`, display: "flex", alignItems: "center", font: `400 ${Math.round(46 * k)}px/1 Inter, sans-serif`, letterSpacing: "-0.005em", whiteSpace: "nowrap" } }, field);
    const placeholder = ctx.el("span", { text: "Type your message", style: { color: "rgb(104 112 126)" } }, textRow);
    const typedEl = ctx.el("span", { text: "", style: { color: "#0b1230", fontWeight: "500" } }, textRow);
    const caretEl = ctx.el("span", { style: { display: "inline-block", width: "3px", height: `${Math.round(40 * k)}px`, marginLeft: "2px", background: "var(--electric)", borderRadius: "2px" } }, textRow);
    const sendBtn = ctx.el("div", { class: "abs", style: { left: `${(1105 - 48) * k}px`, top: `${(bar.h - 166 * k) / 2}px`, width: `${166 * k}px`, height: `${166 * k}px`, borderRadius: "50%", background: "#eef2f8", border: "2px solid #dce4ee", display: "grid", placeItems: "center", color: "rgb(145 160 180)", boxShadow: SHADOW.light } }, body);
    ctx.icon("arrow-up", { size: Math.round(62 * k), stroke: 2.2 }, sendBtn);
    typed = [typedEl];
    caret = { x: home.x - bar.w / 2 + (185 - 48) * k + 4, y: home.y };
    sendAt = { x: home.x - bar.w / 2 + (1105 - 48 + 83) * k, y: home.y };
    const liftFrom = K.questionEnd + 0.2;
    const liftTo = K.questionEnd + 0.62;
    during(ctx, K.r32 + 0.8, tBubble + 0.5, (t) => {
      const up = ramp(ctx, t, liftFrom, liftTo, "land");
      const down = ramp(ctx, t, tBubble + 0.04, tBubble + 0.42, "power3.inOut");
      const s = mix(mix(0.4033 / k, 1, up), 0.4033 / k, down);
      const x = mix(mix(inScreen.x, home.x, up), inScreen.x, down);
      const y = mix(mix(inScreen.y, home.y, up), inScreen.y, down);
      place(body, { x, y, s, o: Math.min(1, up * 4) * (1 - ramp(ctx, t, tBubble + 0.3, tBubble + 0.42)) });
      const txt = shownText(t);
      typedEl.textContent = t < tBubble ? txt : "";
      placeholder.style.display = txt.length > 0 && t < tBubble ? "none" : "";
      const blink = t < typeFrom || (t > typeTo && t < tSend) ? (Math.floor((t - K.questionEnd) * 2.2) % 2 === 0 ? 1 : 0) : 1;
      caretEl.style.opacity = t < liftTo - 0.05 || t >= tSend ? "0" : String(blink);
      const lit = ramp(ctx, t, tSend - 0.02, tSend + 0.06) * (1 - ramp(ctx, t, tSend + 0.2, tSend + 0.4));
      sendBtn.style.background = lit > 0.01 ? `rgb(${mix(238, 0, lit).toFixed(0)} ${mix(242, 105, lit).toFixed(0)} ${mix(248, 254, lit).toFixed(0)})` : "#eef2f8";
      sendBtn.style.color = lit > 0.5 ? "#ffffff" : "rgb(145 160 180)";
    });

    /* the question flies from the field into its bubble in the thread */
    const bubbleTo = { x: (dispToStage(P, 516, 596).x + dispToStage(P, 1140, 800).x) / 2, y: (dispToStage(P, 516, 596).y + dispToStage(P, 1140, 800).y) / 2, w: (1140 - 516) * 0.4033, h: (800 - 596) * 0.4033 };
    const fly = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", padding: "0.62em 0.9em", borderRadius: "0.8em", whiteSpace: "nowrap",
        font: `500 ${Math.round(46 * k)}px/1.2 Inter, sans-serif`, color: "#fff",
        background: "linear-gradient(180deg, #1f7dff, #0056e0)", border: "2px solid rgb(143 211 255 / 0.7)", boxShadow: "0 0 30px -6px rgb(0 105 254 / 0.6)",
      },
      text: QUESTION,
    }, bodyScene);
    during(ctx, K.r32 + 0.8, tBubble + 0.5, (t) => {
      const u = ramp(ctx, t, tBubble, tBubble + 0.34, "power3.inOut");
      const w0 = fly.offsetWidth;
      const s = mix(1, bubbleTo.w / w0, u);
      const x = mix(caret.x + w0 / 2 - 6, bubbleTo.x, u);
      const y = mix(home.y, bubbleTo.y, u) - Math.sin(u * Math.PI) * 40;
      place(fly, { x, y, s, o: (t >= tBubble ? 1 : 0) * (1 - ramp(ctx, t, tBubble + 0.34, tBubble + 0.46)) });
    });
    ctx.sfx("bubble_send", tBubble, { offset: -2 });

    /* the pointer presses send */
    const ptr = orb(ctx, bodyScene, { size: 46 });
    during(ctx, tSend - 0.5, tSend + 0.5, (t) => {
      const x = track(ctx, t, [[tSend - 0.45, 1000], [tSend - 0.06, sendAt.x, "glide"], [tSend + 0.4, 1020, "power2.in"]]);
      const y = track(ctx, t, [[tSend - 0.45, 1110], [tSend - 0.06, sendAt.y - 14, "glide"], [tSend + 0.4, 1120, "power2.in"]]);
      const o = ramp(ctx, t, tSend - 0.45, tSend - 0.3) * (1 - ramp(ctx, t, tSend + 0.18, tSend + 0.4));
      ptr.style.left = `${(x - 23).toFixed(2)}px`;
      ptr.style.top = `${(y - 23).toFixed(2)}px`;
      ptr.style.opacity = o.toFixed(3);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
    });
    press(ctx, ptr, tSend, { sound: "tap", offset: 0, ring: false });
  } else {
    /* Desktop: the window at WINDOW_LEFT; after the send the camera pushes in on the answer. */
    const W = L.WINDOW_LEFT;
    const winScene = ctx.scene("c32-win", K.r32 + 0.5, K.r35 + 0.02, { z: 4 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com/assistant", theme: "light" });
    const darkBar = ctx.el("div", { class: "abs", style: { left: 0, top: 0, right: 0, height: "56px", opacity: 0, background: "linear-gradient(180deg, #151a3d, #10143a)", borderBottom: "1px solid rgb(120 170 255 / 0.14)", display: "flex", alignItems: "center", gap: "10px", padding: "0 20px" } }, win.root);
    for (const c of ["#ff5f57", "#febc2e", "#28c840"]) ctx.el("span", { style: { width: "14px", height: "14px", borderRadius: "50%", background: c, opacity: "0.9" } }, darkBar);
    const dpill = ctx.el("div", { style: { margin: "0 auto", transform: "translateX(-30px)", minWidth: "420px", height: "34px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", font: "500 16px/1 Inter, sans-serif", color: "rgb(255 255 255 / 0.78)", background: "rgb(255 255 255 / 0.07)" } }, darkBar);
    ctx.el("span", { text: "vallospaces.com/assistant" }, dpill);
    const lt = ctx.img(ctx.src.capture("d-assistant-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const dk = ctx.img(ctx.src.capture("d-assistant"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", opacity: 0 } }, win.content);
    const ans = ctx.img(ctx.src.capture("d-assistant-caution-2"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", visibility: "hidden" } }, win.content);
    /* the field's typed text over the capture's placeholder */
    const fieldCover = ctx.el("div", { class: "abs", style: { left: "648px", top: "838px", width: "360px", height: "34px", background: "#ebebe7" } }, win.content);
    const fieldText = ctx.el("div", { class: "abs", style: { left: "654px", top: "843px", font: "500 17px/24px Inter, sans-serif", color: "#0b1230", whiteSpace: "nowrap" } }, win.content);
    const fieldCaret = ctx.el("div", { class: "abs", style: { left: "654px", top: "845px", width: "2px", height: "20px", background: "var(--electric)" } }, win.content);
    typed = [fieldText];
    const revealFrom = tBubble + 0.1;
    const revealTo = K.renting - 0.05;
    /* the camera: WINDOW_LEFT, then a push onto the answer (content bbox x 608-1240, y 130-420) */
    const s0 = W.width / 1440;
    const s1 = 1.2;
    const focus = { x: 924, y: 275 };
    const pushTo = { x: 800 - focus.x * s1, y: 530 - (56 + focus.y) * s1 };
    const pose = (t) => {
      const rise = ramp(ctx, t, K.questionEnd - 0.05, K.questionEnd + 0.75, "land");
      const push = ramp(ctx, t, tBubble + 0.05, tBubble + 1.15, "power3.inOut");
      const s = mix(s0, s1, push);
      const x = mix(W.x, pushTo.x, push);
      const y = mix(W.y + 900 * (1 - rise), pushTo.y, push);
      return { x, y, s, o: Math.min(1, rise * 3) };
    };
    const C = (cx, cy, t) => { const q2 = pose(t); return { x: q2.x + cx * q2.s, y: q2.y + (56 + cy) * q2.s }; };
    caret = C(655, 855, K.questionEnd + 0.8);
    sendAt = C(1251, 855, K.questionEnd + 0.8);
    during(ctx, K.r32 + 0.5, K.r35 + 0.02, (t) => {
      const { x, y, s, o } = pose(t);
      win.root.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(5)})`;
      win.root.style.opacity = o.toFixed(4);
      win.root.style.visibility = o > 0.001 ? "" : "hidden";
      const xf = ramp(ctx, t, tBubble, tBubble + 0.3, "power1.inOut");
      dk.style.opacity = xf.toFixed(4);
      darkBar.style.opacity = xf.toFixed(4);
      lt.style.visibility = xf < 1 ? "" : "hidden";
      const r = ramp(ctx, t, revealFrom, revealTo, "power1.inOut");
      ans.style.visibility = r > 0 ? "" : "hidden";
      const edge = -6 + r * 112;
      ans.style.maskImage = r >= 1 ? "none" : `linear-gradient(180deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 6).toFixed(2)}%)`;
      ans.style.webkitMaskImage = ans.style.maskImage;
      const txt = shownText(t);
      const showTyped = t < tBubble;
      fieldCover.style.visibility = showTyped && txt.length > 0 ? "" : "hidden";
      fieldText.textContent = showTyped ? txt : "";
      fieldCaret.style.left = `${654 + (showTyped ? fieldText.offsetWidth : 0) + 1}px`;
      const blink = t < typeFrom || (t > typeTo && t < tSend) ? (Math.floor((t - K.questionEnd) * 2.2) % 2 === 0 ? 1 : 0) : 1;
      fieldCaret.style.opacity = t < K.questionEnd + 0.7 || t >= tSend ? "0" : String(blink);
    });

    /* the echo: the field, large, in RIGHT_PANEL */
    const R = L.RIGHT_PANEL;
    const echo = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", width: `${R.w - 40}px`, height: "112px", borderRadius: "28px", background: "#ebebe7", border: "2px solid #d9dcd7",
        boxShadow: SHADOW.light, display: "flex", alignItems: "center", gap: "18px", padding: "0 20px 0 30px",
      },
    }, winScene);
    const eIcon = ctx.el("div", { style: { color: "#0a5ad4", display: "grid", placeItems: "center" } }, echo);
    ctx.icon("sparkle", { size: 36, stroke: 2.2 }, eIcon);
    const eText = ctx.el("div", { style: { flex: "1", font: "500 32px/1 Inter, sans-serif", color: "#0b1230", whiteSpace: "nowrap", overflow: "hidden" } }, echo);
    const ePh = ctx.el("span", { text: "Type your message", style: { color: "rgb(104 112 126)", fontWeight: "400" } }, eText);
    const eTyped = ctx.el("span", { text: "" }, eText);
    const eCaret = ctx.el("span", { style: { display: "inline-block", width: "3px", height: "34px", marginLeft: "2px", verticalAlign: "-6px", background: "var(--electric)", borderRadius: "2px" } }, eText);
    const eSend = ctx.el("div", { style: { width: "76px", height: "76px", flex: "none", borderRadius: "50%", background: "#eef2f8", border: "2px solid #dce4ee", display: "grid", placeItems: "center", color: "rgb(145 160 180)" } }, echo);
    ctx.icon("arrow-up", { size: 34, stroke: 2.2 }, eSend);
    typed.push(eTyped);
    const echoHome = { x: R.x + R.w / 2, y: R.y + 300 };
    during(ctx, K.r32 + 0.5, K.r35 + 0.02, (t) => {
      const up = ramp(ctx, t, K.questionEnd + 0.4, K.questionEnd + 0.85, "land");
      const out = ramp(ctx, t, tBubble + 0.02, tBubble + 0.36, "power2.in");
      place(echo, { x: echoHome.x, y: echoHome.y + (1 - up) * 40 - out * 30, s: 0.94 + 0.06 * up, o: up * (1 - out) });
      const txt = shownText(t);
      eTyped.textContent = t < tBubble ? txt : "";
      ePh.style.display = txt.length > 0 ? "none" : "";
      const blink = t < typeFrom || (t > typeTo && t < tSend) ? (Math.floor((t - K.questionEnd) * 2.2) % 2 === 0 ? 1 : 0) : 1;
      eCaret.style.opacity = String(blink);
      const lit = ramp(ctx, t, tSend - 0.02, tSend + 0.06) * (1 - ramp(ctx, t, tSend + 0.2, tSend + 0.4));
      eSend.style.background = lit > 0.01 ? `rgb(${mix(238, 0, lit).toFixed(0)} ${mix(242, 105, lit).toFixed(0)} ${mix(248, 254, lit).toFixed(0)})` : "#eef2f8";
      eSend.style.color = lit > 0.5 ? "#ffffff" : "rgb(145 160 180)";
    });
    ctx.sfx("bubble_send", tBubble, { offset: -2 });

    /* the pointer clicks the window's send button */
    const ptr = orb(ctx, winScene, { size: 40 });
    during(ctx, tSend - 0.6, tSend + 0.6, (t) => {
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

  /* ================= the "?": drop, hold, into the caret ================= */
  {
    const centre = M ? { x: 540, y: 700 } : { x: 960, y: 520 };
    const land = K.r32 + 0.04;
    const toCaret = [K.questionEnd - 0.03, K.questionEnd + 0.72];
    const inkH = (M ? 980 : 820) * 0.72; // the glyph's ink height, roughly
    const caretH = M ? 26 : 20;
    during(ctx, K.r32 - 0.3, K.r33 + 0.05, (t) => {
      const drop = ramp(ctx, t, K.r32 - 0.26, land, "power2.in");
      const kick = spring(t, land, { freq: 2.2, decay: 6.5 });
      const u = ramp(ctx, t, toCaret[0], toCaret[1], "power3.inOut");
      const x = mix(centre.x, caret.x, u);
      const y = mix(mix(centre.y - (M ? 1500 : 1100), centre.y, drop), caret.y, ramp(ctx, t, toCaret[0], toCaret[1], "power2.in"));
      const s = mix(1, caretH / inkH, ramp(ctx, t, toCaret[0], toCaret[1], "power3.in"));
      const thin = ramp(ctx, t, toCaret[1] - 0.14, toCaret[1], "power2.in");
      const bob = 6 * Math.sin((t - land) * 2.6) * ramp(ctx, t, land, land + 0.3) * (1 - u);
      place(q, { x, y: y + bob, sx: s * (1 + 0.06 * kick) * (1 - 0.9 * thin), sy: s * (1 - 0.08 * kick), o: drop > 0 ? 1 - ramp(ctx, t, toCaret[1] - 0.04, toCaret[1]) : 0 });
    });
  }

  /* ================= the topic chips ================= */
  const chipScene = ctx.scene("c33-chips", K.r33 - 0.1, K.r34 + 1.2, { z: 9 });
  {
    const items = [
      { text: "Prices", icon: "tag", t: K.prices },
      { text: "Areas", icon: "map-pin", t: K.areas },
      { text: "How renting works", icon: "key-round", t: K.renting },
    ];
    const size = M ? 30 : 30;
    const chips = items.map((it) => ({ ...it, ...chip(ctx, chipScene, { text: it.text, icon: it.icon, size, theme: "light" }) }));
    /* mobile: one row floating over the phone's lower edge (y ~1068); desktop: a column in RIGHT_PANEL */
    const widths = chips.map((c) => c.node.offsetWidth);
    const gap = 16;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
    const pos = M
      ? chips.map((c, i) => ({ x: 540 - total / 2 + widths.slice(0, i).reduce((a, b) => a + b + gap, 0) + widths[i] / 2, y: 1068 }))
      : chips.map((c, i) => ({ x: L.RIGHT_PANEL.x + 330 + widths[i] / 2 - 150 + 10, y: 440 + i * 96 }));
    during(ctx, K.r33 - 0.1, K.r34 + 1.2, (t) => {
      chips.forEach((c, i) => {
        const inU = ramp(ctx, t, K.r33 + 0.3 + i * 0.08, K.r33 + 0.7 + i * 0.08, "land");
        const outU = ramp(ctx, t, K.r34 + 0.5 + i * 0.06, K.r34 + 0.9 + i * 0.06, "power2.in");
        const lit = ramp(ctx, t, c.t - 0.03, c.t + 0.18, "power2.out");
        const pop = 1 + 0.07 * Math.max(0, spring(t, c.t, { freq: 2.6, decay: 8 }));
        place(c.node, { x: pos[i].x, y: pos[i].y + (1 - inU) * 24 + outU * 16, s: pop, o: inU * (1 - outU) * (0.72 + 0.28 * lit) });
        c.node.style.background = lit > 0.5 ? "linear-gradient(160deg, #2a86ff, #0069fe 60%, #0056d0)" : "rgb(255 255 255 / 0.94)";
        c.node.style.color = lit > 0.5 ? "#ffffff" : "#0b1230";
        c.node.style.borderColor = lit > 0.5 ? "rgb(143 211 255 / 0.7)" : "rgb(255 255 255 / 0.95)";
        c.icon.style.background = lit > 0.5 ? "rgb(255 255 255 / 0.2)" : "rgb(0 105 254 / 0.1)";
        c.icon.style.color = lit > 0.5 ? "#ffffff" : "var(--electric)";
      });
    });
  }

  /* ================= the robot: the assistant's own icon, peeking ================= */
  const robotScene = ctx.scene("c33-robot", K.r33, K.r35 + 0.02, { z: M ? 2 : 3 });
  {
    const size = M ? 140 : 132;
    const robot = ctx.img(ctx.src.brand("3d/assistant@2x.webp"), { class: "abs", style: { left: "0px", top: "0px", width: `${size}px`, height: `${size}px` } }, robotScene);
    /* behind the phone's right edge (mobile) or the window's right edge (desktop, after the push) */
    const hid = M ? { x: 760, y: 560 } : { x: 1330, y: 700 };
    const out = M ? { x: 872, y: 540 } : { x: 1478, y: 680 };
    const peek = K.areas - 0.1;
    during(ctx, K.r33, K.r35 + 0.02, (t) => {
      const u = ramp(ctx, t, peek, peek + 0.55, "back.out(1.5)");
      const nod = spring(t, K.timeOfDay, { freq: 1.8, decay: 4.5 });
      const bob = 4 * Math.sin((t - peek) * 2.4) * ramp(ctx, t, peek + 0.5, peek + 0.9);
      place(robot, { x: mix(hid.x, out.x, u), y: mix(hid.y, out.y, u) + bob + 6 * Math.max(0, nod), r: mix(-4, 12, u) + 10 * nod, o: u > 0 ? 1 : 0 });
    });
  }
}
