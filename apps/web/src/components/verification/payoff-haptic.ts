import { feedback } from "@/lib/ui/feedback";

/**
 * ONE HEAVY HAPTIC, ON THE POP (CRAFT_DOCTRINE 6: "heavy, rare: verification
 * passed"). The motion is CSS; this only listens for the stylesheet's pop to
 * start, so what is felt lands on the frame that is seen.
 *
 * Where no pop is scheduled (reduced motion, Calm, Off, data saving) the
 * settled state IS the payoff, and it is felt now: `feedback` keeps "success"
 * for a reader who asked for less motion. A pop that already ran before this
 * was attached (a slow page) is not felt late; one caught mid-pop is felt now.
 * Returns the cleanup.
 */
export function hapticOnPop(root: HTMLElement, pop: string): () => void {
  let felt = false;
  const feel = () => {
    if (felt) return;
    felt = true;
    feedback("success");
  };
  const onStart = (event: AnimationEvent) => {
    if (event.animationName === pop) feel();
  };
  root.addEventListener("animationstart", onStart);
  const pops =
    typeof root.getAnimations === "function"
      ? root
          .getAnimations({ subtree: true })
          .filter((a) => (a as CSSAnimation).animationName === pop)
      : [];
  if (pops.length === 0) feel();
  else {
    const a = pops[0]!;
    const t = Number(a.currentTime ?? 0);
    const timing = a.effect?.getComputedTiming();
    const delay = Number(timing?.delay ?? 0);
    const end = Number(timing?.endTime ?? 0);
    if (t >= delay && t < end) feel();
  }
  return () => root.removeEventListener("animationstart", onStart);
}
