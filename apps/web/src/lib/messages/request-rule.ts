/**
 * WHO LANDS IN REQUESTS (founder, 11 October 2026). Pure, so it is tested
 * rather than trusted.
 *
 * A message from somebody the reader does not follow waits in Requests. Three
 * facts take a thread out of there: the reader follows the person on the other
 * side (`public.follows`, read for the reader), the reader has written in it,
 * or the reader opened it (an enquiry somebody sent is theirs from the first
 * second, before anybody answers).
 *
 * One more, kept from 9 October: a chat between two members skips Requests
 * when the reader set "Anyone can message me" (`social_profiles.contact_policy`
 * OPEN), because that setting promises exactly that. Listing, table and stay
 * threads are not touched by it.
 */
export type RequestFacts = {
  /** The reader has sent at least one message in the thread. */
  spokenIn: boolean;
  /** The reader opened the thread (they are its `guest_id`). */
  openedByReader: boolean;
  /** The reader follows the person on the other side. */
  readerFollows: boolean;
  /** A chat between two members, not about a listing, a table or a stay. */
  direct: boolean;
  /** The reader's own contact policy is OPEN. */
  openToAnyone: boolean;
};

export function isRequestThread(facts: RequestFacts): boolean {
  if (facts.readerFollows || facts.spokenIn || facts.openedByReader) return false;
  if (facts.direct && facts.openToAnyone) return false;
  return true;
}
