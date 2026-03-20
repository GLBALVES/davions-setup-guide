import { Skeleton } from "@/components/ui/skeleton";

/** Kanban-column skeleton for the Projects page */
export function ProjectsSkeleton() {
  const COLS = 6;
  const CARDS_PER_COL = [2, 1, 0, 1, 0, 0];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-24 rounded-none" />
          <Skeleton className="h-7 w-32 rounded-none" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-sm" />
          <Skeleton className="h-8 w-16 rounded-sm" />
          <Skeleton className="h-8 w-32 rounded-sm" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 pb-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-4 w-16 rounded-none" />
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: COLS }).map((_, colIdx) => (
          <div key={colIdx} className="flex flex-col min-w-[220px] w-[220px] shrink-0 gap-2">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2.5 w-20 rounded-none" />
              <Skeleton className="h-2.5 w-4 rounded-none opacity-40" />
            </div>
            {/* Cards */}
            {Array.from({ length: CARDS_PER_COL[colIdx] || 0 }).map((_, cardIdx) => (
              <div key={cardIdx} className="border border-border rounded-sm p-3 flex flex-col gap-2.5">
                <Skeleton className="h-3.5 w-4/5 rounded-none" />
                <Skeleton className="h-3 w-3/5 rounded-none opacity-60" />
                <div className="flex gap-2 mt-0.5">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-16 rounded-none opacity-50" />
                </div>
              </div>
            ))}
            {/* Empty drop zone */}
            {CARDS_PER_COL[colIdx] === 0 && (
              <div className="border border-dashed border-border rounded-sm h-16 opacity-40" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
