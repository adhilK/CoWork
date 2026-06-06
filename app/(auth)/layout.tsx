import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your CoWork Pro account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: branding (hidden on mobile) ── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #08120D 0%, #0D1712 40%, #0A1F0E 100%)",
        }}
      >
        {/* Background glow effect */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, #22C55E 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #15803D 0%, transparent 50%)",
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #15803D, #22C55E)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              CoWork<span style={{ color: "#4ADE80" }}>Pro</span>
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              The coworking platform that{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #22C55E, #4ADE80)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                doesn&apos;t cost more
              </span>{" "}
              than your coffee machine.
            </h1>
            <p className="text-lg" style={{ color: "#9CA3AF" }}>
              Bookings, billing, members, and analytics — everything you need
              to run a coworking space, starting at £49/mo.
            </p>
          </div>
        </div>

        {/* Stats at bottom */}
        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Avg setup time", value: "< 10 min" },
              { label: "vs. competitors", value: "70% cheaper" },
              { label: "Free trial", value: "14 days" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "#4ADE80" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm mt-1" style={{ color: "#6B7280" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: auth form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-workspace">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
