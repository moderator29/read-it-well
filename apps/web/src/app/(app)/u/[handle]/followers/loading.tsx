import { LoadingPeople } from "@/components/social/profile/LoadingPeople";

/** The wait on a follower list. Its own file so it does not inherit the
    profile's cover-and-avatar skeleton, which is a page this is not. */
export default function LoadingFollowers() {
  return <LoadingPeople />;
}
