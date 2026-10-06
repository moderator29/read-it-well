"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";
import { useMotionGate } from "@/components/motion/useMotionGate";

/**
 * THE ONE PLACE FRAMER-MOTION IS LOADED (D34, D39).
 *
 * framer-motion is in the bundle for four things CSS does badly: a drag that
 * follows the finger (`useMotionValue` with `useTransform`), an exit that
 * must finish before unmount (`AnimatePresence`), an indicator shared across
 * positions (`layoutId`), and a spring that can be interrupted mid-flight.
 * Everything on a known track with a known end stays CSS, and that split is
 * the rule, not this file's convenience.
 *
 * Measured on 12.43.0, minified and gzipped: the top-level `motion` import
 * costs 41.5KB; `LazyMotion` with the `m` namespace costs 7.0KB, and its
 * `domAnimation` feature bundle another 24.1KB. So components use `m` and
 * nothing else, and the features arrive in their own chunk after first
 * paint (`motion-features.ts`): an `m` component renders its initial state
 * without them, so first load on a budget Android carries 7KB, not 31.
 * `strict` makes a stray `motion.div` throw in development rather than
 * quietly pulling the full bundle back in, and the
 * `no-restricted-imports` rule in `eslint.config.mjs` stops it reaching a
 * commit at all. There is exactly one provider, here, mounted once in the
 * root layout.
 *
 * Reduced motion follows the platform's own gate (`useMotionGate`), the same
 * answer the stylesheets use: the system preference, or Settings > Appearance
 * > Motion set to Calm or Off. Under it every framer animation jumps to its
 * end state, so a spring never plays for somebody who asked for stillness.
 */
const loadFeatures = () => import("./motion-features").then((bundle) => bundle.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  const { quiet } = useMotionGate();
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={quiet ? "always" : "never"}>{children}</MotionConfig>
    </LazyMotion>
  );
}
