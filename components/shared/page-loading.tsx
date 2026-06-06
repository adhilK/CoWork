/**
 * Neutral loading skeleton shaped like the common page layout
 * (header + stat strip + content cards). Used by route `loading.tsx`
 * files so the skeleton matches the real page instead of guessing.
 */
export function PageLoading({
  stats = 3,
  cards = 4,
  grid = false,
}: {
  stats?: number;
  cards?: number;
  grid?: boolean;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-40 mb-2" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* Stat strip */}
      {stats > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${stats}, minmax(0,1fr))` }}>
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="dashboard-card p-4 flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-6 w-12 mb-1.5" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {grid ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="dashboard-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="flex-1"><div className="skeleton h-4 w-2/3 mb-1.5" /><div className="skeleton h-3 w-1/2" /></div>
              </div>
              <div className="skeleton h-16 w-full rounded-xl mb-3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="dashboard-card p-4 flex items-center gap-4">
              <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-4 w-1/3 mb-2" />
                <div className="skeleton h-3 w-1/4" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
