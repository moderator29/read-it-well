"use client";

import { useEffect, useRef } from "react";
import { ambientAllowed } from "@/lib/motion/gate";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";

/**
 * THE TRUCHET FIELD (Track M, 25 September 2026).
 *
 * The founder's showreel reference is a field of Truchet tiles: every square
 * carries two quarter-circle arcs joining the midpoints of its edges, and
 * because each tile can sit one of two ways the arcs link across tiles into
 * loops and channels. Turn one tile a quarter and the loops through it
 * re-route. That is the whole trick, and it is a good picture of what Vallo
 * is for: separate pieces that join into one continuous path.
 *
 * Drawn on a canvas in the brand's secondary blue (read from CSS, so a theme
 * change repaints it). Waves of tiles turn outward from a point every few
 * seconds, a turning tile brightens as it moves, the field is brightest at its
 * centre, and the pointer turns the tiles it passes over.
 *
 * Decorative and `aria-hidden`. It draws one still frame and stops when
 * motion is quiet (reduced motion, Calm or Off), when Living backgrounds is
 * off, or with data saving on; it pauses whenever it is off screen or the
 * tab is hidden; and it only repaints while a tile is actually turning.
 */
type Tile = { from: number; to: number; start: number };

const TURN_MS = 720;

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ease(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function TruchetField({
  cell = 48,
  className,
  interactive = true,
  seed = 20260925,
}: {
  cell?: number;
  className?: string;
  interactive?: boolean;
  seed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let tiles: Tile[] = [];
    let colour = "";
    let raf = 0;
    let idle = 0;
    let visible = false;
    let moving = ambientAllowed();
    let busyUntil = 0;
    let nextWave = 0;
    let lastPointer = 0;
    const rand = seeded(seed);

    const readColour = () => {
      colour = getComputedStyle(canvas).color;
    };

    const layout = () => {
      const box = host.getBoundingClientRect();
      w = box.width;
      h = box.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      cols = Math.ceil(w / cell) + 1;
      rows = Math.ceil(h / cell) + 1;
      const pick = seeded(seed);
      tiles = Array.from({ length: cols * rows }, () => {
        const turn = pick() < 0.5 ? 0 : 1;
        return { from: turn, to: turn, start: -1 };
      });
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = colour;
      ctx.lineWidth = Math.max(2, cell * 0.14);
      ctx.lineCap = "round";
      const cx = w / 2;
      const cy = h / 2;
      const reach = Math.max(w, h) * 0.62;
      const half = cell / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = tiles[r * cols + c]!;
          const x = c * cell + half;
          const y = r * cell + half;
          let p = 1;
          if (tile.start >= 0) p = Math.min(1, Math.max(0, (now - tile.start) / TURN_MS));
          const turn = tile.from + (tile.to - tile.from) * ease(p);
          const near = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / reach);
          const lit = p > 0 && p < 1 ? Math.sin(Math.PI * p) * 0.55 : 0;
          ctx.globalAlpha = Math.min(1, 0.09 + near * 0.3 + lit);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((turn * Math.PI) / 2);
          ctx.beginPath();
          ctx.arc(-half, -half, half, 0, Math.PI / 2);
          ctx.moveTo(0, half);
          ctx.arc(half, half, half, Math.PI, Math.PI * 1.5);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    };

    const turnTile = (index: number, at: number) => {
      const tile = tiles[index];
      if (!tile) return;
      if (tile.start >= 0 && at < tile.start + TURN_MS + 240) return;
      tile.from = tile.to;
      tile.to = tile.from + 1;
      tile.start = at;
      busyUntil = Math.max(busyUntil, at + TURN_MS);
    };

    /* A wave: tiles turn outward from a point, a ring at a time. About half
       of the tiles it crosses turn, so the pattern changes rather than
       simply rotating in place. */
    const wave = (now: number) => {
      const oc = rand() < 0.35 ? Math.floor(cols / 2) : Math.floor(rand() * cols);
      const or = rand() < 0.35 ? Math.floor(rows / 2) : Math.floor(rand() * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() > 0.5) continue;
          turnTile(r * cols + c, now + Math.hypot(c - oc, r - or) * 60);
        }
      }
      nextWave = now + 3400 + rand() * 1800;
    };

    /* Frames only while a tile is turning; between waves it sleeps on a
       timer until the next one is due, so an idle field costs nothing. */
    const frame = (now: number) => {
      raf = 0;
      if (!visible || !moving || document.hidden) return;
      if (now >= nextWave) wave(now);
      if (now <= busyUntil + 16) {
        draw(now);
        raf = window.requestAnimationFrame(frame);
        return;
      }
      idle = window.setTimeout(() => {
        idle = 0;
        start();
      }, Math.max(16, nextWave - now));
    };

    const start = () => {
      if (idle !== 0) {
        window.clearTimeout(idle);
        idle = 0;
      }
      if (raf === 0 && visible && moving) raf = window.requestAnimationFrame(frame);
    };

    const still = () => {
      draw(performance.now());
    };

    const onPointer = (event: PointerEvent) => {
      if (!moving || !interactive) return;
      const now = performance.now();
      if (now - lastPointer < 40) return;
      lastPointer = now;
      const box = host.getBoundingClientRect();
      const px = event.clientX - box.left;
      const py = event.clientY - box.top;
      if (px < 0 || py < 0 || px > box.width || py > box.height) return;
      const pc = Math.floor(px / cell);
      const pr = Math.floor(py / cell);
      for (let r = pr - 2; r <= pr + 2; r++) {
        for (let c = pc - 2; c <= pc + 2; c++) {
          if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
          const d = Math.hypot(c - pc, r - pr);
          if (d > 2.2) continue;
          turnTile(r * cols + c, now + d * 45);
        }
      }
      start();
    };

    readColour();
    layout();
    still();

    const sizeWatch = new ResizeObserver(() => {
      layout();
      still();
    });
    sizeWatch.observe(host);

    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
    });
    seen.observe(host);

    /* A theme change repaints in the new blue. */
    const themeWatch = new MutationObserver(() => {
      readColour();
      still();
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const onMotion = () => {
      moving = ambientAllowed();
      if (moving) start();
      else still();
    };
    window.addEventListener(MOTION_EVENT, onMotion);
    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      if (raf !== 0) window.cancelAnimationFrame(raf);
      if (idle !== 0) window.clearTimeout(idle);
      sizeWatch.disconnect();
      seen.disconnect();
      themeWatch.disconnect();
      window.removeEventListener(MOTION_EVENT, onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [cell, interactive, seed]);

  return (
    <div className={`nf-truchet ${className ?? ""}`} aria-hidden="true">
      <canvas ref={canvasRef} className="nf-truchet__canvas" />
    </div>
  );
}
