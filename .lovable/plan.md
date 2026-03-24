
## Goal

Add a **"VPS Certificates"** tab to the existing `/admin/domains` page. This tab will:

1. Fetch `https://davions.giombelli.com.br/api/certs` to get issued SSL certificates from the VPS
2. Cross-reference each domain with the `photographers` table (`custom_domain` column) to show the linked photographer name
3. Display a table: **Domínio** | **SSL** | **Fotógrafo** | **Cadastrado em**
4. Show a green "SSL Ativo" badge for each cert
5. Show photographer name if found, or "Não cadastrado" in red if not
6. Refresh button + loading state + error handling

---

## Approach

### Tab system
Wrap the existing page content in a simple tab toggle (two buttons: "Domínios Registrados" / "Certificados VPS"). No new library needed — use `useState` for the active tab.

### API response assumption
`/api/certs` likely returns an array of objects. Common Caddy cert API shape:
```json
[
  { "domain": "example.com", "not_after": "2025-06-01T..." },
  ...
]
```
The component will handle both array-of-strings and array-of-objects, extracting the domain name defensively.

### Cross-reference
The `photographers` query is already loaded on this page (line 494–505). Pass it down to the certs tab and use `.find(p => p.custom_domain === cert.domain)` to resolve names.

### Error handling
If the fetch fails (CORS, network, non-200), show an error card with the message and a retry button.

---

## Files to Edit

### `src/pages/admin/AdminDomains.tsx`

1. **Add tab state** at the top of `AdminDomains` (line ~488):
   ```ts
   const [activeTab, setActiveTab] = useState<"domains" | "certs">("domains");
   ```

2. **Add `VpsCertsTab` component** (before `AdminDomains`, after `ChainDiagnostic`):
   - `useQuery` with `queryKey: ["vps-certs"]` fetching `https://davions.giombelli.com.br/api/certs`
   - Accepts `photographers` prop for cross-reference
   - Renders table with 4 columns
   - Refresh button uses `refetch()`
   - Loading skeleton, error state

3. **Wrap existing table in tab conditional** — surround the existing table block (line ~567–757) with `{activeTab === "domains" && (...)}` and add `{activeTab === "certs" && <VpsCertsTab photographers={photographers} />}`

4. **Add tab bar** in the header area (after the title row, before the stale-pending alert), with two pill-style buttons matching the existing design language (text-xs, font-light, tracking-wide).

No new files, no new dependencies.
