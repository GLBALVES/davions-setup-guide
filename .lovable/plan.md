
## Plan: Show add-ons only after date + time selection

**Problem**: The extras/add-ons card is currently visible at all times in step 1, even before the client picks anything.

**Fix**: Single condition change on line 586.

Current:
```tsx
{extras.length > 0 && (
```

After:
```tsx
{extras.length > 0 && selectedSlot && (
```

This gates the entire add-ons card behind `selectedSlot` being set — which only happens after the client picks both a date and a time chip. No other changes needed.
