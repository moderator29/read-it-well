import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on sign in: two fields, the pill and the two lines under it. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignIn() {
  return <AuthScreenSkeleton fields={["field", "field"]} links={2} />;
}
