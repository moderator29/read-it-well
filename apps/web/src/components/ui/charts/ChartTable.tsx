/**
 * THE TABLE TWIN OF A CHART (chart rule 3, `chart-rules.ts`).
 *
 * Every chart carries its data as a real table, so no value is ever reachable
 * only by hovering, and a screen reader gets rows and headers rather than a
 * sentence it has to hold in its head. Visually hidden by default: the chart
 * is the sighted reader's view of the same rows. `visible` shows it, for a
 * surface whose own layout wants the numbers in columns.
 *
 * Server-safe and dumb on purpose: it prints exactly the strings it is
 * handed. A null is printed as `nullLabel`, never as a zero, because "nothing
 * on record" and "nothing happened" are different facts.
 */
export type ChartRow = {
  key: string;
  /** The period's full name ("June 2026"). */
  label: string;
  /** The value as printed; null is "nothing on record". */
  display: string | null;
  /** The comparison column, when the chart has one. */
  compare?: string | null;
};

export function ChartTable({
  caption,
  periodHead,
  valueHead,
  compareHead,
  rows,
  nullLabel = "–",
  visible = false,
}: {
  caption: string;
  periodHead: string;
  valueHead: string;
  compareHead?: string;
  rows: readonly ChartRow[];
  nullLabel?: string;
  visible?: boolean;
}) {
  /* Hidden, the table sits inside a 1px sr-only box rather than being one: a
     table sizes to its content whatever width sr-only gives it, so in Hausa
     the analytics money table ran 76px past a 390px window (auditFit, 10
     findings; C1 sweep). The admin desks' SeriesChart does the same. */
  const table = (
    <table className={visible ? "nf-viz-table" : undefined}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{periodHead}</th>
          <th scope="col">{valueHead}</th>
          {compareHead ? <th scope="col">{compareHead}</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td className="nf-numeric">{row.display ?? nullLabel}</td>
            {compareHead ? <td className="nf-numeric">{row.compare ?? nullLabel}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
  return visible ? table : <div className="sr-only">{table}</div>;
}
