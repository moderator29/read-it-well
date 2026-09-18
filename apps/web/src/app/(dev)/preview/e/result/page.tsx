import { Suspense } from "react";
import { ResultPreview } from "./ResultPreview";

/** The result sheet in each of its states; `?state=` picks one. */
export default function PreviewResult() {
  return (
    <Suspense fallback={null}>
      <ResultPreview />
    </Suspense>
  );
}
