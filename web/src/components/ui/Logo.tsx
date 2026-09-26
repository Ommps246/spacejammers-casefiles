// Case Files mark (design/Logo.dc.html, "Refined · A + B"): the ring is Earth, the tab makes it a
// case file, the rising line is the finding. Three strokes, one dot.

type Variant = "tile" | "gold" | "white";

type MarkProps = { size?: number; variant?: Variant; title?: string };

const GOLD = "#c9a24a";
const NAVY = "#1b2a4a";
const SMALL_CUT_MAX = 24; // at 24 px and below: thicker strokes, no dot, trend line extended to the ring

const TAB = "M12.5 21.5 V16.5 A3 3 0 0 1 15.5 13.5 H25 A3 3 0 0 1 27.4 14.7 L29.5 17.5";

export function LogoMark({ size = 32, variant = "tile", title }: MarkProps) {
  const small = size <= SMALL_CUT_MAX;
  const ink = variant === "white" ? "#ffffff" : GOLD;
  const stroke = small ? 6.5 : 5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="block shrink-0"
    >
      {variant === "tile" && <rect width="64" height="64" rx="15" fill={NAVY} />}
      <path d={TAB} fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="36" r={small ? 17.5 : 18} fill="none" stroke={ink} strokeWidth={stroke} />
      <path d={small ? "M21 45 L44 26" : "M21 45 L40.5 29.5"} fill="none" stroke={ink} strokeWidth={stroke} strokeLinecap="round" />
      {!small && <circle cx="43" cy="27" r="3.2" fill={ink} />}
    </svg>
  );
}

type LockupProps = { size?: "nav" | "large"; variant?: Variant; byline?: boolean };

/** Mark + "Case Files" (+ "by SpaceJammers"). Nav: 28 px tile, 16 px name. Large: 48 px, 29 px name. */
export function LogoLockup({ size = "nav", variant = "tile", byline = size === "large" }: LockupProps) {
  const large = size === "large";
  return (
    <span className={`inline-flex items-center ${large ? "gap-4" : "gap-2.5"}`}>
      <LogoMark size={large ? 48 : 28} variant={variant} />
      <span className="flex flex-col gap-0.5">
        <span
          className={`leading-none font-[650] tracking-[-0.025em] text-label ${large ? "text-[29px]" : "text-[16px]"}`}
        >
          Case Files
        </span>
        {byline && <span className="text-[12px] leading-[1.3] font-medium tracking-[0.01em] text-secondary">by SpaceJammers</span>}
      </span>
    </span>
  );
}
