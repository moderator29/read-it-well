import Link from "next/link";
import { referenceLabel, referenceRows, type MoneyReference, type Settlement } from "@/lib/money/references";
import "@/app/css/money-layer.css";

/**
 * The six references, labelled apart (lib/money/references.ts). A fiat
 * payment draws no chain hash, and a provider reference is never drawn under a
 * hash's label. Server-safe; every value is printed exactly as it was handed.
 */
export function ReferenceList({
  references,
  settlement,
  testId = "references",
}: {
  references: readonly MoneyReference[];
  settlement: Settlement;
  testId?: string;
}) {
  const rows = referenceRows(references, settlement);
  if (rows.length === 0) return null;
  return (
    <dl className="nf-refs nf-body-sm" data-testid={testId}>
      {rows.map((ref) => (
        <div key={ref.kind} className="nf-ref" data-ref={ref.kind}>
          <dt>{referenceLabel(ref)}</dt>
          <dd>
            {ref.href ? (
              <Link href={ref.href} className="underline underline-offset-2">
                {ref.value}
              </Link>
            ) : (
              ref.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
