
## Current State Audit

### Already translated (using `useLanguage`):
- `DashboardSidebar` — nav groups + favorites
- `Dashboard` (home) — greeting, stats, pipeline
- `Sessions` — full
- `Galleries` — full
- `Bookings` — full
- `Schedule` — full
- `Clients` — full
- `Projects` — full
- `EmailMarketing` — full
- `Settings` — profile tab + language selector

### NOT yet translated (hardcoded English):
**Dashboard pages:**
- `GalleryDetail` — tabs, buttons, upload, share, watermark, expiry (very large ~1947 lines)
- `SessionForm` — multi-step form, all labels, placeholders, validation
- `Workflows` — project list, create dialog, status badges
- `WorkflowProject` — task board, sections, members, priorities
- `RecurringWorkflows` — trigger/frequency labels
- `AIAgents` — agent list, knowledge base editor
- `Chat` — tickets, message interface
- `CreativeStudio` — all controls, format selectors, template labels
- `BlogManager` — post list, status badges, actions
- `BlogEditor` — toolbar, publish controls
- `SiteSeo` — tabs, form fields
- `PushNotifications` — subscriber list, send form
- `Personalize` — studio/business/gallery tabs
- `WebsiteSettings` — branding, SEO, store URL, domain tabs
- `AccessControl` — team members, roles, permissions
- `SocialMedia` — platform connections, analytics
- `Revenue` — stats, date filters
- `FinanceDashboard` — chart labels, summary cards
- `FinanceReceivables` / `FinancePayables` / `FinanceCashFlow` / `FinanceReports` — table headers, filters
- `Billing` — plan names, invoice list
- `HelpCenter` — already translated internally but not using global context
- `ContractEditor` — editor toolbar, fields
- `EmailCampaignEditor` / `EmailAutomatedEditor` / `EmailOneoffEditor` — editors
- `LightroomPlugin` / `LightroomPluginHelp` — content sections
- `CustomDomainDocs` — docs content
- `SessionDetailPage` / `StorePage` / `GalleryView` — public pages
- `Login` / `Signup` / `Index` (landing)

**Components (shared):**
- `DashboardHeader` — notifications, profile menu
- `SessionTypeManager`, `WatermarkEditor`, `BugReportDialog` — dialogs
- `ProjectDetailSheet`, `BookingDetailSheet`, `CreateBookingDialog` — sheets/dialogs

---

## Translation Plan

### Phase 1 — Expand `translations.ts`
Add new top-level namespaces for every untranslated section in all 3 languages:

```text
translations.ts additions:
├── galleryDetail      (upload, share, tabs, expiry, watermark)
├── sessionForm        (steps, fields, validation messages)
├── workflows          (project list, status labels, dialogs)
├── workflowProject    (task board, sections, priorities, members)
├── recurringWorkflows (triggers, frequencies)
├── aiAgents           (agent cards, knowledge base)
├── chat               (tickets, messages, statuses)
├── creativeStudio     (formats, templates, controls)
├── blog               (post list, editor, statuses)
├── seo                (tabs, fields)
├── push               (subscribers, send form)
├── personalize        (studio/business/gallery tabs)
├── websiteSettings    (branding, store, domain tabs)
├── accessControl      (roles, invite, permissions)
├── socialMedia        (platforms, connect, insights)
├── finance            (revenue, dashboard, receivables, payables, cashflow, reports, billing)
├── help               (reuse existing HelpCenter local state → global context)
├── contracts          (editor toolbar, fields)
└── common             (extend: status labels, date formats, pagination)
```

### Phase 2 — Apply to pages (priority order)

**Batch A — Core photographer flow:**
1. `GalleryDetail.tsx`
2. `SessionForm.tsx`
3. `Personalize.tsx`
4. `WebsiteSettings.tsx`

**Batch B — Finance & CRM:**
5. `FinanceDashboard.tsx` + `FinanceReceivables.tsx` + `FinancePayables.tsx` + `FinanceCashFlow.tsx` + `FinanceReports.tsx`
6. `Revenue.tsx`
7. `Billing.tsx`

**Batch C — Workflows & AI:**
8. `Workflows.tsx` + `WorkflowProject.tsx`
9. `RecurringWorkflows.tsx`
10. `AIAgents.tsx`
11. `Chat.tsx`

**Batch D — Marketing & Content:**
12. `BlogManager.tsx` + `BlogEditor.tsx`
13. `SiteSeo.tsx`
14. `PushNotifications.tsx`
15. `CreativeStudio.tsx`
16. `SocialMedia.tsx`
17. `EmailCampaignEditor.tsx` + `EmailAutomatedEditor.tsx` + `EmailOneoffEditor.tsx`

**Batch E — Settings & Misc:**
18. `AccessControl.tsx`
19. `ContractEditor.tsx`
20. `HelpCenter.tsx` (migrate to global context)
21. `LightroomPlugin.tsx` + `LightroomPluginHelp.tsx`
22. `CustomDomainDocs.tsx`

**Batch F — Shared components:**
23. `DashboardHeader.tsx`
24. `SessionTypeManager`, `WatermarkEditor`, `BugReportDialog`, dialogs/sheets

**Batch G — Public pages (optional/last):**
25. `StorePage`, `SessionDetailPage`, `GalleryView`, `Login`, `Signup`, `Index`

---

## Implementation Strategy

- **One PR per batch** — keep each commit focused and reviewable
- **Namespace per page** — `t.galleryDetail.uploadPhotos`, `t.finance.receivables`, etc.
- **Never duplicate common strings** — reuse `t.common.save`, `t.common.cancel`, etc.
- **Static arrays inside component** — any array of options using translated labels must live inside the component body (after `const { t } = useLanguage()`)
- **HelpCenter** — replace internal `lang` state + local translation maps with `useLanguage()` from global context, keeping article content as-is

The entire plan can be executed in 1-3 implementation sessions depending on batch grouping. Batches A+B+C are the highest value for day-to-day photographer workflows.
