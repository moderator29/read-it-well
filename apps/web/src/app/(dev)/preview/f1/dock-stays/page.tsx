import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ChromePreview } from "../ChromePreview";

/** The same chrome after a flip: the first dock slot is Stays, the accent is the Stays depth of blue. */
export default async function StaysDockPreviewPage() {
  return <ChromePreview t={getDictionary(await getLocale())} route="/stays" side="stays" />;
}
