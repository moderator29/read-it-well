import type { Dictionary } from "@vallo/i18n/core";
import { withNext } from "@/lib/auth/next-link";
import { RowDownload, RowLink, SettingsGroup } from "@/components/app/account/rows";

/**
 * OPS-12: download a copy of what Vallo holds about you, as JSON, from
 * `/api/account/export`. Signed out, the row leads to sign-in instead, because
 * the copy is of an account.
 */
export function DataExportCard({ t, signedIn }: { t: Dictionary; signedIn: boolean }) {
  const copy = t.settings.dataExport;
  return (
    <SettingsGroup label={copy.label} note={copy.note}>
      {signedIn ? (
        <RowDownload
          href="/api/account/export"
          icon="arrow-down"
          label={copy.action}
          sub={copy.sub}
          testId="settings-data-export"
        />
      ) : (
        <RowLink href={withNext("/sign-in", "/settings/privacy/data")} icon="arrow-down" label={copy.action} sub={copy.signedOut} />
      )}
    </SettingsGroup>
  );
}
