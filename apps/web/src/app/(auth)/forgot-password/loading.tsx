import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on a reset: the address and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingForgotPassword() {
  return <AuthScreenSkeleton sub={2} fields={["field"]} />;
}
