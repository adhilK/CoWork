import { cn } from "@/lib/utils";

/**
 * Signature section divider: a soft asymmetric wave edge, full-bleed, rendered
 * in the INCOMING section's color and pulled up so the new band "rises into"
 * the previous one. Placed as the first child of a colored section.
 *
 * Reserved height (no CLS). `flip` mirrors the wave so consecutive boundaries
 * alternate direction. Decorative only -> aria-hidden.
 */
export function SectionEdge({
  color,
  flip,
  className,
}: {
  color: string;
  flip?: boolean;
  className?: string;
}) {
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
        <path
          d="M0,64 L0,30 C240,2 470,2 720,22 C960,42 1210,52 1440,18 L1440,64 Z"
          fill={color}
        />
      </svg>
    </div>
  );
}
