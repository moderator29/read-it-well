"use client";

import RootError from "@/app/error";

/**
 * The root error boundary rendered with fixture props. A boundary cannot be
 * routed to directly, so the same component is mounted here with an error
 * carrying a digest, and `reset` does nothing. The proof of the look only.
 */
const FIXTURE = Object.assign(new Error("fixture"), { digest: "1f3a9c2e7b" });

export default function PreviewRootError() {
  return <RootError error={FIXTURE} reset={() => undefined} />;
}
