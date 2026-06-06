export default function VisitorsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-24 mb-2" />
          <div className="skeleton h-4 w-44" />
        </div>
        <div className="skeleton h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1,2].map(i => (
          <div key={i} className="dashboard-card p-4">
            <div className="skeleton h-6 w-12 mb-1.5" />
            <div className="skeleton h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="dashboard-card rounded-2xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
            <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <div className="skeleton h-3 w-28 mb-1.5" />
              <div className="skeleton h-2.5 w-20" />
            </div>
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
