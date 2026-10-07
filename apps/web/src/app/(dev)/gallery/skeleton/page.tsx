import { openOrNotFound } from "../_system/gate";
import { SkeletonBoard } from "./SkeletonBoard";

/**
 * Shaped skeletons and SkeletonSwap, MOUNTED SO THEY CAN BE LOOKED AT (B-33). Gated by `../_system/gate.ts`,
 * which is the same gate as `../page.tsx`: a 404 unless the preview harness
 * is open, and never open on Vercel.
 */
export default function Page() {
  openOrNotFound();
  return <SkeletonBoard />;
}
