import { Suspense } from "react";
import { ResultPreview } from "../../../e/result/ResultPreview";

/** The payment result sheet; `?state=pending|failed|sent|...` picks one. */
export default function SweepResult() {
  return (
    <Suspense fallback={null}>
      <ResultPreview />
    </Suspense>
  );
}
