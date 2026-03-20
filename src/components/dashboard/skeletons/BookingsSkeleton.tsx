import { Skeleton } from "@/components/ui/skeleton";

/** Table-row skeleton for the Bookings page */
export function BookingsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2.5 w-20 rounded-none" />
          <Skeleton className="h-7 w-32 rounded-none" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border pb-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-4 w-20 rounded-none" />
        ))}
      </div>

      {/* Table */}
      <div className="border border-border rounded-sm overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-5 py-3 bg-muted/30 border-b border-border">
          {[2, 1.5, 1.4, 0.9, 1, 0.8].map((w, i) => (
            <div key={i} style={{ flex: w }}>
              <Skeleton className="h-2.5 w-16 rounded-none" />
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-5 py-4 border-b border-border last:border-0 items-center"
          >
            {/* Client */}
            <div style={{ flex: 2 }} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32 rounded-none" />
              <Skeleton className="h-2.5 w-24 rounded-none opacity-60" />
            </div>
            {/* Session */}
            <div style={{ flex: 1.5 }}>
              <Skeleton className="h-3.5 w-28 rounded-none" />
            </div>
            {/* Date & time */}
            <div style={{ flex: 1.4 }} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24 rounded-none" />
              <Skeleton className="h-2.5 w-20 rounded-none opacity-60" />
            </div>
            {/* Payment */}
            <div style={{ flex: 0.9 }}>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            {/* Status */}
            <div style={{ flex: 1 }}>
              <Skeleton className="h-5 w-20 rounded-sm" />
            </div>
            {/* Actions */}
            <div style={{ flex: 0.8 }} className="flex gap-2">
              <Skeleton className="h-6 w-6 rounded-sm" />
              <Skeleton className="h-6 w-6 rounded-sm" />
              <Skeleton className="h-6 w-6 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
