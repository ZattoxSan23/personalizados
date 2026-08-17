export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-ink-200 rounded" />
        <div className="h-8 w-20 bg-ink-100 rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-full bg-ink-100" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-32 bg-ink-200 rounded" />
                <div className="h-3 w-24 bg-ink-100 rounded" />
              </div>
            </div>
            <div className="h-4 w-4 bg-ink-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}