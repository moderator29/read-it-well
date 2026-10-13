import Link from "next/link";
import { BackButton } from "@/components/site/BackButton";
import { CALL_PREVIEW_STATES } from "./fixtures";

/** The call screens' preview index: one link per fixture state. */
export default function CallsPreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <BackButton fallback="/preview" />
      <h1 className="nf-h2 mt-sm">Call screens</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {CALL_PREVIEW_STATES.map((s) => (
          <li key={s}>
            <Link className="nf-link" href={`/preview/calls/${s}`}>
              {s}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
