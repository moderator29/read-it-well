/* 25 · "Ask the AI assistant, any time of day." A 24-hour dial behind the
 * phone runs from the sun to the moon; the assistant's own suggested
 * questions float off the screen as glass chips. */
import { grain, icon, page, phoneHtml, sticker } from "../lib/kit.mjs";

const CX = 540;
const CY = 836;
const R = 452;

function ticks() {
  const out = [];
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * 360;
    const major = i % 6 === 0;
    out.push(`<div class="tick${major ? " major" : ""}" style="transform:rotate(${a}deg) translateY(-${R}px)"></div>`);
  }
  return out.join("");
}

function ask(iconName, text, style) {
  return `<div class="ask" style="${style}"><span class="ai">${icon(iconName, { size: 26, color: "#8FD3FF", stroke: 2 })}</span>${text}</div>`;
}

export default {
  id: "25",
  file: "25-ai-assistant.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "assistant-caution", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 22, h: 900, cx: CX, top: 412,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#00010F" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#030724",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(38% 30% at 6% 62%, rgba(255,140,60,.38), rgba(255,140,60,0) 72%),
        radial-gradient(30% 26% at 12% 60%, rgba(255,190,120,.25), rgba(255,190,120,0) 70%),
        radial-gradient(40% 32% at 96% 60%, rgba(92,159,255,.30), rgba(92,159,255,0) 72%),
        radial-gradient(60% 40% at 50% 0%, rgba(0,86,208,.30), rgba(0,86,208,0) 70%),
        linear-gradient(180deg,#050B3A 0%,#030724 100%)}
      .stars{position:absolute;left:560px;right:0;top:0;bottom:0;background-image:
        radial-gradient(1.5px 1.5px at 20% 14%, rgba(255,255,255,.8), transparent 60%),
        radial-gradient(1.2px 1.2px at 64% 9%, rgba(255,255,255,.7), transparent 60%),
        radial-gradient(1.4px 1.4px at 82% 28%, rgba(255,255,255,.55), transparent 60%),
        radial-gradient(1.2px 1.2px at 40% 34%, rgba(255,255,255,.45), transparent 60%),
        radial-gradient(1.6px 1.6px at 90% 44%, rgba(255,255,255,.5), transparent 60%)}
      .dial{position:absolute;left:${CX - R}px;top:${CY - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;
        background:conic-gradient(from 180deg, rgba(255,150,80,.0) 0deg, rgba(255,150,80,.55) 70deg, rgba(255,190,140,.45) 110deg, rgba(143,211,255,.45) 250deg, rgba(92,159,255,.55) 290deg, rgba(92,159,255,0) 360deg);
        -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 2px))}
      .halo{position:absolute;left:${CX - R + 40}px;top:${CY - R + 40}px;width:${R * 2 - 80}px;height:${R * 2 - 80}px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(0,105,254,.22),rgba(0,105,254,0))}
      .tick{position:absolute;left:${CX - 1}px;top:${CY - 7}px;width:2px;height:14px;border-radius:2px;background:rgba(200,220,255,.35);transform-origin:1px 7px}
      .tick.major{height:22px;top:${CY - 11}px;transform-origin:1px 11px;background:rgba(220,235,255,.7)}
      .head{position:absolute;left:0;right:0;top:92px;text-align:center;font-size:74px;color:#fff;line-height:1.05}
      .head .day{background:linear-gradient(92deg,#FFB27A 0%,#FFD9BD 40%,#8FD3FF 70%,#5C9FFF 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
      .sub{position:absolute;left:0;right:0;top:272px;text-align:center;font:500 29px/1.4 Inter;color:rgba(214,226,255,.8)}
      .ask{position:absolute;display:flex;align-items:center;gap:14px;height:76px;padding:0 28px 0 16px;border-radius:24px;
        background:rgba(10,16,60,.82);border:1.5px solid rgba(120,170,255,.35);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
        box-shadow:0 30px 70px rgba(0,0,14,.55);font:600 26px/1 Inter;color:#fff;letter-spacing:-.01em;white-space:nowrap}
      .ask .ai{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(92,159,255,.16)}
      `,
      body: `
      <div class="ground"></div>
      <div class="stars"></div>
      <div class="halo"></div>
      <div class="dial"></div>
      ${ticks()}
      ${grain(0.06, "overlay")}
      <div class="abs" style="left:${CX - R - 62}px;top:${CY - 76}px">${sticker("2600-fe0f", 148)}</div>
      <div class="abs" style="left:${CX + R - 84}px;top:${CY - 74}px">${sticker("1f319", 136)}</div>
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="head h">Ask the AI assistant,<br><span class="day">any time of day.</span></div>
      <div class="sub">Prices, areas, or how renting works.<br>In English, Hausa, Yorùbá or Igbo.</div>
      ${ask("search", "Two bedroom in Lekki under 5m a year", "left:60px;top:1010px")}
      ${ask("wallet", "What will it cost me to move in?", "right:60px;top:1112px")}
      `,
    }),
};
