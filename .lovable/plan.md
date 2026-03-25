
## Always show session-type group headers in Bookings

### Problem
Lines 554-561 in `Bookings.tsx` short-circuit to a flat table (no headers) when `groups.size === 1`. The category banner only appears when there are 2+ session types. The user wants the label to always be visible.

### Fix — single file change
Remove the `if (!hasMultipleGroups)` early return so the grouped rendering path is always used. The empty-category case (`""`) will show "Uncategorized".

**`src/pages/dashboard/Bookings.tsx` — lines 554–561:**

Before:
```tsx
if (!hasMultipleGroups) {
  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {tableHeader}
      {filteredBookings.map((b, i) => renderRow(b, i, filteredBookings))}
    </div>
  );
}

return (
  <div className="flex flex-col gap-6">
    {Array.from(groups.entries()).map(([cat, list]) => (
```

After:
```tsx
return (
  <div className="flex flex-col gap-6">
    {Array.from(groups.entries()).map(([cat, list]) => (
```

That's the entire change — delete the 7-line early return so every render goes through the grouped path.
