/**
 * The words a person reads before they block somebody.
 *
 * In a plain module rather than beside the action, because a "use server"
 * module may export async functions and nothing else. It is imported by the
 * action file and by every surface that offers the control, so the promise
 * made in the confirmation and the behaviour of `public.blocks` are described
 * in exactly one place.
 */
export const BLOCK_CONFIRM_COPY =
  "They will not be able to message you, see your profile or find your listings, and you will not see theirs. They are not told. You can undo this in Settings, Privacy.";
