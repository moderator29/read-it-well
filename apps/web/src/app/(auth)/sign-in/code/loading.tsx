import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on sign in with a code: the address and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignInCode() {
  return <AuthScreenSkeleton sub={2} fields={["field"]} />;
}
