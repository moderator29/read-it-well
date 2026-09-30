import { HostShell } from "@/components/host/HostShell";
import { StatementView } from "@/components/host/StatementView";
import { statementLines } from "@/lib/host/statement";
import { EARNINGS } from "../fixtures";

/** C9 on fixtures: one September of Example payments and a refund reversal. */
export default function PreviewHostStatement() {
  return (
    <HostShell fallback="/preview/host-c" wide>
      <StatementView
        month="2026-09"
        thisMonth="2026-09"
        title="September 2026"
        lines={statementLines(EARNINGS, "2026-09")}
        complete
        failed={false}
        locale="en"
      />
    </HostShell>
  );
}
