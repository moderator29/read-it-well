import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on the sign-up code: the address, the six rings and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignUpVerify() {
  return <AuthScreenSkeleton sub={3} fields={["field", "code"]} />;
}
