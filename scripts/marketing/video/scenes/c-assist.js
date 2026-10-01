/**
 * ROWS 32 to 34: THE ASSISTANT (72.69 to 79.62), both films. STORYBOARD v3.2.
 *
 * 32  A huge "?" drops into WORDS. The phone (window) rises from below the
 *     frame, pushed onto the assistant's own input field, and the "?" shrinks
 *     into the field's caret.
 * 33  The real question types into that field and is sent; the push eases
 *     back and the screen becomes the real answer on light
 *     (assistant-caution-2-lt), revealed top to bottom.
 * 34  The answer rests; the phone (window) leaves at the chapter's end, and
 *     the cut to the wall is on the beat, 79.62.
 */
import { orb, browserWindow, tap } from "../engine/components.js";
import { track, ramp, spring, during, place, dispToStage, screenImage, mix, opa, mist } from "./c-kit.js";
import { ROW_OFF } from "./c-pay.js";

const QUESTION = "What is a caution deposit?";

export async function buildAssist(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const tSend = ctx.beat(131.4); // the send press (75.81)
  const typeFrom = 73.95; // round 4: typing starts as the "?" reaches the caret
  const typeTo = K.prices + 0.36;
  const back = [tSend + 0.1, tSend + 0.8]; // the push eases back
  const revealFrom = tSend + 0.14;
  const revealTo = K.renting - 0.05;
  const leave = [ctx.beat(137.1), K.r35 - 0.06]; // 79.10 to 79.56: at the chapter's end
  const rise = [ctx.beat(126.95), ctx.beat(127.9)]; // 73.24 to 73.79
  const qFrom = 72.85; // round 4: the "?" drops once the row has flown off (72.82)
  const qLand = qFrom + 0.28; // 73.13, on "question" (72.95 to 73.43)
  /* the answer rests, pushed 1.5% closer over its hold (never fully still) */
  const restPush = (t) => 1 + 0.03 * ramp(ctx, t, back[1], leave[0], "sine.inOut"); // round 5: from the end of the push-back

  /* ================= the ground: mist to the cut ================= */
  const sky = ctx.scene("c32-sky", K.r32 - 0.3, K.r35, { z: 1 });
  mist(ctx, sky);

  /* ================= the "?" ================= */
  const qScene = ctx.scene("c32-q", qFrom - 0.02, K.r33 + 0.05, { z: 10 });
  const qSize = M ? 700 : 620;
  const q = ctx.el("div", {
    class: "abs c-display-800",
    text: "?",
    style: {
      left: "0px", top: "0px", fontSize: `${qSize}px`, lineHeight: "1", padding: "0 0.05em", visibility: "hidden",
      background: "linear-gradient(165deg, #8fd3ff 0%, #3d8bff 34%, #0069fe 60%, #003f98 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    },
  }, qScene);
  ctx.sfx("pop_low", qLand, { offset: -2 });

  const shownText = (t) => QUESTION.slice(0, Math.round(QUESTION.length * ramp(ctx, t, typeFrom, typeTo, "none")));
  const caretBlink = (t) => (t < typeFrom || (t > typeTo && t < tSend) ? (Math.floor((t - K.questionEnd) * 2.2) % 2 === 0 ? 1 : 0) : 1);
  for (let i = 0; i < 10; i += 1) ctx.sfx(`type_key_${(i % 6) + 1}`, typeFrom + ((typeTo - typeFrom) * (i + 0.5)) / 10, { offset: -6 });
  ctx.sfx("bubble_send", tSend + 0.05, { offset: -2 });

  let caret; // stage point of the field's caret, where the "?" ends

  if (M) {
    const P = L.PHONE_HERO;
    const p = S.light;
    const lt = screenImage(ctx, p, "assistant-lt");
    const ans = screenImage(ctx, p, "assistant-caution-2-lt");
    /* the field's own text, typed over its placeholder (display px) */
    const field = ctx.el("div", { class: "abs", style: { left: "172px", top: "2672px", width: "890px", height: "118px", background: "rgb(235 236 231)", visibility: "hidden" } }, p.screen);
    const row = ctx.el("div", { class: "abs", style: { left: "13px", top: "0px", height: "118px", display: "flex", alignItems: "center", font: "400 46px/1 Inter, sans-serif", letterSpacing: "-0.005em", whiteSpace: "nowrap" } }, field);
    const typed = ctx.el("span", { text: "", style: { color: "#0b1230", fontWeight: "500" } }, row);
    const car = ctx.el("span", { style: { display: "inline-block", width: "4px", height: "56px", marginLeft: "2px", background: "var(--electric)", borderRadius: "2px" } }, row);
    tap(ctx, p.screen, { x: 1188, y: 2731, t: tSend, size: 230, sound: "tap" });
    const on = (t) => t >= K.r32 - 0.3 && t < K.r35;
    ctx.onFrame((t) => {
      /* runs on every frame: the phone outlives these rows */
      const r = ramp(ctx, t, revealFrom, revealTo, "power1.inOut");
      lt.style.visibility = on(t) && r < 1 ? "" : "hidden";
      ans.style.visibility = on(t) && r > 0 ? "" : "hidden";
      const edge = -6 + r * 112;
      const mask = r >= 1 ? "none" : `linear-gradient(180deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 6).toFixed(2)}%)`;
      ans.style.maskImage = mask;
      ans.style.webkitMaskImage = mask;
      const txt = shownText(t);
      const showField = on(t) && t >= 73.85 && t < tSend + 0.05;
      field.style.visibility = showField ? "" : "hidden";
      typed.textContent = txt;
      car.style.opacity = t >= tSend ? "0" : opa(caretBlink(t));
    });
    /* pushed onto the input bar while the question is typed, creeping 3%
       closer (never still), then back to PHONE_HERO's size for the answer,
       which leaves at the chapter's end. */
    const s0 = dispToStage(P, 0, 0).s;
    /* round 5: the whole phone stays in frame, a 1.25x push with its top
       at y 50; the input bar lands at about y 1684, under the caption band,
       "How can I help today?" at about 965. The answer then rests at
       PHONE_HERO's size, raised to cy 860 so the whole screen (to its input
       bar, display 2790) ends above the caption band and its last named
       line sits near y 1018; the pill stays away through row 34, where it
       would sit on the app's own header. */
    const pushK = (t) => 1.25 * (1 + 0.03 * ramp(ctx, t, rise[1], back[0], "none"));
    const pushedCy = () => 50 + 1434 * s0 * 1.25;
    const restCy = 860;
    ctx.hidePill(K.r33 - 0.2, K.r35);
    p.poses.push({
      t0: rise[0] - 0.02, t1: leave[1] + 0.02,
      fn: (t) => {
        const up = ramp(ctx, t, rise[0], rise[1], "power3.out");
        const u = 1 - ramp(ctx, t, back[0], back[1], "power2.inOut");
        const out = ramp(ctx, t, leave[0], leave[1], "leave");
        const k = restPush(t);
        /* the rest push holds the screen's foot (display 2790) where it is */
        const cy = mix(restCy - (2790 - 1434) * s0 * (k - 1), pushedCy(t), u);
        return { cx: P.cx, cy: cy + (1 - up) * 2300 + out * 2300, height: P.height * mix(k, pushK(t), u), rx: 10 * (1 - up) + 10 * out, ry: 0, rz: 0, fov: 24, opacity: 1 };
      },
    });
    const at = dispToStage({ ...P, cy: pushedCy(73.98), height: P.height * pushK(73.98) }, 190, 2731);
    caret = { x: at.x, y: at.y };
  } else {
    /* the window rises pushed 1.5x past hero scale onto its input field (the
       field's content point (900, 855) at stage (900, 860)), so the typing
       reads; after the send it settles to hero scale (1.111) at y 120 for the
       answer, which then drifts 1.5% closer over its hold */
    const s1 = 1600 / 1440;
    const X = 160;
    const PUSH = 1.5;
    const sP = s1 * PUSH;
    const typed0 = { x: 900 - 900 * sP, y: 860 - (56 + 855) * sP, s: sP };
    /* the pushed window creeps 3% closer about the field while the question is typed */
    const typedAt = (t) => {
      const k = 1 + 0.03 * ramp(ctx, t, rise[1], back[0], "none");
      return { x: 900 - 900 * sP * k, y: 860 - (56 + 855) * sP * k, s: sP * k };
    };
    const yAnswer = 120;
    ctx.hidePill(K.r33 - 0.2, back[1] + 0.2); // the push brings the robot and "How can I help today?" up under the pill
    const winScene = ctx.scene("c32-win", rise[0] - 0.02, K.r35, { z: 4 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "light" });
    const lt = ctx.img(ctx.src.capture("d-assistant-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const ans = ctx.img(ctx.src.capture("d-assistant-caution-2-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", visibility: "hidden" } }, win.content);
    const fieldCover = ctx.el("div", { class: "abs", style: { left: "648px", top: "838px", width: "380px", height: "34px", background: "#ebebe7", visibility: "hidden" } }, win.content);
    const fieldText = ctx.el("div", { class: "abs", style: { left: "654px", top: "843px", font: "500 17px/24px Inter, sans-serif", color: "#0b1230", whiteSpace: "nowrap" } }, win.content);
    const fieldCaret = ctx.el("div", { class: "abs", style: { left: "654px", top: "845px", width: "2px", height: "20px", background: "var(--electric)" } }, win.content);
    const poseAt = (t) => {
      const up = ramp(ctx, t, rise[0], rise[1], "power3.out");
      const settle = ramp(ctx, t, back[0], back[1] + 0.3, "power2.inOut");
      const out = ramp(ctx, t, leave[0], leave[1], "leave");
      const k = restPush(t);
      /* the rest push is about the frame's centre column, x 960, y 540 */
      const rest = { x: 960 - (960 - X) * k, y: 540 - (540 - yAnswer) * k, s: s1 * k };
      const ty = typedAt(t);
      return { x: mix(ty.x, rest.x, settle), y: mix(ty.y, rest.y, settle) + (1 - up) * 1300 + out * 1200, s: mix(ty.s, rest.s, settle) };
    };
    during(ctx, rise[0] - 0.02, K.r35, (t) => {
      const q = poseAt(t);
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px) scale(${q.s.toFixed(5)})`;
      win.root.style.opacity = opa(1);
      win.root.style.visibility = t < leave[1] ? "" : "hidden";
      const r = ramp(ctx, t, revealFrom, revealTo, "power1.inOut");
      lt.style.visibility = r < 1 ? "" : "hidden";
      ans.style.visibility = r > 0 ? "" : "hidden";
      const edge = -6 + r * 112;
      const mask = r >= 1 ? "none" : `linear-gradient(180deg, #000 0%, #000 ${edge.toFixed(2)}%, transparent ${(edge + 6).toFixed(2)}%)`;
      ans.style.maskImage = mask;
      ans.style.webkitMaskImage = mask;
      const txt = shownText(t);
      const showTyped = t >= 73.85 && t < tSend + 0.05;
      fieldCover.style.visibility = showTyped ? "" : "hidden";
      fieldText.textContent = showTyped ? txt : "";
      fieldCaret.style.left = `${654 + (showTyped ? fieldText.offsetWidth : 0) + 1}px`;
      fieldCaret.style.opacity = showTyped && t < tSend ? opa(caretBlink(t)) : "0";
    });
    caret = { x: typedAt(73.98).x + 655 * typedAt(73.98).s, y: 860 };
    const sendAt = { x: typedAt(tSend).x + 1251 * typedAt(tSend).s, y: 860 };
    /* the pointer clicks send */
    const ptr = orb(ctx, winScene, { size: 40 });
    ptr.style.visibility = "hidden";
    const ring = ctx.el("div", { class: "abs", style: { left: `${sendAt.x - 50}px`, top: `${sendAt.y - 50}px`, width: "100px", height: "100px", borderRadius: "50%", border: "3px solid rgb(0 105 254 / 0.8)", zIndex: 840, visibility: "hidden" } }, winScene);
    ctx.sfx("tap", tSend, { offset: 0 });
    during(ctx, rise[0] - 0.02, K.r35, (t) => {
      const x = track(ctx, t, [[tSend - 0.55, sendAt.x + 220], [tSend - 0.06, sendAt.x, "glide"], [tSend + 0.5, sendAt.x + 260, "power2.in"]]);
      const y = track(ctx, t, [[tSend - 0.55, sendAt.y - 140], [tSend - 0.06, sendAt.y, "glide"], [tSend + 0.5, sendAt.y - 60, "power2.in"]]);
      const o = ramp(ctx, t, tSend - 0.55, tSend - 0.4) * (1 - ramp(ctx, t, tSend + 0.2, tSend + 0.45));
      const q2 = ramp(ctx, t, tSend - 0.06, tSend + 0.03, "power2.out") - ramp(ctx, t, tSend + 0.05, tSend + 0.37, "back.out(2.2)");
      ptr.style.left = `${(x - 20).toFixed(2)}px`;
      ptr.style.top = `${(y - 20).toFixed(2)}px`;
      ptr.style.transform = `scale(${(1 + 0.1 * q2).toFixed(4)}, ${(1 - 0.2 * q2).toFixed(4)})`;
      ptr.style.opacity = opa(o);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
      const onR = t >= tSend && t < tSend + 0.5;
      const e = ctx.ease("power2.out")(ctx.progress(t, tSend, tSend + 0.5));
      ring.style.transform = `scale(${(0.25 + e).toFixed(4)})`;
      ring.style.opacity = onR ? opa(1 - e) : "0";
      ring.style.visibility = onR ? "" : "hidden";
    });
  }

  /* ================= the "?": drop into WORDS, hold, into the caret ================= */
  {
    const centre = M ? { x: 540, y: L.WORDS.y + L.WORDS.h / 2 } : { x: 960, y: 500 };
    const land = qLand;
    const toCaret = [73.38, 73.98];
    const inkH = qSize * 0.72;
    const caretH = M ? 36 : 33;
    during(ctx, qFrom - 0.02, K.r33 + 0.05, (t) => {
      const drop = ramp(ctx, t, qFrom, land, "power2.in");
      const kick = spring(t, land, { freq: 2.2, decay: 6.5 });
      const u = ramp(ctx, t, toCaret[0], toCaret[1], "power3.inOut");
      const x = mix(centre.x, caret.x, u);
      const y = mix(mix(centre.y - (M ? 1400 : 1000), centre.y, drop), caret.y, ramp(ctx, t, toCaret[0], toCaret[1], "power2.in"));
      /* it shrinks early in its flight, so it never sits large over the screen's heading */
      const s = mix(1, caretH / inkH, ramp(ctx, t, toCaret[0], toCaret[1] - 0.2, "power3.out"));
      const thin = ramp(ctx, t, toCaret[1] - 0.14, toCaret[1], "power2.in");
      place(q, { x, y, sx: s * (1 + 0.06 * kick) * (1 - 0.9 * thin), sy: s * (1 - 0.08 * kick), o: drop > 0 ? 1 - ramp(ctx, t, toCaret[1] - 0.04, toCaret[1]) : 0 });
    });
  }
}
