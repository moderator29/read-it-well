import type { Metadata } from "next";
import { PRIVACY_SECTIONS } from "@/lib/legal/privacy";
import { LegalDocument } from "../LegalDocument";

export const metadata: Metadata = {
  title: "Privacy policy",
  /*
   * Not indexed, and that is deliberate rather than an oversight. The public
   * copy at /privacy is the canonical one for search engines; this route is
   * the same text inside the product, and two indexed pages with identical
   * bodies compete with each other for no gain.
   */
  robots: { index: false, follow: false },
};

export default function AppPrivacyPage() {
  return (
    <LegalDocument
      title="Privacy policy"
      intro="How RentMe collects, uses and protects your personal data, and the rights the Nigeria Data Protection Act 2023 gives you over it."
      updated="28 July 2026"
      sections={PRIVACY_SECTIONS}
      otherHref="/legal/terms"
      otherLabel="Terms of service"
    />
  );
}
