
## Domain Status + Test Connectivity — WebsiteSettings

### What to build

A domain status indicator inside the Custom Domain section (section 11) of `WebsiteSettings.tsx`, with:
- A **status badge** showing the domain state: `Checking...`, `Active`, or `Awaiting Setup`
- A **"Test Connectivity" button** that triggers a live check
- The check uses a new edge function `check-domain` that performs an HTTP HEAD request to `https://<domain>` from the server side

---

### Why a backend function (not frontend fetch)?

Browser `fetch()` to external domains is blocked by CORS — the response will always fail with a network error, making it impossible to determine if the domain is truly live. A server-side edge function performs a real HTTP request without CORS restrictions and returns a reliable result.

---

### Status logic

| Condition | Status | Badge |
|---|---|---|
| Not yet checked | — | grey "Not checked" |
| HTTP response received (any 2xx/3xx) | Active | green `CheckCircle2` |
| Connection refused / timeout / 4xx/5xx | Awaiting Setup | amber `Clock` |
| Checking in progress | — | spinner |

---

### Files to create/modify

**1. `supabase/functions/check-domain/index.ts`** — New edge function

- Receives `{ domain: string }` in request body
- Performs `fetch("https://${domain}", { method: "HEAD", signal: AbortSignal.timeout(8000) })`
- Returns `{ status: "active" | "pending", httpStatus?: number }`
- Validates JWT (same pattern as `notify-domain-saved`)

**2. `supabase/config.toml`** — Add `[functions.check-domain]` entry

**3. `src/pages/dashboard/WebsiteSettings.tsx`** — Add to section 11:

New state variables:
```ts
const [domainStatus, setDomainStatus] = useState<"idle" | "checking" | "active" | "pending">("idle");
```

New function `checkDomainConnectivity()` that calls `supabase.functions.invoke("check-domain", { body: { domain: customDomain } })` and updates `domainStatus`.

UI additions placed **below the DNS records block, above the Save Domain button**:
- Status row with badge (color-coded)
- "Test Connectivity" button (triggers `checkDomainConnectivity`, disabled while checking)
- Small hint: "Last checked just now" (ephemeral, only while status is shown)

---

### Status badge design (matches existing style)

```
Active         → green dot + "Active — domain is responding"
Awaiting Setup → amber clock + "Awaiting Setup — not responding yet"
Idle           → muted dot + "Not checked"
Checking       → spinner + "Checking..."
```

---

### Total: 1 new function + 2 file edits, ~80 lines
