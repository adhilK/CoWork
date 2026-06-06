export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-28 mb-2" />
          <div className="skeleton h-4 w-52" />
        </div>
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Dark card */}
        <div className="rounded-2xl p-5" style={{ background: "#0A0F0A", border: "1px solid transparent" }}>
          <div className="skeleton-dark h-3 w-28 mb-3" />
          <div className="skeleton-dark h-7 w-24 mb-2" />
          <div className="skeleton-dark h-3 w-36" />
        </div>
        {[1,2].map(i => (
          <div key={i} className="kpi-card rounded-2xl p-5">
            <div className="skeleton h-3 w-28 mb-3" />
            <div className="skeleton h-7 w-20 mb-2" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
        {/* Accent card */}
        <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#15803D,#166534)" }}>
          <div className="skeleton-dark h-3 w-24 mb-3" />
          <div className="skeleton-dark h-7 w-16 mb-2" />
          <div className="skeleton-dark h-3 w-28" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="dashboard-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-7 w-24 rounded-lg" />
          </div>
          <div className="skeleton h-52 w-full" />
        </div>
        <div className="dashboard-card rounded-2xl p-5">
          <div className="skeleton h-5 w-28 mb-4" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-3 w-24 mb-1.5" />
                  <div className="skeleton h-2.5 w-16" />
                </div>
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="dashboard-card rounded-2xl p-5">
            <div className="skeleton h-5 w-32 mb-4" />
            {[1,2,3,4].map(j => (
              <div key={j} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton h-3 w-28 mb-1.5" />
                  <div className="skeleton h-2.5 w-20" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
