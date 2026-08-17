export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 bg-ink-200 rounded" />
        <div className="h-4 w-40 bg-ink-100 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card space-y-2">
            <div className="h-3 w-20 bg-ink-100 rounded" />
            <div className="h-7 w-12 bg-ink-200 rounded" />
            <div className="h-3 w-16 bg-ink-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="card space-y-2">
            <div className="h-7 w-10 bg-ink-100 rounded" />
            <div className="h-4 w-24 bg-ink-200 rounded" />
            <div className="h-3 w-32 bg-ink-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}