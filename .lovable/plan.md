
## Restructure Dashboard Sidebar — Full English Menu with Groups & Submenus

### What changes
Only **`src/components/dashboard/DashboardSidebar.tsx`** is modified. No new routes, no DB changes.

### Menu structure (all in English)
```
Favorites
  └─ Starred functions  [placeholder]

Photographers
  ├─ Dashboard           /dashboard
  ├─ Sessions            /dashboard/sessions
  ├─ Bookings            /dashboard/bookings
  ├─ Proof Galleries     /dashboard/galleries?type=proof
  └─ Final Galleries     /dashboard/galleries?type=final

Marketing
  ├─ Website             [placeholder]
  ├─ Blog                [placeholder]
  ├─ Social Media        [placeholder]
  ├─ SEO                 [placeholder]
  ├─ Emails              [placeholder]
  ├─ Push                [placeholder]
  └─ WhatsApp            [placeholder]

AI
  ├─ AI Agents           [placeholder]
  ├─ AI Automations      [placeholder]
  ├─ Smart Suggestions   [placeholder]
  └─ Creative Assistant  [placeholder]

Finance
  ├─ Dashboard           [placeholder]
  ├─ Receivables         [placeholder]
  ├─ Payables            [placeholder]
  ├─ Cash Flow           [placeholder]
  └─ Reports             [placeholder]

CRM
  ├─ Sessions            [placeholder]
  └─ Leads               [placeholder]

Workflows
  ├─ Kanban              [placeholder]
  └─ Recurring Workflows [placeholder]

Settings
  ├─ My Profile          /dashboard/settings
  └─ Access Control      [placeholder]

My Features
  └─ Create Feature      [placeholder]
```

### Implementation approach
- Define a `groups` config array — each group has `title`, `icon`, and `items[]`; items have `title`, `icon`, `to?` (real route) or no `to` (placeholder)
- Per-group `open` state using `useState`, initialized to `true` for the group containing the active route
- Collapsible group labels with a `ChevronRight` icon that rotates when open
- Real route items use `NavLink` + `SidebarMenuButton asChild`
- Placeholder items render as `<button disabled>` with `opacity-40 cursor-not-allowed` — no tooltip, just visually clear they're coming soon
- Footer (user email + Sign Out) unchanged
- Collapsed icon mode: group labels hidden, item icons still show with tooltips — same behavior as before

### Icons to use (all from lucide-react)
- Favorites: `Star`
- Photographers: `Camera`
- Marketing: `Megaphone`
- AI: `BrainCircuit`
- Finance: `DollarSign`
- CRM: `Users2`
- Workflows: `GitBranch`
- Settings: `Settings`
- My Features: `Puzzle`
- Sub-items: `Globe`, `BookText`, `Share2`, `SearchCheck`, `Mail`, `Bell`, `MessageCircle`, `Bot`, `Zap`, `Lightbulb`, `Wand2`, `LayoutDashboard`, `ArrowDownCircle`, `ArrowUpCircle`, `TrendingUp`, `BarChart3`, `CalendarDays`, `UserPlus`, `Columns`, `RefreshCw`, `UserCircle`, `ShieldCheck`, `PlusSquare`, `ScanEye`, `Images`, `BookOpen`
