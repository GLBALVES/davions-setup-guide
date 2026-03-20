import { Skeleton } from "@/components/ui/skeleton";

/** Card-grid skeleton for the Sessions page */
export function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-24 rounded-none" />
          <Skeleton className="h-7 w-36 rounded-none" />
        </div>
        <Skeleton className="h-8 w-32 rounded-sm" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-20 rounded-none" />
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col border border-border rounded-sm overflow-hidden">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="p-4 flex flex-col gap-3">
              <Skeleton className="h-4 w-3/4 rounded-none" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-12 rounded-none" />
                <Skeleton className="h-3 w-16 rounded-none" />
              </div>
              <div className="flex items-center justify-between mt-1">
                <Skeleton className="h-5 w-20 rounded-none" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-6 rounded-sm" />
                  <Skeleton className="h-6 w-6 rounded-sm" />
                  <Skeleton className="h-6 w-16 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
