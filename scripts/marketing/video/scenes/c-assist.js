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

const QUESTION = "What is a caution deposit?";

export async function buildAssist(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const tSend = ctx.beat(131.4); // the send press (75.81)
  const typeFrom = K.r33 + 0.08;
  const typeTo = K.prices + 0.36;
  const back = [tSend + 0.1, tSend + 0.8]; // the push eases back
  const revealFrom = tSend + 0.14;
  const revealTo = K.renting - 0.05;
  const leave = [ctx.beat(137.1), K.r35 - 0.06]; // 79.10 to 79.56: at the chapter's end
  const rise = [ctx.beat(126.95), ctx.beat(127.9)]; // 73.24 to 73.79

  /* ================= the ground: mist to the cut ================= */
  const sky = ctx.scene("c32-sky", K.r32 - 0.3, K.r35, { z: 1 });
  mist(ctx, sky);

  /* ================= the "?" ================= */
  const qScene = ctx.scene("c32-q", K.r32 - 0.3, K.r33 + 0.05, { z: 10 });
  const qSize = M ? 700 : 620;
  const q = ctx.el("div", {
    class: "abs c-display-800",
    text: "?",
    style: {
      left: "0px", top: "0px", fontSize: `${qSize}px`, lineHeight: "1", padding: "0 0.05em", visibility: "hidden",
      background: "linear-gradient(165deg, #8fd3ff 0%, #3d8bff 34%, #0069fe 60%, #003f98 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    },
  }, qScene);
  ctx.sfx("pop_low", K.r32, { offset: -2 });

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
      const showField = on(t) && t >= K.questionEnd + 0.6 && t < tSend + 0.05;
      field.style.visibility = showField ? "" : "hidden";
      typed.textContent = txt;
      car.style.opacity = t >= tSend ? "0" : opa(caretBlink(t));
    });
    /* pushed 1.35x onto the input field (x 145-935, y 1000) while the question
       is typed, then back to PHONE_HERO for the answer; it leaves at the chapter's end */
    const PUSH = 1.35;
    const s0 = dispToStage(P, 0, 0).s;
    const pushedCy = 1000 - (2731 - 1434) * s0 * PUSH;
    p.poses.push({
      t0: rise[0] - 0.02, t1: leave[1] + 0.02,
      fn: (t) => {
        const up = ramp(ctx, t, rise[0], rise[1], "power3.out");
        const u = 1 - ramp(ctx, t, back[0], back[1], "power2.inOut");
        const out = ramp(ctx, t, leave[0], leave[1], "leave");
        return { cx: P.cx, cy: mix(P.cy, pushedCy, u) + (1 - up) * 2300 + out * 2300, height: P.height * mix(1, PUSH, u), rx: 10 * (1 - up) + 10 * out, ry: 0, rz: 0, fov: 24, opacity: 1 };
      },
    });
    const at = dispToStage({ ...P, cy: pushedCy, height: P.height * PUSH }, 190, 2731);
    caret = { x: at.x, y: at.y };
  } else {
    /* the window at hero scale (1.111), raised so its input field sits at y 860 */
    const s1 = 1600 / 1440;
    const X = 160;
    const yType = 860 - (56 + 855) * s1;
    const yAnswer = 120;
    const winScene = ctx.scene("c32-win", rise[0] - 0.02, K.r35, { z: 4 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "light" });
    const lt = ctx.img(ctx.src.capture("d-assistant-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const ans = ctx.img(ctx.src.capture("d-assistant-caution-2-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", visibility: "hidden" } }, win.content);
    const fieldCover = ctx.el("div", { class: "abs", style: { left: "648px", top: "838px", width: "380px", height: "34px", background: "#ebebe7", visibility: "hidden" } }, win.content);
    const fieldText = ctx.el("div", { class: "abs", style: { left: "654px", top: "843px", font: "500 17px/24px Inter, sans-serif", color: "#0b1230", whiteSpace: "nowrap" } }, win.content);
    const fieldCaret = ctx.el("div", { class: "abs", style: { left: "654px", top: "845px", width: "2px", height: "20px", background: "var(--electric)" } }, win.content);
    const yAt = (t) => {
      const up = ramp(ctx, t, rise[0], rise[1], "power3.out");
      const settle = ramp(ctx, t, back[0], back[1] + 0.3, "power2.inOut");
      const out = ramp(ctx, t, leave[0], leave[1], "leave");
      return mix(yType, yAnswer, settle) + (1 - up) * 1300 + out * 1200;
    };
    during(ctx, rise[0] - 0.02, K.r35, (t) => {
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${X}px, ${yAt(t).toFixed(2)}px) scale(${s1.toFixed(5)})`;
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
      const showTyped = t >= K.questionEnd + 0.6 && t < tSend + 0.05;
      fieldCover.style.visibility = showTyped ? "" : "hidden";
      fieldText.textContent = showTyped ? txt : "";
      fieldCaret.style.left = `${654 + (showTyped ? fieldText.offsetWidth : 0) + 1}px`;
      fieldCaret.style.opacity = showTyped && t < tSend ? opa(caretBlink(t)) : "0";
    });
    caret = { x: X + 655 * s1, y: 860 };
    const sendAt = { x: X + 1251 * s1, y: 860 };
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
    const land = K.r32 + 0.04;
    const toCaret = [K.questionEnd - 0.03, K.questionEnd + 0.72];
    const inkH = qSize * 0.72;
    const caretH = M ? 36 : 22;
    during(ctx, K.r32 - 0.3, K.r33 + 0.05, (t) => {
      const drop = ramp(ctx, t, K.r32 - 0.26, land, "power2.in");
      const kick = spring(t, land, { freq: 2.2, decay: 6.5 });
      const u = ramp(ctx, t, toCaret[0], toCaret[1], "power3.inOut");
      const x = mix(centre.x, caret.x, u);
      const y = mix(mix(centre.y - (M ? 1400 : 1000), centre.y, drop), caret.y, ramp(ctx, t, toCaret[0], toCaret[1], "power2.in"));
      const s = mix(1, caretH / inkH, ramp(ctx, t, toCaret[0], toCaret[1], "power3.in"));
      const thin = ramp(ctx, t, toCaret[1] - 0.14, toCaret[1], "power2.in");
      place(q, { x, y, sx: s * (1 + 0.06 * kick) * (1 - 0.9 * thin), sy: s * (1 - 0.08 * kick), o: drop > 0 ? 1 - ramp(ctx, t, toCaret[1] - 0.04, toCaret[1]) : 0 });
    });
  }
}
