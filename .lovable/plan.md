
## Problem

`notify-ssl-expiry` currently sends an alert email on **every execution** when any cert is within 30 days of expiry. With a daily cron, this produces daily spam even though nothing changed.

## Solution: State Tracking Table

Store a snapshot of the last known alert state per domain in a DB table. On each run, compare the current state against the snapshot. Send email only when the set of affected domains changes (a domain enters or leaves the alert window, or crosses the 7-day critical threshold).

### Logic
```text
1. Fetch certs from VPS + crt.sh expiry data
2. Compute current "alert set": domains where days ≤ 30, keyed by bucket (critical ≤7 / warning ≤30)
3. Load last snapshot from ssl_alert_state table
4. Diff: new domains entered alert window? Any domain crossed from warning → critical?
5. If diff is empty → skip email, return {ok:true, skipped:true}
6. If diff has changes → send email with ONLY the changed domains highlighted, then upsert snapshot
```

### State table: `ssl_alert_state`

```sql
CREATE TABLE public.ssl_alert_state (
  domain       text PRIMARY KEY,
  bucket       text NOT NULL,   -- 'critical' | 'warning' | 'ok'
  expires_at   text,
  notified_at  timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

- No RLS needed (only read/written by service role inside edge function)
- When a domain goes from `warning` → `critical` it triggers a new alert
- When a domain returns to `ok` its row is deleted from the table (so if it regresses, it triggers again)

### Files to Change

**1. New migration** — creates `ssl_alert_state` table (no RLS, accessed via service role key)

**2. `supabase/functions/notify-ssl-expiry/index.ts`** — rewrite the core logic:
- Use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to query/upsert `ssl_alert_state`
- For each cert, resolve real expiry via the existing `check-ssl-cert` edge function (same as the frontend does)
- Compute `bucket`: `"critical"` (≤7d), `"warning"` (≤30d), `"ok"` (>30d or null)
- Compare with persisted state
- Determine `newAlerts` (domain not in state or bucket escalated) and `resolved` (domains back to ok)
- Skip email if `newAlerts.length === 0`
- Email lists new/escalated domains with context; subject clarifies it's a new alert
- Upsert changed rows; delete resolved rows

### Email improvements
- Subject: `⚠️ Novo alerta SSL: 2 domínio(s) — Davions` (not sent repeatedly for same state)
- Body includes two sections: "Novos alertas" and "Resolvidos" (if any resolved since last run)
- Footer: "Próximo envio somente se o status mudar"

No frontend changes. No new secrets needed (`SUPABASE_SERVICE_ROLE_KEY` already configured).
