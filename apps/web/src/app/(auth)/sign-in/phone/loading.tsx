import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on sign in with a phone: the number and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignInPhone() {
  return <AuthScreenSkeleton sub={2} fields={["field"]} />;
}
