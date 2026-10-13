import Link from "next/link";
import { countOf, type Dictionary, type Locale } from "@vallo/i18n/core";
import {
  GRAPH,
  layoutReferralGraph,
  memberLabel,
  type GraphEdge,
} from "@/lib/admin/reads/referrals-model";
import { Badge } from "../_components/panels";

/**
 * WHO INVITED WHOM, drawn simply: a left to right tree in plain SVG. No chart
 * library. The layout is `layoutReferralGraph` (pure, tested); this only
 * draws what it returns.
 *
 * EVERY FACT IS IN WORDS TOO. A box carries a name and, under it, the state
 * of the invitation that brought that person in and its risk score; risk is
 * also an outline, and a loop is a dashed line, but neither is the only
 * signal. The picture sits in a keyboard-scrollable region for a phone, and
 * the plain list under it carries every invitation, including any the
 * drawing cap left out.
 */

type Copy = Dictionary["referralDesk"];

/** A name that fits a box: the display name cut to what the box holds, the whole name kept for the tooltip. */
function fit(label: string, max = 17): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function ReferralGraph({
  edges,
  names,
  focus,
  copy,
  locale,
}: {
  edges: readonly GraphEdge[];
  names: Readonly<Record<string, string>>;
  focus: string | null;
  copy: Copy;
  locale: Locale;
}) {
  const layout = layoutReferralGraph(edges, focus);
  const g = copy.graph;
  const label = (id: string) => memberLabel(id, names[id], g.unnamed);
  const statusWord = (status: string | null) =>
    status === null ? g.rootLine : ((copy.status as Record<string, string>)[status] ?? copy.status.unknown);
  const threshold = 40;

  if (layout.nodes.length === 0) return null;

  const figure = g.figureLabel.replace("{count}", countOf(edges.length, "invitations", locale));

  return (
    <div data-testid="referral-graph">
      <div className="nf-rgraph-wrap" role="region" tabIndex={0} aria-label={g.scrollLabel}>
        <svg
          className="nf-rgraph"
          role="img"
          aria-label={figure}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
        >
          <defs>
            <marker id="rg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path className="nf-rgraph__arrow" d="M0 1 10 5 0 9z" />
            </marker>
            <marker id="rg-arrow-back" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path className="nf-rgraph__arrow nf-rgraph__arrow--back" d="M0 1 10 5 0 9z" />
            </marker>
          </defs>
          {layout.links.map((link) => (
            <path
              key={`${link.from}-${link.to}`}
              className={`nf-rgraph__link${link.kind === "back" ? " nf-rgraph__link--back" : ""}`}
              d={link.path}
              markerEnd={`url(#${link.kind === "back" ? "rg-arrow-back" : "rg-arrow"})`}
            />
          ))}
          {layout.nodes.map((node) => {
            const name = label(node.id);
            const risky = node.risk !== null && node.risk >= threshold;
            const line =
              node.status === null
                ? statusWord(null)
                : `${statusWord(node.status)}, ${g.riskAt.replace("{score}", String(node.risk ?? 0))}`;
            return (
              <g
                key={node.id}
                className={`nf-rgraph__node${node.focus ? " nf-rgraph__node--focus" : ""}${risky ? " nf-rgraph__node--risk" : ""}`}
                transform={`translate(${node.x} ${node.y})`}
                data-testid="graph-node"
                data-risk={risky ? "high" : undefined}
              >
                <title>{`${name}. ${line}`}</title>
                <rect className="nf-rgraph__box" width={GRAPH.nodeW} height={GRAPH.nodeH} rx="8" />
                <text className="nf-rgraph__name" x="10" y="17">
                  {fit(name)}
                </text>
                <text className="nf-rgraph__line" x="10" y="32">
                  {fit(line, 27)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="nf-rdesk-note nf-rgraph-hint">{g.scrollHint}</p>
      <ul className="nf-rgraph-legend" aria-label={g.focus}>
        <li>
          <i data-focus aria-hidden="true" />
          {g.focus}
        </li>
        <li>
          <i data-risk aria-hidden="true" />
          {g.riskAt.replace("{score}", `${threshold}+`)}
        </li>
        {layout.hasLoop ? (
          <li>
            <i data-back aria-hidden="true" />
            {g.loop}
          </li>
        ) : null}
      </ul>
      {layout.truncated ? (
        <p className="nf-rdesk-note mt-xs" data-testid="graph-truncated">
          {g.truncated.replace("{drawn}", String(layout.drawn)).replace("{total}", String(layout.total))}
        </p>
      ) : null}

      <h3 className="nf-rdesk-label mt-md">{g.listTitle}</h3>
      <div className="nf-admin-dt-wrap" tabIndex={0} role="region" aria-label={g.listTitle}>
        <table className="nf-admin-dt nf-admin-dt--stack">
          <thead>
            <tr>
              <th scope="col">{g.inviter}</th>
              <th scope="col">{g.invited}</th>
              <th scope="col">{g.state}</th>
              <th scope="col" className="text-right">
                {g.riskCol}
              </th>
              <th scope="col" className="text-right">
                {g.steps}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...edges]
              .sort((a, b) => a.depth - b.depth || b.riskScore - a.riskScore)
              .map((edge) => (
                <tr key={`${edge.referrerId}-${edge.referredId}`}>
                  <th scope="row" data-label={g.inviter}>
                    <Link href={`/admin/people/${edge.referrerId}`} className="underline underline-offset-4">
                      {label(edge.referrerId)}
                    </Link>
                  </th>
                  <td data-label={g.invited}>
                    <Link href={`/admin/people/${edge.referredId}`} className="underline underline-offset-4">
                      {label(edge.referredId)}
                    </Link>
                  </td>
                  <td data-label={g.state}>
                    <Badge tone={edge.status === "reversed" || edge.status === "rejected" ? "error" : edge.status === "under_review" ? "pending" : "info"}>
                      {statusWord(edge.status)}
                    </Badge>
                  </td>
                  <td className="nf-numeric text-right" data-label={g.riskCol}>
                    {edge.riskScore}
                  </td>
                  <td className="nf-numeric text-right" data-label={g.steps}>
                    {edge.depth}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
