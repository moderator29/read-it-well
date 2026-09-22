import { chromium } from "playwright-core";
const BASE = "http://127.0.0.1:3220";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const cases = [
  ["/preview/f5/admin-desks", 200],
  ["/preview/f5/admin-desks", 1200],
  ["/preview/f5/admin-desks", 1500],
  ["/preview/f5/admin-desks", 2500],
  ["/preview/f5/admin-desks", 4760],
];
console.log("route".padEnd(28), "marker css y".padStart(13), "found at device y".padStart(18), "expected".padStart(9), "verdict");
for (const [route, y] of cases) {
  const page = await browser.newPage({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: 2, colorScheme: "dark" });
  await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(700);
  await page.evaluate((top) => {
    const m = document.createElement("div");
    m.style.cssText = `position:absolute;left:0;top:${top}px;width:390px;height:24px;background:rgb(255,0,255);z-index:2147483647`;
    document.body.appendChild(m);
  }, y);
  await page.waitForTimeout(200);
  const shot = (await page.screenshot({ type: "png", fullPage: true })).toString("base64");
  const found = await page.evaluate(async ({ src }) => {
    const img = new Image(); img.src = "data:image/png;base64," + src; await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let yy = 0; yy < c.height; yy++) {
      let hit = 0;
      for (let x = 0; x < c.width; x += 4) {
        const i = (yy * c.width + x) * 4;
        if (d[i] > 200 && d[i+1] < 60 && d[i+2] > 200) hit++;
      }
      if (hit > 10) return yy;
    }
    return -1;
  }, { src: shot });
  console.log(
    route.padEnd(28), String(y).padStart(13), String(found).padStart(18), String(y * 2).padStart(9),
    found === -1 ? "MISSING from the capture" : Math.abs(found - y * 2) <= 4 ? "present, correct place" : `present but ${found - y*2} device px out`,
  );
  await page.close();
}
await browser.close();
