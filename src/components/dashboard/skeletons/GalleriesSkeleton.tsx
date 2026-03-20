import { Skeleton } from "@/components/ui/skeleton";

/** Card-grid skeleton for the Galleries pages (Proof & Final) */
export function GalleriesSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-24 rounded-none" />
          <Skeleton className="h-7 w-36 rounded-none" />
        </div>
        <Skeleton className="h-8 w-36 rounded-sm" />
      </div>

      {/* Filter / search bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-20 rounded-none" />
          ))}
        </div>
        <Skeleton className="h-8 w-48 rounded-sm" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col border border-border rounded-sm overflow-hidden">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="p-4 flex flex-col gap-2.5">
              <Skeleton className="h-4 w-2/3 rounded-none" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-16 rounded-none opacity-60" />
                <Skeleton className="h-3 w-12 rounded-none opacity-60" />
              </div>
              <div className="flex items-center justify-between mt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
