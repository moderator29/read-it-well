import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on the reset code: the address, the code and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingResetCode() {
  return <AuthScreenSkeleton sub={2} fields={["field", "code"]} />;
}
