import { cn } from "@/lib/utils";

/**
 * Signature section divider: a soft asymmetric wave, full-bleed, in the
 * INCOMING section's color. Positioned ABOVE the section (bottom-full) so the
 * new band physically rises into the previous one, rather than sitting inside
 * its own padded background as a flat strip.
 *
 * Pass `color` for a solid wave, or `from`/`to` for a vertical gradient wave
 * (blends one color into the next). The parent section must be `relative` and
 * must NOT clip overflow at the top. Reserved height keeps layout stable.
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
  const path = "M0,80 L0,46 C300,12 560,12 760,34 C980,58 1180,66 1440,30 L1440,80 Z";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-full z-[1] h-12 w-full overflow-hidden leading-[0] sm:h-20",
        className
      )}
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className={cn("block h-full w-full", flip && "-scale-x-100")}
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
