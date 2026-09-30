import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on the sign-up form: the name pair, the address and the password. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignUpEmail() {
  return <AuthScreenSkeleton fields={["pair", "field", "field"]} links={0} />;
}
