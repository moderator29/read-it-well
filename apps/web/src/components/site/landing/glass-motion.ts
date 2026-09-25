/**
 * The one micro-motion a glass object plays on the landing (Track M): as its
 * card arrives and again on hover. Transform only, 620ms, written on the
 * wrapper as `data-motion` and drawn by `.nf-glass-fx` in motion-kit.css.
 *
 *   rise   lifts a little and settles, as if set down
 *   pop    swells on the spring and settles
 *   tilt   tips as if picked up, and back
 *   turn   turns a quarter, as a key in a lock, and back
 *   swing  swings from its top edge, as a tag on a string
 */
export type GlassMotion = "rise" | "pop" | "tilt" | "turn" | "swing";
