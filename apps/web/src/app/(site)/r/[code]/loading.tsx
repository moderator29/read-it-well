import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { DocPerforation, DocumentSheet } from "@/components/app/money/DocumentSheet";

/**
 * The wait on a receipt check (C6, the route sweep). The page waits on
 * `verify_receipt` before it can say a word, and the group's article skeleton
 * (`(site)/loading.tsx`, a wide title and prose) stood in for a narrow answer
 * and a receipt. This is the answer's own shape: the label and the code, the
 * verdict card, then the receipt on paper (its label, the one figure, the
 * paid line, the tear, the ledger rows, the footnote) and the way back to the
 * form. Most codes answer "no receipt", which is the verdict card alone; the
 * sheet is the larger of the two shapes, so the answer never grows past it.
 */
export default function LoadingReceiptCheck() {
  return (
    <LoadingShell label="Checking the receipt" className="nf-shell py-section">
      <div className="mx-auto max-w-md">
        <Skeleton width="10rem" height="0.75rem" radius="xs" />
        <Skeleton className="mt-2xs" width="8.5rem" height="0.8125rem" radius="xs" />
        <div className="nf-check-answer mt-md">
          <div className="flex items-center gap-sm">
            <Skeleton circle width="2.5rem" className="shrink-0" />
            <Skeleton width="60%" height="1.375rem" radius="sm" />
          </div>
        </div>
        <DocumentSheet as="div" kind="receipt" className="mt-md">
          <Skeleton width="9rem" height="0.75rem" radius="xs" />
          <Skeleton className="mt-sm" width="70%" height="2.5rem" radius="sm" />
          <Skeleton className="mt-sm" width="90%" height="0.8125rem" radius="xs" />
          <Skeleton className="mt-2xs" width="60%" height="0.8125rem" radius="xs" />
          <DocPerforation />
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex justify-between gap-md py-sm">
              <Skeleton width="34%" height="0.875rem" radius="sm" />
              <Skeleton width="26%" height="0.875rem" radius="sm" />
            </div>
          ))}
          <Skeleton className="mt-sm" width="85%" height="0.75rem" radius="xs" />
        </DocumentSheet>
        <Skeleton className="mt-md" height="3rem" radius="pill" />
      </div>
    </LoadingShell>
  );
}
