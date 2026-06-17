import { cn } from "@/lib/utils";

type Variant = "light" | "dark" | "sidebar";
type Size = "xs" | "sm" | "md" | "lg";

/**
 * Maktaby brand mark rendered in Arian LT — the exact font used in the
 * identity.  Arabic "مكتبي" sits above the Latin "MAKTABY" with the same
 * proportions and letter-spacing as the supplied logo files.
 *
 * Variants:  light  → dark-green on white/light bg
 *            dark   → white Arabic + silver Latin on dark bg
 *            sidebar → white Arabic + muted Latin on the near-black sidebar
 *
 * Sizes:     xs → compact nav pill
 *            sm → sidebar / footer
 *            md → medium placement
 *            lg → auth panel / hero-scale
 */
export function MaktabyLogo({
  variant = "light",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const FONT = "'Arian LT', 'Scheherazade New', 'Traditional Arabic', serif";

  const arabicSize: Record<Size, string> = {
    xs: "1.1rem",
    sm: "1.5rem",
    md: "2rem",
    lg: "3.2rem",
  };

  const latinSize: Record<Size, string> = {
    xs: "0.5rem",
    sm: "0.62rem",
    md: "0.78rem",
    lg: "1.05rem",
  };

  const arabicColor: Record<Variant, string> = {
    light: "#1A5C33",
    dark: "#ffffff",
    sidebar: "#ffffff",
  };

  const latinColor: Record<Variant, string> = {
    light: "#1A5C33",
    dark: "rgba(255,255,255,0.78)",
    sidebar: "rgba(255,255,255,0.5)",
  };

  // Letter-spacing matches the wide-tracked "MAKTABY" in the supplied logo.
  // The Arabic sits above with no extra tracking (Arian LT handles it).
  const latinTracking: Record<Size, string> = {
    xs: "0.38em",
    sm: "0.4em",
    md: "0.42em",
    lg: "0.44em",
  };

  return (
    <div className={cn("flex flex-col items-center leading-none", className)} style={{ gap: "0.22em" }}>
      {/* Arabic wordmark */}
      <span
        style={{
          fontFamily: FONT,
          color: arabicColor[variant],
          fontSize: arabicSize[size],
          lineHeight: 1,
          direction: "rtl",
          fontWeight: 400,
          userSelect: "none",
        }}
      >
        مكتبي
      </span>

      {/* Latin wordmark */}
      <span
        style={{
          fontFamily: FONT,
          color: latinColor[variant],
          fontSize: latinSize[size],
          letterSpacing: latinTracking[size],
          // Compensate for tracking so the text reads as visually centred.
          paddingLeft: latinTracking[size],
          fontWeight: 400,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        MAKTABY
      </span>
    </div>
  );
}
