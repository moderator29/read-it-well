"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { demandLetter, mailtoHref, type LetterFacts } from "@/lib/tenancy/letter";

/** Print the pack. The browser's own dialog saves it as a PDF. */
export function PrintPack({ label }: { label: string }) {
  return (
    <Button variant="secondary" full leadingIcon="document" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

/**
 * The demand letter, previewed as it will be sent, with one optional
 * paragraph in the tenant's own words, opened in their own mail app.
 */
export function DemandLetter({ facts, copy }: { facts: LetterFacts; copy: { personal: string; send: string } }) {
  const [personal, setPersonal] = useState("");
  const letter = useMemo(() => demandLetter(facts, personal), [facts, personal]);
  return (
    <div className="grid gap-md">
      <pre className="nf-body-sm whitespace-pre-wrap font-[inherit]" data-testid="demand-letter">
        {letter.body}
      </pre>
      <div className="nf-pack-noprint grid gap-sm">
        <Field label={copy.personal}>
          {(control) => (
            <textarea
              {...control}
              className="nf-field min-h-[5.5rem]"
              maxLength={1500}
              value={personal}
              onChange={(event) => setPersonal(event.target.value)}
            />
          )}
        </Field>
        <ButtonLink href={mailtoHref(letter)} variant="primary" full trailingIcon="arrow-right">
          {copy.send}
        </ButtonLink>
      </div>
    </div>
  );
}
