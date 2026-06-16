"use client";

const LOGOS = [
  { mark: "NW", name: "Nawah Workspaces" },
  { mark: "MB", name: "Marsa Business Hub" },
  { mark: "QO", name: "Qasr Offices" },
  { mark: "LC", name: "Liwan Coworking" },
  { mark: "AS", name: "Astrolabe Spaces" },
  { mark: "DH", name: "Dana Hub" },
  { mark: "RW", name: "Raffd Works" },
];

function Logo({ mark, name }: { mark: string; name: string }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2.5 px-8">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
        {mark}
      </span>
      <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-zinc-600">{name}</span>
    </div>
  );
}

/**
 * Infinite horizontal logo marquee. CSS transform animation (cheap), pauses on
 * hover, and collapses to a static wrapped row under prefers-reduced-motion
 * (handled in globals.css via the .marquee classes).
 */
export function LogoMarquee() {
  return (
    <div className="marquee group relative overflow-hidden">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />
      <div className="marquee-track flex w-max items-center py-2">
        {/* duplicated for a seamless loop */}
        {[...LOGOS, ...LOGOS].map((logo, i) => (
          <Logo key={`${logo.mark}-${i}`} {...logo} />
        ))}
      </div>
    </div>
  );
}
