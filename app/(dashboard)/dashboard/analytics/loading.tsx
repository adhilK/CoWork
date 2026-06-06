export default function AnalyticsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-28 mb-2" />
          <div className="skeleton h-4 w-52" />
        </div>
        <div className="skeleton h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="dashboard-card rounded-2xl p-5">
            <div className="skeleton h-5 w-36 mb-4" />
            <div className="skeleton h-56 w-full" />
          </div>
        ))}
      </div>
      <div className="dashboard-card rounded-2xl p-5">
        <div className="skeleton h-5 w-40 mb-4" />
        <div className="skeleton h-64 w-full" />
      </div>
    </div>
  );
}
