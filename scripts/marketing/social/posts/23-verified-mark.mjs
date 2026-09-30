/* 23 · "The verified mark means a real person checked." In daylight: the
 * verification steps an owner goes through (step 1 of 5, a government ID),
 * the mark shown beside the role words it can belong to, never on a house,
 * and the moment it is added, labelled Example. */
import { grain, icon, page, phoneHtml, popup } from "../lib/kit.mjs";

const ROLES = ["Owner", "Host", "Hotel", "Restaurant"];

export default {
  id: "23",
  file: "23-verified-mark.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "verification", model: "android", color: "silver", rotation: { x: 4, y: -24, z: 0 }, fov: 26, h: 900, cx: 818, top: 380,
      shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16, color: "#101A4A" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#EEF2FB",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 40% at 90% 30%, rgba(92,159,255,.30), rgba(92,159,255,0) 70%),
        radial-gradient(50% 40% at 0% 100%, rgba(197,216,255,.8), rgba(197,216,255,0) 70%),
        linear-gradient(180deg,#F6F8FE 0%,#ECF1FB 100%)}
      .head{position:absolute;left:76px;top:92px;font-size:66px;color:#070B2A;line-height:1.06}
      .sub{position:absolute;left:80px;top:258px;width:560px;font:500 28px/1.42 Inter;color:#3B4262;letter-spacing:-.005em}
      .roles{position:absolute;left:76px;top:500px;display:flex;flex-direction:column;gap:18px}
      .role{display:inline-flex;align-items:center;gap:14px;height:74px;padding:0 26px 0 22px;border-radius:24px;background:#fff;
        font:650 30px/1 Inter;color:#070B2A;letter-spacing:-.01em;box-shadow:0 18px 40px rgba(20,30,90,.10), 0 2px 6px rgba(20,30,90,.05);border:1px solid rgba(2,6,63,.06);width:max-content}
      .role .b{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#0069FE;box-shadow:0 6px 16px rgba(0,105,254,.35)}
      .foot{position:absolute;left:76px;bottom:56px}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.04, "soft-light")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      <div class="head h">The verified mark means<br><span class="accent-l">a real person checked.</span></div>
      <div class="sub">Owners, hosts, hotels and restaurants with the mark have been checked by a real person at Vallo.</div>
      <div class="roles">
        ${ROLES.map((r, i) => `<div class="role" style="margin-left:${[0, 44, 16, 60][i]}px">${r}<span class="b">${icon("check", { size: 24, color: "#fff", stroke: 3 })}</span></div>`).join("")}
      </div>
      <div class="abs" style="left:76px;top:1012px">${popup({ theme: "light", icon: { lucide: "badge-check", tint: "#0069FE" }, title: "Checked by a person", sub: "Verified mark added", chipText: "Example", time: "now", width: 580 })}</div>
      `,
    }),
};
