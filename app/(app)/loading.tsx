export default function Loading() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
    </div>
  );
}
