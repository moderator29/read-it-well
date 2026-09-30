import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on a new password: the two fields and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingResetPassword() {
  return <AuthScreenSkeleton sub={1} fields={["field", "field"]} links={0} />;
}
