import { AuthScreenSkeleton } from "@/components/auth/AuthScreenSkeleton";

/** The wait, on sign up: the ways in, a pill, the rule and the quiet pill. The auth layout's bowl and ring stay painted around it. */
export default function LoadingSignUp() {
  return <AuthScreenSkeleton sub={1} divider quiet links={0} />;
}
