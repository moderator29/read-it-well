import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on the last step of sign up: the name pair and the pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignUpFinish() {
  return <AuthScreenSkeleton fields={["pair"]} links={0} />;
}
