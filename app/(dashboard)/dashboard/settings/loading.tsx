export default function SettingsLoading() {
  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="skeleton h-7 w-24 mb-1" />
      <div className="skeleton h-4 w-52 mb-6" />
      {[1,2,3].map(s => (
        <div key={s} className="dashboard-card rounded-2xl p-6">
          <div className="skeleton h-5 w-36 mb-4" />
          <div className="space-y-4">
            {[1,2,3].map(f => (
              <div key={f}>
                <div className="skeleton h-3 w-24 mb-2" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
