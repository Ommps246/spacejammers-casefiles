// Evidence chart (Tokens · Chart): 1 px grid at 6%, zero line at 16%, yearly values in 1.5 px white
// at 45%, one highlighted line (Sen's slope or the change-point step) in gold 2 px; the reference
// series is dashed pale blue. Axis always labelled.
import { linearScale, niceTicks, yearTicks } from "@/lib/chart";
import type { EvidenceView } from "@/lib/evidence-view";
import { formatTick } from "@/lib/format";

type Props = { chart: EvidenceView["chart"]; width: number; height: number; reference?: boolean };

const PAD = { left: 38, right: 12, top: 22, bottom: 26 };
const GOLD = "#c9a24a";
const REFERENCE = "#dfe7f5";
const TICK_TEXT = "rgba(235,235,245,0.56)";

export function TrendChart({ chart, width, height, reference = false }: Props) {
  const points = [...chart.points].sort((a, b) => a.x - b.x);
  if (points.length < 2) {
    return <p className="text-[13px] text-tertiary">Not enough yearly values to draw this chart.</p>;
  }
  const x0 = points[0].x;
  const x1 = points[points.length - 1].x;
  const { line } = chart;
  const lineEnds =
    line.kind === "trend"
      ? [line.intercept + line.slopePerYear * x0, line.intercept + line.slopePerYear * x1]
      : [line.before, line.after];
  const ys = [...points.map((p) => p.y), ...lineEnds, 0];
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys), 3);
  const x = linearScale([x0, x1], [PAD.left, width - PAD.right]);
  const y = linearScale([ticks.min, ticks.max], [height - PAD.bottom, PAD.top]);
  const accent = reference ? REFERENCE : GOLD;
  const years = line.kind === "step" ? [x0, line.at, x1] : yearTicks(x0, x1);

  const highlight =
    line.kind === "trend"
      ? `M${x(x0)} ${y(lineEnds[0])} L${x(x1)} ${y(lineEnds[1])}`
      : `M${x(x0)} ${y(line.before)} H${x(line.at)} V${y(line.after)} H${x(x1)}`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${chart.axisLabel}; ${chart.legend}`}
      className="block overflow-visible tabular-nums"
    >
      {ticks.values.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#fff"
            strokeOpacity={Math.abs(v) < 1e-9 ? 0.16 : 0.06}
          />
          <text x={PAD.left - 6} y={y(v) + 3.5} fontSize="10" fill={TICK_TEXT} textAnchor="end">
            {formatTick(v, ticks.decimals, chart.signedTicks)}
          </text>
        </g>
      ))}
      {years.map((yr) => (
        <text key={yr} x={x(yr)} y={height - 8} fontSize="10" fill={TICK_TEXT} textAnchor="middle">
          {yr}
        </text>
      ))}
      <text x={PAD.left} y={11} fontSize="10" fill={TICK_TEXT}>
        {chart.axisLabel}
      </text>

      <polyline
        points={points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.45}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r={1.6} fill="#fff" fillOpacity={0.55} />
      ))}

      <path
        d={highlight}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={reference ? "6 4" : undefined}
        pathLength={reference ? undefined : 1}
        className={reference ? undefined : "chart-highlight"}
      />
      <circle cx={x(x1)} cy={y(lineEnds[1])} r={3} fill={accent} />
    </svg>
  );
}
