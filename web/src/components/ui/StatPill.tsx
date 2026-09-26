// Stat pill: tabular numerals, unit always spelled out (Components · Stat pill).

type Props = { value: string; unit: string; size?: "md" | "lg"; tone?: "label" | "reference" };

export function StatPill({ value, unit, size = "md", tone = "label" }: Props) {
  const large = size === "lg";
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full border border-hairline bg-white/6 tabular-nums ${
        large ? "px-4 py-2.5" : "px-[13px] py-[7px]"
      }`}
    >
      <span
        className={`font-[650] tracking-[-0.02em] ${large ? "text-[26px]" : "text-[17px]"} ${
          tone === "reference" ? "text-reference" : "text-label"
        }`}
      >
        {value}
      </span>
      <span className={`font-medium text-secondary ${large ? "text-[14px]" : "text-[12px]"}`}>{unit}</span>
    </span>
  );
}

/** The big number on stat-first cards: 40 px, bold, tabular, unit beside it. */
export function BigStat({ value, unit, tone = "label" }: Omit<Props, "size">) {
  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className={`text-stat ${tone === "reference" ? "text-reference" : "text-label"}`}>{value}</span>
      <span className="text-[15px] font-medium text-secondary">{unit}</span>
    </div>
  );
}
