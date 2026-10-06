import { domAnimation } from "framer-motion";

/**
 * framer-motion's animation features, in a chunk of their own so
 * `MotionProvider` can fetch them after first paint. Measured on 12.43.0,
 * minified and gzipped: `domAnimation` is 24.1KB of the 31.4KB the library
 * costs, and the `m` components render their initial state without it, so
 * nothing a person sees on arrival waits for it. The larger bundle, with
 * layout projection and drag built in, is deliberately not used.
 */
export default domAnimation;
