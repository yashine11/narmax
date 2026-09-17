export default function SkeletonHome() {
  return (
    <div className="animate-pulse">
      <div className="h-[56vh] min-h-[380px] bg-zinc-900" />
      <div className="px-8 py-8 space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-6 w-40 bg-zinc-800 rounded mb-3" />
            <div className="flex gap-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="w-36 aspect-[2/3] bg-zinc-800 rounded shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
