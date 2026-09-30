/**
 * The preferences page's refusal for a link that no longer reads (expired,
 * edited or from another deployment). The action returns it; the form
 * recognises it and shows the reader's own language (publicDoors.prefs
 * invalidTitle and invalidBody). Kept out of the "use server" file, which
 * may only export actions.
 */
export const INVALID_PREFS_LINK =
  "This link has expired or is not valid. Open the newest email from Vallo and use its link, or sign in and choose in Settings.";
