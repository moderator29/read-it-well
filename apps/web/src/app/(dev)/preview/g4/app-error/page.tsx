"use client";

import AppError from "@/app/(app)/error";

/**
 * The in-app error boundary with fixture props. The real one renders inside
 * the `(app)` shell under the header and above the dock; this harness has no
 * shell, so the stage is wrapped in the shell's own content wrapper (`nf-shell`
 * with the section padding) to hold the same gutter.
 */
const FIXTURE = Object.assign(new Error("fixture"), { digest: "8c41d0e5aa" });

export default function PreviewAppError() {
  return (
    <main id="main" className="min-h-dvh">
      <div className="nf-shell py-section-tight">
        <AppError error={FIXTURE} reset={() => undefined} />
      </div>
    </main>
  );
}
