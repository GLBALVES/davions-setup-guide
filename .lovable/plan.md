
## Fix: Remove Brazil DDI (+55) from the phone placeholder

### Problem
Line 663 in `SessionDetailPage.tsx` has `placeholder="+55 11 99999-9999"` — this is Brazil's format. Since the app targets the US market, this should use a US format.

### Fix
One line change:

**`src/pages/store/SessionDetailPage.tsx`, line 663**
```tsx
// Before
placeholder="+55 11 99999-9999"

// After
placeholder="(555) 555-0100"
```

This removes the Brazilian DDI entirely and uses a standard US phone format placeholder, which is clean and familiar for American users.

### Files Changed
- `src/pages/store/SessionDetailPage.tsx` — line 663 only
