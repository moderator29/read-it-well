import type { Metadata } from "next";
import { DISCLAIMER_SECTIONS, DISCLAIMER_UPDATED } from "@/lib/legal/disclaimer";
import { LegalDocument } from "../LegalDocument";

export const metadata: Metadata = {
  title: "Disclaimer",
  // /disclaimer is the canonical public copy.
  robots: { index: false, follow: false },
};

export default function AppDisclaimerPage() {
  return (
    <LegalDocument
      title="Disclaimer"
      intro="What Vallo is responsible for, and what it is not."
      updated={DISCLAIMER_UPDATED}
      sections={DISCLAIMER_SECTIONS}
      otherHref="/legal/terms"
      otherLabel="Terms of service"
    />
  );
}
