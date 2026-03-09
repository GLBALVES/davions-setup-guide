
## What the user wants

Enhance Step 3 (Payment) with:
1. **Collected amount input** — editable field showing the session price (carried from Step 1), representing what the client pays at booking
2. **Add Tax** — option to specify a tax percentage; the tax amount and total are computed and displayed
3. **Partial payment** — toggle to require only a partial amount upfront (e.g. deposit); if enabled, a "Deposit amount" input appears
4. **Price removed from Step 1** — the price field moves entirely to Step 3
5. **Allow tip** — toggle to let clients add a tip at checkout (Stripe supports this natively via `allow_promotion_codes` is not tips, but Stripe Checkout has no native tip — we'll save this as a flag and use it to surface tipping intent on the booking page later)

---

## Schema changes needed

The `sessions` table currently only has `price` (integer, cents). We need new columns:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `tax_rate` | numeric(5,2) | 0 | Tax percentage (e.g. 8.5) |
| `deposit_enabled` | boolean | false | Whether partial payment is required |
| `deposit_amount` | integer | 0 | Deposit in cents |
| `allow_tip` | boolean | false | Allow client to tip |

One migration, no breaking changes.

---

## Step 1 changes

- **Remove** the `price` input field from Step 1 (lines 724–738)
- Keep all other fields (title, description, location, duration, break, photos, status)
- When `handleCreateSession` runs, it inserts the session with `price = 0` (price will be finalized in Step 3)

---

## Step 3 changes

### State to add
```ts
const [taxRate, setTaxRate] = useState("0");
const [depositEnabled, setDepositEnabled] = useState(false);
const [depositAmount, setDepositAmount] = useState("");
const [allowTip, setAllowTip] = useState(false);
const [taxEnabled, setTaxEnabled] = useState(false);
```

### loadSession additions
Set these from DB on edit load.

### handleFinish additions
Save `tax_rate`, `deposit_enabled`, `deposit_amount`, `allow_tip` to the sessions row.

### UI structure for Step 3

```
Payment Settings
Configure how clients pay when booking this session.

┌─ Collected Amount ─────────────────────────────┐
│  Session: "Newborn Session"                     │
│  Price    [ $250.00 ] (editable)                │
└─────────────────────────────────────────────────┘

┌─ Tax ──────────────────────────────────────────┐
│ [toggle] Add Tax                                │
│  Tax rate: [ 8.5 ] %     → Tax: $21.25         │
│                           → Total: $271.25      │
└─────────────────────────────────────────────────┘

┌─ Partial Payment ──────────────────────────────┐
│ [toggle] Require deposit at booking             │
│  Deposit: [ $100.00 ]                           │
│  Remaining $150.00 due at session               │
└─────────────────────────────────────────────────┘

┌─ Tip ──────────────────────────────────────────┐
│ [toggle] Allow tip                              │
│  Clients can add a gratuity at checkout         │
└─────────────────────────────────────────────────┘

[toggle] Require payment at booking  (existing)
[Stripe info block]                  (existing)
```

### Computed values (reactive, no extra state)
```ts
const priceInCents = Math.round(parseFloat(price || "0") * 100);
const taxAmount = taxEnabled ? (priceInCents * parseFloat(taxRate || "0")) / 100 : 0;
const totalAmount = priceInCents + taxAmount;
```

---

## handleFinish changes

```ts
const finalPrice = requirePayment ? priceInCents : 0;
await supabase.from("sessions").update({
  price: finalPrice,
  tax_rate: taxEnabled ? parseFloat(taxRate) : 0,
  deposit_enabled: depositEnabled,
  deposit_amount: depositEnabled ? Math.round(parseFloat(depositAmount || "0") * 100) : 0,
  allow_tip: allowTip,
}).eq("id", sessionId);
```

---

## Files changed

| File | Change |
|---|---|
| `src/pages/dashboard/SessionForm.tsx` | Move price field from Step 1 to Step 3; add tax, deposit, tip state + UI; update handleFinish and loadSession |
| DB migration | Add `tax_rate`, `deposit_enabled`, `deposit_amount`, `allow_tip` to `sessions` table |
