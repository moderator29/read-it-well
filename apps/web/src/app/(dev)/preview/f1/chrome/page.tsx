import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ChromePreview } from "../ChromePreview";

/** The app header and the five-slot dock on the Property side, signed in. */
export default async function ChromePreviewPage() {
  return <ChromePreview t={getDictionary(await getLocale())} route="/home" />;
}
