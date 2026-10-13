import type { AxisTick, VizPoint } from "@/components/ui/charts/chart-rules";
import type { StatusSegment } from "@/components/ui/charts/StatusBar";
import type { SpaceRange } from "./space-model";

/**
 * What `RangeSwitch` draws for one period, already in words.
 *
 * Built on the server (`app/agent/_intel/space-views.ts`) for every period
 * the figure can answer, and handed to the client whole. A period change is
 * then a state change on the phone, not a round trip: the figure rolls, the
 * bars morph and the rows below re-read in the same frame (craft doctrine:
 * fast is perceived and real). Every string is formatted in the reader's
 * locale before it crosses the boundary, because a client component cannot be
 * handed a formatter.
 */
export type RangeView = {
  range: SpaceRange;
  /** The segment's word ("30 days"). */
  tab: string;
  /** Which days the figure covers ("The last 30 days"). */
  span: string;
  /** The figure as printed, or null when it could not be counted. */
  figure: string | null;
  /** Said in place of the figure when it is null. */
  figureAbsent?: string;
  /** One quiet line under the figure. */
  sub?: string;
  chart: RangeChart | null;
  /** A sentence under the chart (a reason, a caveat). */
  note?: string;
  rows: RangeRow[];
};

export type RangeChart =
  | {
      kind: "bars";
      points: VizPoint[];
      yTicks: AxisTick[];
      label: string;
      summary?: string;
      periodHead: string;
      valueHead: string;
      nullLabel: string;
      empty: string;
    }
  | { kind: "share"; label: string; segments: StatusSegment[] };

export type RangeRow = {
  key: string;
  title: string;
  sub?: string;
  /** The figure, or null when this period has none for this row. */
  value: string | null;
  /** Said in place of a null value ("Counted for 7 days only"). */
  absent?: string;
  href?: string;
  /** Flags a row whose figure asks for attention (unanswered requests). */
  alarm?: boolean;
};
