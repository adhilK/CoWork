export default function InvoicesLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-24 mb-2" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="kpi-card rounded-2xl p-4">
            <div className="skeleton h-3 w-20 mb-2" />
            <div className="skeleton h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="dashboard-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <div className="skeleton h-5 w-28" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24 rounded-lg" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0">
            <div className="skeleton h-3 w-24" />
            <div className="flex-1 skeleton h-3 w-32" />
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
