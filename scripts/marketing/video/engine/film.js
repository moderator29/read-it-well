/**
 * The film page's entry. /film.html?film=mobile|desktop[&scenes=a,b][&t=12.5][&captions=0]
 *
 * Builds every scene module listed in /video/scenes/index.js (or the ones
 * named in `scenes`), the captions and the grain, then waits for every image
 * and font. The renderer drives it through window.__film.seek(t).
 */
import { createContext } from "./core.js";
import { installCaptions, installGrain, installChapterPill } from "./components.js";

const q = new URLSearchParams(location.search);
const film = q.get("film") === "desktop" ? "desktop" : "mobile";

try {
  const list = q.get("scenes") ? q.get("scenes").split(",") : (await import("/video/scenes/index.js")).SCENES;
  const stage = document.getElementById("stage");
  const ctx = await createContext({ film, stage });
  /* The ending: "soon" (Coming soon on iPhone and Android, no badges) or
     "live" (the official store badges; only once Vallo is in both stores). */
  ctx.ending = q.get("ending") === "live" ? "live" : "soon";
  window.__ctx = ctx;
  for (const id of list) {
    const mod = await import(`/video/scenes/${id}.js`);
    await mod.build(ctx);
  }
  if (q.get("captions") !== "0") installCaptions(ctx);
  const { CHAPTERS, groundAt } = await import("/video/scenes/chapters.js");
  ctx.groundAt = groundAt;
  if (q.get("pill") !== "0") installChapterPill(ctx, CHAPTERS, { theme: groundAt });
  if (q.get("grain") === "1") installGrain(ctx);
  await Promise.all(ctx.pending ?? []);
  await ctx.finish();
  ctx.seek(Number(q.get("t") ?? 0));
  window.__film = {
    film,
    duration: ctx.duration,
    seek: (t) => ctx.seek(t),
    cues: () => ctx.cues,
    scenes: () => ctx.scenes.map((s) => ({ id: s.id, start: s.start, end: s.end })),
  };
  window.__ready = true;
} catch (error) {
  window.__error = `${error?.message ?? error}\n${error?.stack ?? ""}`;
  console.error(window.__error);
}
