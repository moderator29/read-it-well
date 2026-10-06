import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/**
 * The wait, on any auth screen that does not draw its own.
 *
 * Most screens in the group now have a loading file of their own, each the
 * shape of its form (`AuthScreenSkeleton`). This is the fallback for the
 * rest, and it is drawn with the same primitive rather than its own sizes
 * (R3-09), so a screen that lands here waits in the same grammar: the title,
 * one line, a field and the pill, inside the Island the layout keeps painted.
 */
export default function LoadingAuth() {
  return <AuthScreenSkeleton sub={1} fields={["field"]} />;
}
