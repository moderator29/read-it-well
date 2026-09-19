import { HostShell } from "@/components/host/HostShell";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { TransferWorkspace } from "@/app/host/transfer/TransferWorkspace";
import {
  TRANSFER_BUSINESSES,
  TRANSFER_INCOMING,
  TRANSFER_OUTGOING,
} from "../new-surfaces-fixtures";

/**
 * `/host/transfer`, the hand-over desk, with all three of its states on one
 * screen: a business still trading, an offer already sent and an offer waiting
 * on this reader. It had no preview before tonight.
 */
export const dynamic = "force-dynamic";

export default async function PreviewHostTransfer() {
  const t = getDictionary(await getLocale());
  return (
    <HostShell logoLabel={t.a11y.logoHome}>
      <TransferWorkspace
        businesses={TRANSFER_BUSINESSES}
        outgoing={TRANSFER_OUTGOING}
        incoming={TRANSFER_INCOMING}
        partial={false}
      />
    </HostShell>
  );
}
