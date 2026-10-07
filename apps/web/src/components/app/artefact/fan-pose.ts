import type { CredentialMaterial } from "./Credential";

/**
 * WHERE A CREDENTIAL SITS IN THE FAN, by its distance from the chosen one.
 *
 * Pure, so the geometry is tested rather than eyeballed. The chosen
 * credential is at 0: centred, full size, fully opaque, on top. Each step
 * away moves it 22 per cent of a card's width to its side, 4 per cent down,
 * 8 per cent smaller, 5 degrees turned and less opaque, so the stack reads
 * as three objects overlapping with depth (14.4: "the others receding in
 * scale and opacity"). Two steps is the furthest anything is drawn: a fourth
 * or fifth credential waits fully transparent behind the second, so a long
 * ladder never fans off the edge of a phone.
 */
export type FanPose = {
  /** Sideways, in per cent of the card's own width. */
  x: number;
  /** Downward, in per cent of the card's own height. */
  y: number;
  scale: number;
  /** Degrees. */
  turn: number;
  opacity: number;
  z: number;
};

export function fanPose(offset: number): FanPose {
  const away = Math.abs(offset);
  const reach = Math.min(away, 2);
  const side = Math.sign(offset);
  return {
    x: side * reach * 22,
    y: reach * 4,
    scale: Number((1 - reach * 0.08).toFixed(2)),
    turn: side * reach * 5,
    opacity: away === 0 ? 1 : away > 2 ? 0 : Number((1 - away * 0.3).toFixed(2)),
    z: 10 - away,
  };
}

/**
 * A ladder's material by standing (14.4: a quiet difference per tier): the
 * top tier is navy with the warm edge, the one below it royal, every one
 * below that matte navy.
 */
export function materialForStep(step: number, steps: number): CredentialMaterial {
  if (step >= steps) return "edge";
  return step === steps - 1 ? "royal" : "navy";
}
