/**
 * ROWS 28 to 31: PAYING (62.88 to 72.69), both films.
 *
 * 28  The coin comes down to Vallo's real passcode (passcode-create-lt); the
 *     dots fill as the keys are pressed and are lifted large; on "pay" the
 *     coin is let go and the phone (window) drops out.
 * 29  Signature 3: "Vallo never holds your money." from opposite sides; the
 *     path Your card -> Paystack -> The owner's bank draws itself; the Vallo
 *     mark sits beside it with an empty tray; the coin drops onto Your card.
 * 30  The coin runs the path: past Paystack on "goes", into the bank on
 *     "owner"; the last label rolls Owner, Host, Business; the tray stays
 *     empty. The path folds into a thin line.
 * 31  "Licensed payment processor" writes in under Paystack; card 3 swings in
 *     and turns over; cards 1 and 2 fly back in; the three sit answered in
 *     CARD_SLOT until they fly off at 72.5.
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { orb, press, tap, browserWindow } from "../engine/components.js";
import { track, ramp, spring, during, place, coin, mist, measure, dispToStage, screenImage, passDot, slotCard, SHADOW, mix } from "./c-kit.js";

/* Where builder B leaves the coin at 62.88 (STORYBOARD row 27: the verified
   mark on card 2 spins off into the coin). Updated from scenes/handoffs.md. */
export const COIN_IN = {
  mobile: { x: 330, y: 470, size: 110, spin: 0 },
  desktop: { x: 1500, y: 420, size: 88, spin: 0 },
};

export async function buildPay(ctx, S) {
  const { K } = S;
  const M = ctx.isMobile;
  const L = LAYOUT[ctx.film];
  const t = (name) => K[name];

  /* ================= the ground ================= */
  const bg = ctx.scene("c28-ground", K.r28 - 0.05, K.r32 + 0.06, { z: 1 });
  mist(ctx, bg);

  /* ================= the passcode (row 28) ================= */
  /* Geometry of the lock, the six dots and the keys, in stage px. */
  let LOCK, LOCK_D, KEY, dotsAt, setPasscodeScreen;
  const over = ctx.scene("c28-over", K.r28, K.r29 + 0.1, { z: 7 });
  const presses = [
    { key: 1, t: K.when },
    { key: 2, t: K.its },
    { key: 5, t: K.time },
    { key: 6, t: K.to },
  ];
  /* Two digits were already typed when we arrive; the four presses fill 3 to 6. */
  const fillAt = [-1, -1, ...presses.map((p) => p.t)];

  if (M) {
    const P = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
    const p = S.light;
    const lock = dispToStage(P, 659.5, 1197);
    LOCK = { x: lock.x, y: lock.y };
    LOCK_D = 309 * lock.s;
    const KEYS = { 1: [338, 1966], 2: [658, 1966], 3: [978, 1966], 4: [338, 2240], 5: [658, 2240], 6: [978, 2240], 7: [338, 2512], 8: [658, 2512], 9: [978, 2512] };
    KEY = (k) => ({ ...dispToStage(P, KEYS[k][0], KEYS[k][1]), dx: KEYS[k][0], dy: KEYS[k][1] });

    /* The screen: the real passcode page, with the six dots redrawn over its
       own (dots 3 and 4 are filled in the capture: a patch of the card's
       navy hides them until they fill). */
    const img = screenImage(ctx, p, "passcode-create-lt");
    const layer = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", visibility: "hidden" } }, p.screen);
    const screenDots = [];
    for (let k = 0; k < 6; k += 1) {
      const cx = 434.5 + 90 * k;
      const patch = ctx.el("div", { class: "abs", style: { left: `${cx - 34}px`, top: `${1664.5 - 34}px`, width: "68px", height: "68px", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(1 17 66) 72%, rgb(1 17 66 / 0) 100%)" } }, layer);
      const d = passDot(ctx, layer, 42);
      place(d.slot, { x: cx, y: 1664.5 });
      screenDots.push({ patch, ...d });
    }
    /* key lights: a soft white disc on the pressed key */
    const keyLights = presses.map((pr) => {
      const [dx, dy] = KEYS[pr.key];
      const n = ctx.el("div", { class: "abs", style: { left: `${dx - 112}px`, top: `${dy - 112}px`, width: "224px", height: "224px", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(170 210 255 / 0.55), rgb(170 210 255 / 0.18) 70%, rgb(170 210 255 / 0))", opacity: 0 } }, layer);
      return { n, t: pr.t };
    });
    setPasscodeScreen = (tt, on) => {
      img.style.visibility = on ? "" : "hidden";
      layer.style.visibility = on ? "" : "hidden";
      if (!on) return;
      screenDots.forEach((d, k) => {
        const u = fillAt[k] < 0 ? 1 : ramp(ctx, tt, fillAt[k] - 0.02, fillAt[k] + 0.12, "back.out(2.6)");
        d.fill.style.opacity = String(Math.min(1, u * 1.4));
        d.fill.style.transform = `scale(${(0.35 + 0.65 * u).toFixed(3)})`;
        d.patch.style.opacity = k >= 2 && k <= 3 ? "1" : "0";
      });
      keyLights.forEach(({ n, t: tp }) => { n.style.opacity = String(0.9 * (tt < tp - 0.03 ? 0 : Math.exp(-(tt - tp) * 7))); });
    };
    ctx.onFrame((tt) => setPasscodeScreen(tt, tt >= K.r28 - 0.05 && tt < K.r29 + 0.1));
    for (const pr of presses) tap(ctx, p.screen, { x: KEYS[pr.key][0], y: KEYS[pr.key][1], t: pr.t, size: 230, sound: null });

    /* The phone: up from below into PHONE_HIGH, then it drops out after "pay". */
    p.poses.push({
      t0: K.r28 - 0.05, t1: K.r29 - 0.02,
      fn: (tt) => ({
        cx: P.cx, height: P.height, fov: 24,
        cy: track(ctx, tt, [[K.r28, P.cy + 1250], [K.r28 + 0.5, P.cy, "land"], [K.pay + 0.16, P.cy], [K.r29 - 0.08, P.cy + 1650, "leave"]]),
        rx: track(ctx, tt, [[K.r28, 10], [K.r28 + 0.5, 0, "land"], [K.pay + 0.16, 0], [K.r29 - 0.08, 18, "leave"]]),
        ry: track(ctx, tt, [[K.r28, -9], [K.r28 + 0.55, 0, "land"], [K.pay + 0.16, 0], [K.r29 - 0.08, -7, "leave"]]),
        rz: 0,
        opacity: 1 - ramp(ctx, tt, K.r29 - 0.2, K.r29 - 0.08),
      }),
    });

    dotsAt = (k) => dispToStage(P, 434.5 + 90 * k, 1664.5);
  } else {
    /* Desktop: the window at WINDOW_LEFT with the real passcode page. */
    const W = L.WINDOW_LEFT;
    const win = browserWindow(ctx, { parent: over, width: W.width, url: "vallospaces.com/settings/passcode", theme: "light" });
    over.appendChild(win.root);
    const sc = win.scale;
    const C = (x, y) => ({ x: W.x + x * sc, y: W.y + (56 + y) * sc });
    ctx.img(ctx.src.capture("d-passcode-create-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const layer = ctx.el("div", { class: "abs", style: { inset: "0px" } }, win.content);
    const screenDots = [];
    for (let k = 0; k < 6; k += 1) {
      const cx = 776.75 + 30 * k;
      const patch = ctx.el("div", { class: "abs", style: { left: `${cx - 12}px`, top: `${451.75 - 12}px`, width: "24px", height: "24px", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(1 17 66) 70%, rgb(1 17 66 / 0) 100%)" } }, layer);
      const d = passDot(ctx, layer, 14);
      place(d.slot, { x: cx, y: 451.75 });
      screenDots.push({ patch, ...d });
    }
    const KEYS = { 1: [744, 553], 2: [852, 553], 3: [960, 553], 4: [744, 643], 5: [852, 643], 6: [960, 643], 7: [744, 733], 8: [852, 733], 9: [960, 733] };
    const keyLights = presses.map((pr) => {
      const [dx, dy] = KEYS[pr.key];
      const n = ctx.el("div", { class: "abs", style: { left: `${dx - 40}px`, top: `${dy - 40}px`, width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(170 210 255 / 0.55), rgb(170 210 255 / 0.18) 70%, rgb(170 210 255 / 0))", opacity: 0 } }, layer);
      return { n, t: pr.t };
    });
    LOCK = C(851.75, 291.75);
    LOCK_D = 102.5 * sc;
    KEY = (k) => ({ ...C(KEYS[k][0], KEYS[k][1]) });
    dotsAt = (k) => C(776.75 + 30 * k, 451.75);
    during(ctx, K.r28 - 0.05, K.r29 + 0.1, (tt) => {
      screenDots.forEach((d, k) => {
        const u = fillAt[k] < 0 ? 1 : ramp(ctx, tt, fillAt[k] - 0.02, fillAt[k] + 0.12, "back.out(2.6)");
        d.fill.style.opacity = String(Math.min(1, u * 1.4));
        d.fill.style.transform = `scale(${(0.35 + 0.65 * u).toFixed(3)})`;
        d.patch.style.opacity = k >= 2 && k <= 3 ? "1" : "0";
      });
      keyLights.forEach(({ n, t: tp }) => { n.style.opacity = String(0.9 * (tt < tp - 0.03 ? 0 : Math.exp(-(tt - tp) * 7))); });
      /* The window holds at WINDOW_LEFT, then drops out after "pay". */
      const y = track(ctx, tt, [[K.r28, W.y + 40], [K.r28 + 0.42, W.y, "land"], [K.pay + 0.16, W.y], [K.r29 - 0.06, W.y + 980, "leave"]]);
      const o = ramp(ctx, tt, K.r28 - 0.04, K.r28 + 0.16) * (1 - ramp(ctx, tt, K.r29 - 0.2, K.r29 - 0.06));
      const rx = track(ctx, tt, [[K.pay + 0.16, 0], [K.r29 - 0.06, 14, "leave"]]);
      win.root.style.transformOrigin = "50% 0%";
      win.root.style.transform = `translate(${W.x}px, ${y.toFixed(2)}px) perspective(2400px) rotateX(${rx.toFixed(2)}deg) scale(${sc})`;
      win.root.style.transformOrigin = "0 0";
      win.root.style.opacity = o.toFixed(4);
      win.root.style.visibility = o > 0.001 ? "" : "hidden";
    });
  }

  /* The pointer: glides over the keys and presses them (both films). */
  const ptr = orb(ctx, over, { size: M ? 46 : 40 });
  {
    const k = presses.map((pr) => KEY(pr.key));
    const start = M ? { x: 800, y: 1180 } : { x: 900, y: 760 };
    const end = M ? { x: 960, y: 1180 } : { x: 1000, y: 800 };
    const hover = M ? -18 : -10; // just above the glass (mobile) or the key (desktop)
    const xs = [[K.r28, start.x], [K.when - 0.08, k[0].x, "glide"], [K.its - 0.06, k[1].x, "glide"], [K.time - 0.07, k[2].x, "glide"], [K.to - 0.08, k[3].x, "glide"], [K.pay + 0.3, end.x, "power2.in"]];
    const ys = [[K.r28, start.y], [K.when - 0.08, k[0].y + hover, "glide"], [K.its - 0.06, k[1].y + hover, "glide"], [K.time - 0.07, k[2].y + hover, "glide"], [K.to - 0.08, k[3].y + hover, "glide"], [K.pay + 0.3, end.y, "power2.in"]];
    const shadow = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "40px", height: "16px", borderRadius: "50%", background: "radial-gradient(closest-side, rgb(0 20 80 / 0.35), rgb(0 20 80 / 0))" } }, over);
    over.insertBefore(shadow, ptr);
    during(ctx, K.r28, K.r29, (tt) => {
      const x = track(ctx, tt, xs);
      const y = track(ctx, tt, ys);
      const o = ramp(ctx, tt, K.r28 + 0.02, K.r28 + 0.2) * (1 - ramp(ctx, tt, K.pay + 0.05, K.pay + 0.3));
      ptr.style.left = `${(x - (M ? 23 : 20)).toFixed(2)}px`;
      ptr.style.top = `${(y - (M ? 23 : 20)).toFixed(2)}px`;
      ptr.style.opacity = o.toFixed(3);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
      place(shadow, { x: x + 6, y: y - hover + 8, o: o * 0.9 });
    });
    presses.forEach((pr, i) => {
      press(ctx, ptr, pr.t, { ringParent: M ? null : over, x: k[i].x, y: k[i].y, sound: null, ring: !M });
      ctx.sfx(`type_key_${[1, 3, 5, 2][i]}`, pr.t, { offset: -6 });
    });
  }

  /* The dots, lifted large above the phone (mobile) or echoed in RIGHT_PANEL (desktop). */
  {
    const D = M ? 44 : 64;
    const gap = M ? 94 : 100;
    const width = gap * 5 + D + (M ? 104 : 96);
    const height = M ? 88 : 128;
    const home = M ? { x: 540, y: 344 } : { x: L.RIGHT_PANEL.x + L.RIGHT_PANEL.w / 2, y: L.RIGHT_PANEL.y + 330 };
    const body = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", width: `${width}px`, height: `${height}px`, borderRadius: "999px", overflow: "hidden",
        background: "linear-gradient(180deg, #03165a 0%, #011146 100%)", border: "1.5px solid rgb(120 170 255 / 0.3)", boxShadow: SHADOW.light,
      },
    }, over);
    const dots = [];
    for (let i = 0; i < 6; i += 1) {
      const d = passDot(ctx, body, D);
      place(d.slot, { x: width / 2 + (i - 2.5) * gap, y: height / 2 });
      dots.push(d);
    }
    const glint = ctx.el("div", { class: "abs", style: { top: "0px", bottom: "0px", left: "0px", width: `${width * 0.35}px`, background: "linear-gradient(100deg, rgb(255 255 255 / 0), rgb(200 230 255 / 0.28), rgb(255 255 255 / 0))" } }, body);
    ctx.sfx("glass_clink", K.pay, { offset: -4 });
    const from = M ? dotsAt(2.5) : { x: home.x, y: home.y + 60 };
    const fromScale = M ? (42 * 0.4033) / D : 0.7;
    during(ctx, K.r28, K.r29, (tt) => {
      const u = ramp(ctx, tt, K.r28 + 0.22, K.r28 + 0.55, "land");
      const out = ramp(ctx, tt, K.pay + 0.2, K.pay + 0.5, "power2.in");
      const s = mix(fromScale, 1, u) * (1 - 0.04 * out);
      const pulse = 1 + 0.05 * Math.max(0, spring(tt, K.pay, { freq: 3, decay: 9 }));
      place(body, { x: mix(from.x, home.x, u), y: mix(from.y, home.y, u) - 40 * out, s: s * pulse, o: Math.min(1, u * 3) * (1 - out) });
      dots.forEach((d, k) => {
        const f = fillAt[k] < 0 ? 1 : ramp(ctx, tt, fillAt[k] - 0.02, fillAt[k] + 0.12, "back.out(2.6)");
        d.fill.style.opacity = String(Math.min(1, f * 1.4));
        d.fill.style.transform = `scale(${(0.35 + 0.65 * f).toFixed(3)})`;
      });
      const g = ramp(ctx, tt, K.pay - 0.02, K.pay + 0.32, "power2.inOut");
      glint.style.transform = `translateX(${(-width * 0.4 + g * width * 1.45).toFixed(1)}px)`;
      glint.style.opacity = g > 0 && g < 1 ? "1" : "0";
    });
  }

  /* ================= the path (rows 29 to 31) ================= */
  const path = ctx.scene("c29-path", K.r29 - 0.1, K.r32 + 0.06, { z: 6 });
  const ST = M
    ? [{ x: 250, y: 700 }, { x: 250, y: 920 }, { x: 250, y: 1140 }]
    : [{ x: 300, y: 560 }, { x: 960, y: 560 }, { x: 1620, y: 560 }];
  const LINE = M
    ? [{ x: 200, y: 1150 }, { x: 540, y: 1150 }, { x: 870, y: 1150 }]
    : [{ x: 300, y: 800 }, { x: 960, y: 800 }, { x: 1620, y: 800 }];
  const SD = M ? 132 : 112; // station diameter
  const SMALL = M ? 30 : 26;
  const COIN_D = M ? 118 : 96;
  const TRAY = M ? { x: 840, y: 920 } : { x: 960, y: 770 };
  const drawAt = [K.r29 + 0.14, K.r29 + 0.58, K.r29 + 1.0]; // the three stations pop in
  const fold = [K.r31 - 0.42, K.r31]; // the path folds into the thin line

  /* the line: two segments between the stations' current centres */
  const svg = ctx.el("div", { class: "abs", style: { inset: "0px" } }, path);
  svg.innerHTML = `<svg width="${ctx.W}" height="${ctx.H}" viewBox="0 0 ${ctx.W} ${ctx.H}" style="position:absolute;left:0;top:0;overflow:visible">
    <defs><linearGradient id="c29g" gradientUnits="userSpaceOnUse" x1="${ST[0].x}" y1="${ST[0].y}" x2="${ST[2].x}" y2="${ST[2].y}"><stop offset="0" stop-color="#5c9fff"/><stop offset="1" stop-color="#0069fe"/></linearGradient></defs>
    <line id="c29a" stroke="url(#c29g)" stroke-linecap="round"/><line id="c29b" stroke="url(#c29g)" stroke-linecap="round"/></svg>`;
  const seg = [svg.querySelector("#c29a"), svg.querySelector("#c29b")];
  seg.forEach((s) => s.setAttribute("stroke", "#3d86ff"));

  /* stations: white glass sockets */
  const stations = ST.map(() => {
    const n = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", width: `${SD}px`, height: `${SD}px`, borderRadius: "50%",
        background: "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f8ff 60%, #e6eeff 100%)",
        border: "1.5px solid #ffffff", boxShadow: `${SHADOW.light}, inset 0 ${SD * 0.03}px ${SD * 0.08}px rgb(10 40 120 / 0.12)`,
      },
    }, path);
    const ring = ctx.el("div", { class: "abs", style: { inset: `${SD * 0.09}px`, borderRadius: "50%", border: `${Math.max(2, SD * 0.022)}px solid rgb(0 105 254 / 0.22)` } }, n);
    return { n, ring };
  });
  /* a ring that flashes out of a station (the coin passing, landing) */
  const flashes = ST.map(() => ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${SD}px`, height: `${SD}px`, borderRadius: "50%", border: "3px solid rgb(0 105 254 / 0.7)", opacity: 0 } }, path));

  /* labels, big (rows 29-30) */
  const bigFont = M ? 54 : 46;
  const labelStyle = { font: `600 ${bigFont}px/1.1 "C Poppins", Inter, sans-serif`, letterSpacing: "-0.025em", color: "#0b1230", whiteSpace: "nowrap" };
  const labels = ["Your card", "Paystack", "The owner's bank"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...labelStyle } }, path));
  /* the last label rolls: Owner, Host, Business */
  const roleBox = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", height: `${bigFont * 1.25}px`, width: `${bigFont * 6}px`, overflow: "hidden" } }, path);
  const roles = ["Owner", "Host", "Business"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...labelStyle, color: "var(--electric)", fontWeight: "700" } }, roleBox));
  const roleAt = [K.owner, K.host, K.business];
  ctx.sfx("tap_soft", K.host, { offset: -6 });
  ctx.sfx("tap_soft", K.business, { offset: -6 });

  /* labels, small (row 31, on the thin line) */
  const smallFont = M ? 26 : 26;
  const smallStyle = { font: `600 ${smallFont}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", color: "#0b1230", whiteSpace: "nowrap" };
  const small = ["Your card", "Paystack", "Business"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...smallStyle } }, path));
  const licensed = ctx.el("div", { class: "abs", text: "Licensed payment processor", style: { left: "0px", top: "0px", font: `600 ${M ? 28 : 28}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", color: "var(--electric-600)", whiteSpace: "nowrap", clipPath: "inset(0 100% 0 0)" } }, path);

  /* the Vallo mark with its empty tray */
  const trayBox = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "220px", height: "200px" } }, path);
  const trayRing = ctx.el("div", { class: "abs", style: { left: "35px", top: "118px", width: "150px", height: "52px", borderRadius: "50%", border: "3px dashed rgb(0 105 254 / 0.45)", background: "radial-gradient(closest-side, rgb(0 105 254 / 0.05), rgb(0 105 254 / 0))" } }, trayBox);
  ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: "56px", top: "6px", width: "108px", height: "103px", objectFit: "contain" } }, trayBox);

  const stationPos = (i, tt) => {
    const u = ramp(ctx, tt, fold[0] + i * 0.03, fold[1] - (2 - i) * 0.03, "whip");
    return { x: mix(ST[i].x, LINE[i].x, u), y: mix(ST[i].y, LINE[i].y, u), d: mix(SD, SMALL, u), u };
  };

  during(ctx, K.r29 - 0.1, K.r32 + 0.06, (tt) => {
    const gone = ramp(ctx, tt, K.r32 - 0.24, K.r32 - 0.04, "power2.in");
    const sp = [0, 1, 2].map((i) => stationPos(i, tt));
    /* stations */
    sp.forEach((q, i) => {
      const pop = ramp(ctx, tt, drawAt[i], drawAt[i] + 0.34, "back.out(1.8)");
      const o = Math.min(1, pop * 2) * (1 - gone);
      place(stations[i].n, { x: q.x, y: q.y, s: (q.d / SD) * (0.55 + 0.45 * pop), o });
      stations[i].ring.style.opacity = String(1 - q.u);
      if (q.u > 0) {
        stations[i].n.style.background = q.u > 0.5 ? "#ffffff" : "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f8ff 60%, #e6eeff 100%)";
        stations[i].n.style.borderColor = q.u > 0.5 ? "rgb(0 105 254 / 0.85)" : "#ffffff";
        stations[i].n.style.borderWidth = q.u > 0.5 ? `${(3 * SD / q.d).toFixed(2)}px` : "1.5px";
      }
    });
    /* line segments */
    [0, 1].forEach((i) => {
      const a = sp[i];
      const b = sp[i + 1];
      const g = ramp(ctx, tt, drawAt[i] + 0.2, drawAt[i + 1] + 0.1, "power2.inOut") * (1 - gone);
      seg[i].setAttribute("x1", a.x.toFixed(2));
      seg[i].setAttribute("y1", a.y.toFixed(2));
      seg[i].setAttribute("x2", mix(a.x, b.x, g).toFixed(2));
      seg[i].setAttribute("y2", mix(a.y, b.y, g).toFixed(2));
      seg[i].setAttribute("stroke-width", mix(M ? 6 : 5, 3, a.u).toFixed(2));
      seg[i].style.opacity = g > 0.001 ? "1" : "0";
    });
    /* flashes: passing Paystack, landing in the bank */
    [[1, K.goes], [2, K.owner]].forEach(([i, tf]) => {
      const f = ramp(ctx, tt, tf, tf + 0.6, "power2.out");
      place(flashes[i], { x: sp[i].x, y: sp[i].y, s: 1 + 0.6 * f, o: f > 0 && f < 1 ? (1 - f) * 0.9 : 0 });
    });
    /* big labels (they fade as the path folds) */
    const bigOut = ramp(ctx, tt, fold[0] - 0.02, fold[0] + 0.22);
    labels.forEach((n, i) => {
      const inU = ramp(ctx, tt, drawAt[i] + 0.06, drawAt[i] + 0.46, "land");
      let o = inU * (1 - bigOut);
      if (i === 2) o *= 1 - ramp(ctx, tt, K.owner - 0.04, K.owner + 0.12);
      if (M) place(n, { x: ST[i].x + SD / 2 + 32 + n.offsetWidth / 2 + (1 - inU) * 26, y: ST[i].y, o });
      else place(n, { x: ST[i].x, y: ST[i].y + SD / 2 + 40 + (1 - inU) * 18, o });
    });
    /* the role that rolls in the last label's place */
    {
      const bx = M ? ST[2].x + SD / 2 + 32 : ST[2].x - bigFont * 3;
      const by = M ? ST[2].y - bigFont * 0.625 : ST[2].y + SD / 2 + 40 - bigFont * 0.625;
      roleBox.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px)`;
      roleBox.style.opacity = String(1 - bigOut);
      roles.forEach((n, i) => {
        const inU = ramp(ctx, tt, roleAt[i] - 0.02, roleAt[i] + 0.3, "power3.out");
        const outU = i < 2 ? ramp(ctx, tt, roleAt[i + 1] - 0.02, roleAt[i + 1] + 0.24, "power3.in") : 0;
        const y = (1 - inU) * bigFont * 1.2 - outU * bigFont * 1.2;
        const w = n.offsetWidth;
        const x = M ? w / 2 : bigFont * 3;
        place(n, { x, y: bigFont * 0.625 + y, o: inU * (1 - outU) });
      });
    }
    /* small labels on the thin line (above the dots) */
    small.forEach((n, i) => {
      const u = ramp(ctx, tt, fold[1] - 0.16, fold[1] + 0.2, "power2.out") * (1 - gone);
      place(n, { x: LINE[i].x, y: LINE[i].y - (M ? 44 : 40) + (1 - u) * 10, o: u });
    });
    /* "Licensed payment processor" writes in under Paystack */
    {
      const w = ramp(ctx, tt, K.licensed, K.licensed + 0.6, "power1.inOut");
      licensed.style.clipPath = `inset(-6px ${(100 - w * 100).toFixed(2)}% -6px 0)`;
      place(licensed, { x: LINE[1].x, y: LINE[1].y + (M ? 40 : 38), o: w > 0 ? 1 - gone : 0 });
    }
    /* the tray: in with Paystack, empty all the way, out before the fold */
    {
      const inU = ramp(ctx, tt, drawAt[1] + 0.18, drawAt[1] + 0.6, "land");
      const outU = ramp(ctx, tt, fold[0] - 0.18, fold[0] + 0.1, "power2.in");
      const breathe = 1 + 0.05 * Math.max(0, spring(tt, K.goes + 0.05, { freq: 1.6, decay: 3.5 }));
      place(trayBox, { x: TRAY.x, y: TRAY.y, s: (M ? 1 : 0.86) * (0.92 + 0.08 * inU) * (1 - 0.1 * outU), o: inU * (1 - outU) });
      trayRing.style.transform = `scale(${breathe.toFixed(4)})`;
    }
  });
  ctx.sfx("whoosh_short", K.goes - 0.02, { offset: -4 });
  ctx.sfx("ding_pay", K.owner, { offset: 0 });

  /* ================= the big words (row 29) ================= */
  const type = ctx.scene("c29-type", K.r29 - 0.05, K.r30 + 0.12, { z: 10 });
  {
    ctx.hideCaptions(K.r29, K.r30);
    ctx.sfx("whoosh_short", K.r29, { offset: -2 });
    const font = (size) => `700 ${size}px "C Poppins"`;
    const pill = { x: L.PILL.cx, y: (L.PILL.top + L.PILL.bottom) / 2 };
    const mk = (parts, size) => {
      const n = ctx.el("div", { class: "abs c-display", style: { left: "0px", top: "0px", fontSize: `${size}px`, color: "#0b1230", whiteSpace: "nowrap", lineHeight: "1.02" } }, type);
      parts.forEach(([text, blue]) => ctx.el("span", { text, style: blue ? { color: "var(--electric)" } : {} }, n));
      return n;
    };
    if (M) {
      /* two lines: "Vallo never" from the left (top y 300), "holds your money." from the right (top y 420) */
      let s1 = 98;
      let s2 = 94;
      const fit = (txt, size, max) => { const w = measure(txt, font(size)); return w > max ? Math.floor((size * max) / w) : size; };
      s2 = fit("holds your money.", s2, 860);
      s1 = Math.min(s1, Math.round(s2 * 1.05));
      const l1 = mk([["Vallo never", false]], s1);
      const l2 = mk([["holds your ", false], ["money.", true]], s2);
      const w1 = measure("Vallo never", font(s1));
      const w2 = measure("holds your money.", font(s2));
      const c1 = { x: 76 + w1 / 2, y: 300 + s1 * 0.51 };
      const c2 = { x: 940 - w2 / 2, y: 420 + s2 * 0.51 };
      during(ctx, K.r29 - 0.05, K.r30 + 0.12, (tt) => {
        const a = ramp(ctx, tt, K.r29, K.r29 + 0.5, "land");
        const b = ramp(ctx, tt, K.holds - 0.16, K.holds + 0.34, "land");
        const o = ramp(ctx, tt, K.r30 - 0.2, K.r30 + 0.06, "power2.in");
        const sOut = mix(1, 0.3, o);
        place(l1, { x: mix(mix(-w1 / 2 - 40, c1.x, a), pill.x, o), y: mix(c1.y, pill.y, o), s: sOut, o: Math.min(1, a * 4) * (1 - o) });
        place(l2, { x: mix(mix(ctx.W + w2 / 2 + 40, c2.x, b), pill.x, o), y: mix(c2.y, pill.y, o), s: sOut, o: Math.min(1, b * 4) * (1 - o) });
      });
    } else {
      /* one line across the top (y 110-250), the halves from opposite sides */
      let s = 104;
      const full = "Vallo never holds your money.";
      const wFull = measure(full, font(s));
      if (wFull > 1640) s = Math.floor((s * 1640) / wFull);
      const space = measure("x x", font(s)) - measure("xx", font(s));
      const wa = measure("Vallo never", font(s)) + space;
      const wb = measure("holds your money.", font(s));
      const total = wa + wb;
      const x0 = ctx.W / 2 - total / 2;
      const la = mk([["Vallo never", false]], s);
      const lb = mk([["holds your ", false], ["money.", true]], s);
      const ca = { x: x0 + measure("Vallo never", font(s)) / 2, y: 180 };
      const cb = { x: x0 + wa + wb / 2, y: 180 };
      during(ctx, K.r29 - 0.05, K.r30 + 0.12, (tt) => {
        const a = ramp(ctx, tt, K.r29, K.r29 + 0.5, "land");
        const b = ramp(ctx, tt, K.holds - 0.16, K.holds + 0.34, "land");
        const o = ramp(ctx, tt, K.r30 - 0.2, K.r30 + 0.06, "power2.in");
        const sOut = mix(1, 0.3, o);
        place(la, { x: mix(mix(-400, ca.x, a), pill.x - 120, o), y: mix(ca.y, pill.y, o), s: sOut, o: Math.min(1, a * 4) * (1 - o) });
        place(lb, { x: mix(mix(ctx.W + 500, cb.x, b), pill.x + 120, o), y: mix(cb.y, pill.y, o), s: sOut, o: Math.min(1, b * 4) * (1 - o) });
      });
    }
  }

  /* ================= the coin (rows 28 to 31) ================= */
  const coinScene = ctx.scene("c28-coin", K.r28, K.r32 + 0.06, { z: 9 });
  const C = coin(ctx, coinScene, { size: COIN_D });
  {
    const IN = COIN_IN[ctx.film];
    const land = K.r28 + 0.3; // on the lock
    const up = K.pay + 0.07; // let go on "pay"
    const s0 = ST[0];
    during(ctx, K.r28, K.r32 + 0.06, (tt) => {
      let x, y, size, spin, tilt = 0, sy = 1, shadow = 0;
      if (tt < K.r29 - 0.08) {
        /* 28: down to the lock, rest, spring up on "pay" */
        const a = ramp(ctx, tt, K.r28, land, "power2.out");
        const ay = ramp(ctx, tt, K.r28, land, "power2.in");
        x = mix(IN.x, LOCK.x, a);
        y = mix(IN.y, LOCK.y, ay);
        size = mix(IN.size, LOCK_D, a);
        spin = IN.spin + track(ctx, tt, [[K.r28, 0], [land, 720, "power3.out"]]);
        const kick = spring(tt, land, { freq: 3.2, decay: 10 });
        sy = 1 - 0.1 * kick;
        const u = ramp(ctx, tt, up, up + 0.24, "power2.out");
        y -= u * (M ? 140 : 110);
        x += u * (M ? -40 : -30);
        size = mix(size, COIN_D, ramp(ctx, tt, up, up + 0.3));
        spin += track(ctx, tt, [[up, 0], [up + 0.5, 360, "power2.out"]]);
        sy *= 1 + 0.08 * Math.max(0, spring(tt, up, { freq: 2.4, decay: 7 }));
        const hang = ramp(ctx, tt, up + 0.24, K.r29 + 0.3, "sine.inOut");
        y += Math.sin(hang * Math.PI) * 10;
        tilt = 10 * Math.sin((tt - up) * 5) * ramp(ctx, tt, up, up + 0.2);
      } else if (tt < K.r30) {
        /* 29: the drop onto Your card */
        const start = { x: LOCK.x + (M ? -40 : -30), y: LOCK.y - (M ? 140 : 110) };
        const t0 = K.r29 - 0.08;
        const t1 = drawAt[0] + 0.24;
        const a = ramp(ctx, tt, t0, t1, "power1.inOut");
        const ay = ramp(ctx, tt, t0, t1, "power2.in");
        x = mix(start.x, s0.x, a);
        y = mix(start.y, s0.y, ay) - Math.sin(a * Math.PI) * (M ? 60 : 50);
        size = COIN_D;
        spin = 360 + track(ctx, tt, [[t0, 0], [t1, 360, "power2.out"]]);
        sy = 1 - 0.12 * spring(tt, t1, { freq: 3, decay: 9 });
        shadow = ramp(ctx, tt, t1 - 0.1, t1);
      } else {
        /* 30-31: the run, then riding the bank station into the thin line */
        const q = [0, 1, 2].map((i) => stationPos(i, tt));
        const lift = ramp(ctx, tt, K.r30 + 0.26, K.r30 + 0.38, "power2.out") * (1 - ramp(ctx, tt, K.r30 + 0.38, K.r30 + 0.5, "power2.in"));
        const a = ramp(ctx, tt, K.r30 + 0.38, K.goes, "power2.in");
        const b = ramp(ctx, tt, K.goes, K.owner, "power3.out");
        if (tt < K.goes) {
          x = mix(q[0].x, q[1].x, a);
          y = mix(q[0].y, q[1].y, a) - lift * 10;
        } else {
          x = mix(q[1].x, q[2].x, b);
          y = mix(q[1].y, q[2].y, b);
        }
        size = COIN_D * (q[2].d / SD) * (tt > K.owner ? 1 : 1) + (1 - q[2].d / SD) * 0;
        size = mix(COIN_D, SMALL * 0.9, q[2].u);
        spin = 720 + track(ctx, tt, [[K.r30 + 0.38, 0], [K.goes, 360, "power2.in"], [K.owner, 720, "power3.out"]]);
        sy = 1 - 0.1 * spring(tt, K.owner, { freq: 3, decay: 8 });
        shadow = 1 - ramp(ctx, tt, K.r30 + 0.3, K.r30 + 0.4) + ramp(ctx, tt, K.owner - 0.1, K.owner);
      }
      const gone = ramp(ctx, tt, K.r32 - 0.24, K.r32 - 0.04, "power2.in");
      C.set({ x, y, size, spin, tilt, opacity: 1 - gone, shadow: shadow * 0.8 });
      C.body.style.transform += ` scaleY(${sy.toFixed(4)})`;
    });
  }

  /* ================= the three answered cards (row 31) ================= */
  const cards = ctx.scene("c31-cards", K.r31 + 0.3, K.r32 + 0.06, { z: 11 });
  {
    const slot = L.CARD_SLOT;
    const w = slot[0].w;
    const h = slot[0].h;
    const fs = M ? 35 : 44;
    const pad = M ? 28 : 36;
    const tickSize = M ? 58 : 64;
    const c3 = slotCard(ctx, cards, { w, h, q: QUESTIONS[2].q, a: QUESTIONS[2].a, fs, pad, tickSize });
    c3.tick.style.visibility = "hidden";
    const c2 = slotCard(ctx, cards, { w, h, q: QUESTIONS[1].q, fs, pad, tickSize });
    const c1 = slotCard(ctx, cards, { w, h, q: QUESTIONS[0].q, fs, pad, tickSize });
    const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const S0 = centre(slot[0]);
    const S1 = centre(slot[1]);
    const S2 = centre(slot[2]);
    const turnAt = K.processor;
    ctx.sfx("pop", turnAt + 0.04, { offset: 0 });
    ctx.sfx("success", K.processorEnd + 0.08, { offset: -2 });
    ctx.sfx("card_slide", K.r31 + 0.7, { offset: -4 });
    const off = K.r32 - 0.27; // they fly off in three directions (72.42)
    during(ctx, K.r31 + 0.3, K.r32 + 0.06, (tt) => {
      /* card 3 swings in from above like a hanging card, then turns over */
      const a = ramp(ctx, tt, K.r31 + 0.66, turnAt - 0.06, "power3.out");
      const swing = track(ctx, tt, [[K.r31 + 0.66, -28], [turnAt - 0.2, 7, "power2.out"], [turnAt + 0.1, -2, "sine.inOut"], [turnAt + 0.4, 0, "sine.inOut"]]);
      const f3 = ramp(ctx, tt, off, off + 0.26, "power3.in");
      place(c3.root, { x: S1.x, y: mix(S1.y - (M ? 900 : 640), S1.y, a) - f3 * (M ? 900 : 700), r: swing, o: a > 0 ? 1 : 0 });
      const turn = ramp(ctx, tt, turnAt, turnAt + 0.62, "back.out(1.4)");
      c3.inner.style.transform = `rotateY(${(turn * 180).toFixed(2)}deg)`;
      /* cards 2 and 1 fly back in from where they left (top left, top right) */
      const b2 = ramp(ctx, tt, turnAt + 0.08, turnAt + 0.6, "power3.out");
      const b1 = ramp(ctx, tt, turnAt + 0.18, turnAt + 0.7, "power3.out");
      const f2 = ramp(ctx, tt, off + 0.02, off + 0.26, "power3.in");
      const f1 = ramp(ctx, tt, off + 0.04, off + 0.26, "power3.in");
      place(c2.root, { x: mix(-w, S0.x, b2) - f2 * (M ? 700 : 900), y: mix(-h, S0.y, b2), r: mix(-34, 0, b2) - f2 * 16, o: b2 > 0 ? 1 : 0 });
      place(c1.root, { x: mix(ctx.W + w, S2.x, b1) + f1 * (M ? 700 : 900), y: mix(-h, S2.y, b1), r: mix(34, 0, b1) + f1 * 16, o: b1 > 0 ? 1 : 0 });
      /* the ticks pop once all three sit in the row */
      [c2, c1].forEach((c, i) => {
        const u = ramp(ctx, tt, K.processorEnd + 0.06 + i * 0.06, K.processorEnd + 0.36 + i * 0.06, "back.out(2.4)");
        c.tick.style.transform = `scale(${u.toFixed(3)})`;
        c.tick.style.opacity = String(Math.min(1, u * 3));
      });
    });
  }
}
