export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-20 bg-ink-200 rounded" />
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-ink-200 rounded" />
            <div className="h-3 w-32 bg-ink-100 rounded" />
            <div className="h-3 w-24 bg-ink-100 rounded mt-2" />
          </div>
          <div className="space-y-1">
            <div className="h-3 w-12 bg-ink-100 rounded" />
            <div className="h-5 w-16 bg-ink-200 rounded" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 border-b border-ink-200 pb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 bg-ink-100 rounded" />
        ))}
      </div>
      <div className="card space-y-3">
        <div className="h-4 w-32 bg-ink-200 rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="h-3 w-4 bg-ink-100 rounded" />
              <div className="h-3 flex-1 bg-ink-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}