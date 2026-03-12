
## Context
The Finance group in the sidebar has 6 items, only "Revenue" has a route. The others (Dashboard, Receivables, Payables, Cash Flow, Reports) have no `to` property — they're disabled stubs. The user wants:
1. **Finance > Dashboard** — a proper financial overview page at `/dashboard/finance` (the "hub")
2. **Finance > Receivables** — bookings with balance still owed
3. **Finance > Payables** — placeholder page (future: photographer expenses, supplier payments)
4. **Finance > Cash Flow** — monthly income vs. projected view
5. **Finance > Reports** — downloadable/exportable summary

The existing **Revenue** page stays as-is (detailed booking table + chart).

---

## What will be built

### 5 new pages

**1. `/dashboard/finance` — Finance Dashboard**
The overview hub. Cards + mini-charts pulling from `bookings`:
- Total Collected (all time)
- Balance Due (outstanding)
- Avg ticket value
- Revenue this month vs last month (% change)
- Mini bar chart: last 6 months revenue
- 2 lists: Top 5 most valuable clients, Top 5 sessions by revenue
- Quick links to other Finance pages

**2. `/dashboard/finance/receivables` — Receivables**
Focused table of bookings with `payment_status = 'pending' OR 'deposit_paid'` (money still owed). Columns: Date, Client, Session, Total, Paid, Balance Due, Status. Emphasis on the "Balance Due" column with follow-up cues.

**3. `/dashboard/finance/payables` — Payables**
Placeholder page with a clean "Coming Soon" state, showing the concept (future: track your own business expenses, vendor costs, etc.).

**4. `/dashboard/finance/cashflow` — Cash Flow**
Monthly chart showing:
- Collected revenue per month (bar)
- Outstanding balance per month (stacked or line)
- A table of monthly aggregates: month, collected, outstanding, net

**5. `/dashboard/finance/reports` — Reports**
Summary cards by time period (This Month / Last Month / This Year / All Time), with a simple exportable table and a "Export CSV" button that generates a client-side CSV from booking data.

---

## Sidebar updates
Wire all 5 items to their routes in `DashboardSidebar.tsx`:
```
{ title: "Dashboard",    icon: LayoutDashboard, to: "/dashboard/finance" }
{ title: "Receivables",  icon: ArrowDownCircle, to: "/dashboard/finance/receivables" }
{ title: "Payables",     icon: ArrowUpCircle,   to: "/dashboard/finance/payables" }
{ title: "Cash Flow",    icon: TrendingUp,      to: "/dashboard/finance/cashflow" }
{ title: "Reports",      icon: BarChart3,       to: "/dashboard/finance/reports" }
```
The existing Revenue entry (`/dashboard/revenue`) stays in the group.

## App.tsx updates
Register 5 new protected routes:
- `/dashboard/finance`
- `/dashboard/finance/receivables`
- `/dashboard/finance/payables`
- `/dashboard/finance/cashflow`
- `/dashboard/finance/reports`

## Data sources
All pages read from `bookings` joined with `sessions` — same query pattern as Revenue.tsx. No new DB tables needed.

## Files to create/edit
```
CREATE  src/pages/dashboard/FinanceDashboard.tsx
CREATE  src/pages/dashboard/FinanceReceivables.tsx
CREATE  src/pages/dashboard/FinancePayables.tsx
CREATE  src/pages/dashboard/FinanceCashFlow.tsx
CREATE  src/pages/dashboard/FinanceReports.tsx
EDIT    src/App.tsx                                  (add 5 routes)
EDIT    src/components/dashboard/DashboardSidebar.tsx (wire to links)
```
