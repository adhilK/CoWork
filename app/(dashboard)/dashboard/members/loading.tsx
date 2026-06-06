function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="dashboard-card rounded-2xl overflow-hidden animate-fade-in">
      {/* toolbar */}
      <div className="flex items-center justify-between p-5 border-b border-gray-50">
        <div className="skeleton h-5 w-32" />
        <div className="flex gap-2">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-9 w-9 rounded-lg" />
        </div>
      </div>
      {/* header */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-50">
        {[40, 120, 80, 80, 60].map((w, i) => (
          <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
          <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="skeleton h-3 w-36 mb-1.5" />
            <div className="skeleton h-2.5 w-24" />
          </div>
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-3 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function MembersLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-28 mb-2" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="skeleton h-9 w-32 rounded-xl" />
      </div>
      {/* search + filter */}
      <div className="flex gap-2">
        <div className="skeleton h-9 w-72 rounded-lg" />
        <div className="skeleton h-9 w-36 rounded-lg" />
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
