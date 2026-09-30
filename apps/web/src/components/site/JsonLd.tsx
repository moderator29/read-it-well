import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/security/csp";
import { jsonLdText, type JsonLdNode } from "@/lib/site/structured-data";

/**
 * A13. One structured-data block. A data block is never executed, but it is
 * still stamped with this request's nonce, as the landing FAQ and the
 * listing page stamp theirs, so the policy's rule "every inline script is
 * ours" has no exception to explain.
 */
export async function JsonLd({ data }: { data: JsonLdNode | readonly JsonLdNode[] }) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: jsonLdText(data) }}
    />
  );
}
