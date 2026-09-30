"use client";

import { useEffect, useMemo } from "react";
import { reportClientError } from "./client";
import { digestFor, shortReference } from "./reference";

/**
 * One call for every error boundary (C13): logs the error to the console
 * (the only record when `SENTRY_DSN` is unset), sends the scrubbed report,
 * and returns the short reference the screen shows. The report and the
 * screen carry the same reference, so support can find one from the other.
 */
export function useErrorReport(error: Error & { digest?: string }, kind: string, label = "[vallo] route error"): string {
  const digest = useMemo(() => digestFor(error), [error]);
  useEffect(() => {
    console.error(label, error);
    reportClientError(error, { kind, digest });
  }, [error, kind, label, digest]);
  return shortReference(digest) ?? "";
}
