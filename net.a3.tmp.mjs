import { chromium } from "playwright-core";
const routes = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const r of routes) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const reqs = [];
  page.on("response", async (res) => {
    try {
      const h = res.headers();
      const len = Number(h["content-length"] || 0);
      reqs.push({ url: res.url().replace("http://localhost:3210",""), type: res.request().resourceType(), len });
    } catch {}
  });
  await page.goto("http://localhost:3210" + r, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const byType = {};
  for (const q of reqs) { byType[q.type] = (byType[q.type]||0) + (q.len||0); }
  console.log("=== " + r + " ===  requests:", reqs.length);
  console.log(" bytes by type:", Object.entries(byType).map(([k,v])=>`${k}=${(v/1024).toFixed(0)}KB`).join(" "));
  const imgs = reqs.filter(q=>q.type==="image").sort((a,b)=>b.len-a.len).slice(0,10);
  console.log(" top images:"); for (const i of imgs) console.log("   ", (i.len/1024).toFixed(0)+"KB", i.url.slice(0,110));
  const scripts = reqs.filter(q=>q.type==="script");
  console.log(" scripts:", scripts.length, "total", (scripts.reduce((s,x)=>s+x.len,0)/1024).toFixed(0)+"KB");
  await ctx.close();
}
await browser.close();
