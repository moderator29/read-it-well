import { InboxPane } from "@/components/app/messages/InboxPane";

/**
 * B17: the thread, and from 64rem the inbox beside it. On a phone the pane
 * draws nothing and fetches nothing, and the thread fills the screen exactly
 * as before. A layout rather than a page change, so moving between threads
 * keeps the pane mounted and only the thread re-renders.
 */
export default function ThreadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nf-msg-split">
      <InboxPane />
      <div className="nf-msg-split__thread">{children}</div>
    </div>
  );
}
