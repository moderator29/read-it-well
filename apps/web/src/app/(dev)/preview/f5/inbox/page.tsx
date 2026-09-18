import { Inbox } from "@/app/(app)/messages/Inbox";
import { PERSON } from "../../_fixtures/people";
import { INBOX } from "../fixtures";

/** The inbox in the register, from fixture rows. */
export const dynamic = "force-dynamic";

export default function PreviewInbox() {
  return (
    <div className="nf-shell py-section-tight">
      <div className="mx-auto max-w-2xl">
        <Inbox rows={INBOX} meId={PERSON.id} canMarkRead />
      </div>
    </div>
  );
}
