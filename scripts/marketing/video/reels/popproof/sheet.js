/* A proof sheet for the pop-out containers and the deep transitions. */
import { ground, popOut, figureOut, slabWipe, shutter, irisTicks, tileFall, whipPan } from "../../films/kit.js";

export function build(ctx) {
  const M = ctx.isMobile;
  const S = M ? 34 : 28;

  const a = ground(ctx, 0, 5, { tone: "navy" });
  popOut(ctx, a, { kind: "line", x: ctx.W * 0.5, y: ctx.H * 0.18, t0: 0.3, t1: 4.4, size: S, tab: "Example",
    lucide: "bed-double", title: "Room booked", line: "Lagoon Crest Resort · 3 nights", example: true });
  popOut(ctx, a, { kind: "stat", x: ctx.W * 0.5, y: ctx.H * 0.40, t0: 0.6, t1: 4.4, size: S, tab: "Move-in total",
    lucide: "receipt", label: "Every fee added up", figure: "₦26.1m", unit: "in total", note: "Vallo charges no inspection fee." });
  popOut(ctx, a, { kind: "cells", x: ctx.W * 0.5, y: ctx.H * 0.63, t0: 0.9, t1: 4.4, size: S, tab: "The whole cost",
    lucide: "receipt-text", title: "What you will actually pay", cells: [["Rent", "₦18m"], ["Fees", "₦4.5m"], ["Refundable", "₦3.6m"]] });
  popOut(ctx, a, { kind: "counters", x: ctx.W * 0.5, y: ctx.H * 0.80, t0: 1.2, t1: 4.4, size: S, ticks: true,
    items: [["home", "Homes"], ["hotel", "Stays"], ["utensils", "Tables"]] });

  slabWipe(ctx, 5, { dir: "left" });

  const b = ground(ctx, 5, 8, { tone: "day" });
  popOut(ctx, b, { kind: "stat", x: ctx.W * 0.5, y: ctx.H * 0.3, t0: 5.2, t1: 7.5, size: S, tone: "day", tab: "Asking",
    lucide: "key-round", label: "Villa in Maitama", figure: "₦18m", unit: "a year" });
  popOut(ctx, b, { kind: "line", x: ctx.W * 0.5, y: ctx.H * 0.55, t0: 5.4, t1: 7.5, size: S, tone: "day", tab: "Checked",
    lucide: "shield-check", title: "Checked by a real person", line: "At Vallo, before the mark is given" });
  figureOut(ctx, b, { text: "₦0 held", x: ctx.W * 0.5, y: ctx.H * 0.76, size: M ? 150 : 120, t0: 5.8, t1: 7.5, tone: "day" });

  shutter(ctx, 8);

  const c = ground(ctx, 8, 10.5, { tone: "electric" });
  popOut(ctx, c, { kind: "stat", x: ctx.W * 0.5, y: ctx.H * 0.35, t0: 8.2, t1: 10.1, size: S, accent: "electric",
    tab: "Live", lucide: "trending-up", label: "Price check, Lekki", figure: "₦8.4m", unit: "a year" });
  figureOut(ctx, c, { text: "+₦1,800,000", x: ctx.W * 0.5, y: ctx.H * 0.6, size: M ? 130 : 110, t0: 8.4, t1: 10.1 });

  irisTicks(ctx, 10.5);
  const d = ground(ctx, 10.5, 12, { tone: "violet" });
  void d;
  tileFall(ctx, 12);
  const e = ground(ctx, 12, 14, { tone: "dusk" });
  whipPan(ctx, 13);
  void e;
}
