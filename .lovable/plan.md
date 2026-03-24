
## Add Status Filter to VPS Certs Table

### Current State
`VpsCertsTab` renders all certs in a single table with no filtering. The component already has `resolvedExpiry` and `days` computed per row.

### Plan

**File: `src/pages/admin/AdminDomains.tsx`** — `VpsCertsTab` only

1. Add `statusFilter` state: `"all" | "expiring" | "expired"`, defaulting to `"all"`.

2. Define filter logic (derived, no extra state):
   - `"all"` → show all certs
   - `"expiring"` → `days !== null && days > 0 && days <= 30`
   - `"expired"` → `days !== null && days <= 0`

3. Compute `filteredCerts` from `certs` using the resolved expiry data.

4. Add a filter bar between the header row and the `<Table>`, using three pill/tab buttons:
   - **Todos** — shows count of all certs
   - **Expirando** — yellow tint, shows count of certs with `days <= 30 && days > 0`
   - **Expirados** — red tint, shows count of certs with `days <= 0`

5. Update the counter text in the header to reflect the filtered count (e.g. "3 de 5 certificados").

6. Render `filteredCerts` in the `<TableBody>` instead of `certs`.

7. If filter results in zero rows, show an inline empty state inside the table body ("Nenhum certificado nesta categoria.").

### UI Shape
```
[ Todos (5) ]  [ Expirando (2) ]  [ Expirados (1) ]
```
Pills styled with the existing badge color classes already used in `ExpiryBadge` (yellow/red/neutral).

No new imports needed (already has `useState`, `cn`, `Badge`, etc.). No DB or edge function changes.
