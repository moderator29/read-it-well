import type { Metadata } from "next";
import { getDictionary, formatNumber } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { PageHead, Panel, PanelEmpty, PanelUnavailable } from "../_components/panels";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.platform.fieldSpeed.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * FIELD SPEED. V-80.
 *
 * p75 Largest Contentful Paint, Interaction to Next Paint, layout shift and
 * page weight, per route template and connection class, over the last seven
 * days, from `admin_field_speed()` (which refuses anybody who is not staff).
 * The samples come from one page view in ten on real phones
 * (`components/app/VitalsReporter.tsx`), with nothing that identifies a
 * person. With no samples the desk says so, rather than drawing a zero.
 */

type Row = {
  route: string;
  effective_type: string;
  samples: number;
  p75_lcp_ms: number | null;
  p75_inp_ms: number | null;
  p75_cls: number | null;
  p75_transfer_kb: number | null;
};

type Loose = { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> };

async function readRows(): Promise<Row[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as Loose).rpc("admin_field_speed");
    if (error || !Array.isArray(data)) return null;
    return data as Row[];
  } catch {
    return null;
  }
}

export default async function FieldSpeedPage() {
  const locale = await getLocale();
  const copy = getDictionary(locale).platform.fieldSpeed;
  const rows = await readRows();
  const seconds = (ms: number | null) =>
    ms === null ? "" : `${formatNumber(ms / 1000, locale, { maximumFractionDigits: 1 })} s`;
  const ms = (value: number | null) => (value === null ? "" : `${formatNumber(Math.round(value), locale)} ms`);

  return (
    <div className="nf-admin-stack" data-testid="field-speed">
      <PageHead title={copy.title} lede={copy.lede} />
      <Panel title={copy.panel} id="field-speed" flush>
        {rows === null ? (
          <PanelUnavailable what={copy.what} locale={locale} />
        ) : rows.length === 0 ? (
          <PanelEmpty title={copy.emptyTitle} body={copy.emptyBody} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="nf-caption text-muted">
                  <th scope="col" className="p-cell">{copy.route}</th>
                  <th scope="col" className="p-cell">{copy.connection}</th>
                  <th scope="col" className="p-cell text-right">{copy.samples}</th>
                  <th scope="col" className="p-cell text-right">{copy.lcp}</th>
                  <th scope="col" className="p-cell text-right">{copy.inp}</th>
                  <th scope="col" className="p-cell text-right">{copy.cls}</th>
                  <th scope="col" className="p-cell text-right">{copy.weight}</th>
                </tr>
              </thead>
              <tbody className="nf-body-sm text-content-2">
                {rows.map((row) => (
                  <tr key={`${row.route}-${row.effective_type}`}>
                    <td className="p-cell font-semibold text-content">{row.route}</td>
                    <td className="p-cell">{row.effective_type === "unknown" ? copy.unknown : row.effective_type}</td>
                    <td className="p-cell text-right tabular-nums">{formatNumber(row.samples, locale)}</td>
                    <td className="p-cell text-right tabular-nums">{seconds(row.p75_lcp_ms)}</td>
                    <td className="p-cell text-right tabular-nums">{ms(row.p75_inp_ms)}</td>
                    <td className="p-cell text-right tabular-nums">
                      {row.p75_cls === null ? "" : formatNumber(row.p75_cls, locale, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-cell text-right tabular-nums">
                      {row.p75_transfer_kb === null ? "" : `${formatNumber(Math.round(row.p75_transfer_kb), locale)} KB`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
