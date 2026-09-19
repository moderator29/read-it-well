import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ChromePreview } from "../ChromePreview";

/**
 * The side drawer open over the dimmed app, beside `BCD39CA8` (the drawer render).
 *
 * The route is `/wallet` rather than `/home` on purpose. The drawer render's
 * loudest object after the user card is the LIT ACTIVE ROW, and on a phone
 * Home, Explore and Feed are not in the drawer at all - the dock carries them
 * - so a drawer opened from home has no row to light and the state that has
 * to be held beside the image never appears. The wallet is a drawer
 * destination, so this shot carries the one thing that shot could not.
 */
export default async function DrawerPreviewPage() {
  return <ChromePreview t={getDictionary(await getLocale())} route="/wallet" drawer />;
}
