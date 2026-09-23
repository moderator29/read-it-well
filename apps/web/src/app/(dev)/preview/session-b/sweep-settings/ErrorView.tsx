"use client";

import AppError from "@/app/(app)/error";

/** The in-app error boundary as it draws, with a fixture error and a no-op retry. */
export function ErrorView() {
  const error = Object.assign(new Error("fixture"), { digest: "4107723981" });
  return <AppError error={error} reset={() => undefined} />;
}
