// 16 × 16 icons from the component sheet (design/Components.dc.html). Decorative: aria-hidden.
import type { StrengthKind } from "@/lib/evidence-view";

type IconProps = { size?: number; color?: string; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${className ?? ""}`}>
      {children}
    </svg>
  );
}

const STRENGTH_STROKE: Record<StrengthKind, string> = {
  strong: "#34c759",
  moderate: "#ffb020",
  inconclusive: "#8e8e93",
  lead: "#c9a24a",
};

export function StrengthIcon({ kind, size = 14 }: { kind: StrengthKind; size?: number }) {
  const c = STRENGTH_STROKE[kind];
  if (kind === "moderate") {
    return (
      <Svg size={size}>
        <path d="M8 2.5 A5.5 5.5 0 1 1 3.2 10.7" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="8" r="1.6" fill={c} />
      </Svg>
    );
  }
  const mark = {
    strong: <path d="M4.5 8.2 L7 10.6 L11.5 5.6" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
    inconclusive: <path d="M4.8 8 H11.2" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />,
    lead: <path d="M8 4.5 V8.5 M8 11 V11.2" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" />,
  }[kind];
  return (
    <Svg size={size}>
      <circle cx="8" cy="8" r="6.2" fill="none" stroke={c} strokeWidth="1.4" />
      {mark}
    </Svg>
  );
}

/** Two panels and a body: the source-chip satellite. */
export function SatelliteIcon({ size = 13, color = "#c9a24a" }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="1.5" y="6" width="5" height="4" rx="0.5" fill="none" stroke={color} strokeWidth="1.2" />
      <rect x="9.5" y="6" width="5" height="4" rx="0.5" fill="none" stroke={color} strokeWidth="1.2" />
      <rect x="6.5" y="5.5" width="3" height="5" rx="0.6" fill={color} />
    </Svg>
  );
}

/** Crosshair: detector checks and "worth a second look". */
export function DetectorIcon({ size = 14, color = "#c9a24a" }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.8" fill={color} />
      <path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function ObjectionIcon({ size = 15, color = "#ff453a" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 3.5 H13 V10.5 H7 L4 13 V10.5 H3 Z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 5.5 V7.6 M8 9 V9.1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 14, color = "#e2c77e" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M3 8 H13 M9 4 L13 8 L9 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowDownIcon({ size = 14, color = "#e2c77e" }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M8 3 V13 M4 9 L8 13 L12 9" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
