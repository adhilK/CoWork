import { cn } from "@/lib/utils";

type Variant = "light" | "dark" | "sidebar";
type Size = "xs" | "sm" | "md" | "lg";

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
    xs: "2rem",
    sm: "1.5rem",
    md: "2rem",
    lg: "3.2rem",
  };

  const latinSize: Record<Size, string> = {
    xs: "1rem",
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

  const latinTracking: Record<Size, string> = {
    xs: "0.38em",
    sm: "0.4em",
    md: "0.42em",
    lg: "0.44em",
  };

  // Gap between Arabic and Latin rows.
  // light (green logo): slightly more breathing room.
  // dark/sidebar (white logo): noticeably more — they were touching.
  const gap: Record<Variant, string> = {
    light: "0.42em",
    dark: "0.52em",
    sidebar: "0.48em",
  };

  return (
    <div
      className={cn("flex flex-col items-center leading-none", className)}
      style={{ gap: gap[variant] }}
    >
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
