import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { ComingSoon, Ske } from "@/components/app/ComingSoon";

export const metadata: Metadata = { title: "Messages" };

/**
 * Messages destination.
 *
 * Reserved so the rail and tab bar never dead-end here (Master Rule 55). The
 * `(app)` layout supplies the navigation; this page shows what the surface
 * will be, with a skeleton preview of a conversation clearly badged as such.
 */
export default async function MessagesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <ComingSoon
      title={t.nav.messages}
      icon="chat"
      promise="Chat with agents and hosts about a stay without leaving NaijaFinds."
      preview={
        <div className="space-y-3">
          <div className="flex items-end gap-2.5">
            <Ske className="h-8 w-8 shrink-0 rounded-full" />
            <Ske className="h-10 w-3/5 rounded-2xl rounded-bl-md" />
          </div>
          <div className="flex justify-end">
            <Ske className="h-10 w-1/2 rounded-2xl rounded-br-md" />
          </div>
          <div className="flex items-end gap-2.5">
            <Ske className="h-8 w-8 shrink-0 rounded-full" />
            <Ske className="h-8 w-2/5 rounded-2xl rounded-bl-md" />
          </div>
          <Ske className="mt-4 h-11 w-full rounded-full" />
        </div>
      }
    />
  );
}
