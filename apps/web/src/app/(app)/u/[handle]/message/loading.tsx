import { LoadingPeople } from "@/components/social/profile/LoadingPeople";

/** The wait before a message screen opens: a quiet people skeleton, not the profile's cover. */
export default function LoadingMessage() {
  return <LoadingPeople />;
}
