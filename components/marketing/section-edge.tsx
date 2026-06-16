import { cn } from "@/lib/utils";

/**
 * Signature section divider: a soft asymmetric wave edge, full-bleed, rendered
 * in the INCOMING section's color and pulled up so the new band "rises into"
 * the previous one. Placed as the first child of a colored section.
 *
 * Pass `color` for a solid wave, or `from`/`to` for a vertical gradient wave
 * (used to blend one section's color into the next). Reserved height (no CLS).
 * `flip` mirrors the wave so consecutive boundaries alternate direction.
 */
export function SectionEdge({
  color,
  from,
  to,
  flip,
  className,
}: {
  color?: string;
  from?: string;
  to?: string;
  flip?: boolean;
  className?: string;
}) {
  const gradient = from && to;
  const gid = gradient ? `mkedge-${(from + to).replace(/[^a-zA-Z0-9]/g, "")}` : undefined;
  const path =
    "M0,64 L0,30 C240,2 470,2 720,22 C960,42 1210,52 1440,18 L1440,64 Z";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none relative z-[1] -mt-10 w-full overflow-hidden leading-[0] sm:-mt-16",
        className
      )}
    >
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className={cn("block h-10 w-full sm:h-16", flip && "-scale-x-100")}
      >
        {gradient && (
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={from} />
              <stop offset="1" stopColor={to} />
            </linearGradient>
          </defs>
        )}
        <path d={path} fill={gradient ? `url(#${gid})` : color} />
      </svg>
    </div>
  );
}
