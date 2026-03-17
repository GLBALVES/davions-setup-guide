
## Current Translation Status

### Already translated (hook integrated + keys applied)
- Dashboard (Home), Sessions, Galleries, Bookings, Schedule, Projects, Clients
- Finance: Dashboard, Receivables, Payables, CashFlow, Reports, Revenue, Billing
- Email Marketing, Settings

### Hook imported but JSX NOT yet replaced (keys exist in translations.ts)
- **GalleryDetail.tsx** — hook present, `t.galleryDetail.*` namespace ready, strings still hardcoded in JSX
- **SessionForm.tsx** — hook present, `t.sessionForm.*` namespace ready, strings still hardcoded in JSX  
- **Personalize.tsx** — hook present, `t.personalize.*` namespace ready, strings still hardcoded in JSX

### No hook, no keys — fully hardcoded (need namespace + JSX work)
Grouped by menu section:

**Marketing**
- BlogManager.tsx (~271 lines) — Blog post list, theme ideas tab
- BlogEditor.tsx — Rich text editor page
- SiteSeo.tsx (~558 lines) — SEO settings, analytics tab, pages tab
- SocialMedia.tsx (~265 lines) — Facebook/Instagram API connections
- PushNotifications.tsx (~161 lines) — Push notification management
- EmailCampaignEditor.tsx, EmailAutomatedEditor.tsx, EmailOneoffEditor.tsx — individual email editors

**AI**
- AIAgents.tsx (~415 lines) — Agent builder, knowledge base, chat test
- Chat.tsx

**Workflows**
- Workflows.tsx (~520 lines) — Kanban-style project + task manager
- WorkflowProject.tsx — Single project detail
- RecurringWorkflows.tsx

**Settings**
- WebsiteSettings.tsx (~818 lines) — Templates, fonts, colors, social links
- AccessControl.tsx (~685 lines) — Team members, permissions table
- CustomDomainDocs.tsx, LightroomPlugin.tsx, LightroomPluginHelp.tsx
- HelpCenter.tsx
- ContractEditor.tsx

---

## Proposed Batch Plan

### Batch 1 — Complete pending "has-hook" pages (Photographers menu)
Apply `t.*` keys already in `translations.ts` into JSX:
1. `GalleryDetail.tsx` — replace all hardcoded strings with `t.galleryDetail.*`
2. `SessionForm.tsx` — replace all hardcoded strings with `t.sessionForm.*`
3. `Personalize.tsx` — replace all hardcoded strings with `t.personalize.*`

### Batch 2 — Marketing menu
Add namespaces to `translations.ts` (EN/PT/ES) + apply in JSX:
- `BlogManager.tsx` + `BlogEditor.tsx` → `blog` namespace
- `SiteSeo.tsx` → `siteSeo` namespace
- `SocialMedia.tsx` → `socialMedia` namespace
- `PushNotifications.tsx` → `push` namespace
- 3 email editors (Campaign, Automated, Oneoff) → extend `emailMarketing` namespace

### Batch 3 — AI + Workflows
Add namespaces to `translations.ts` (EN/PT/ES) + apply in JSX:
- `AIAgents.tsx` + `Chat.tsx` → `aiAgents` / `chat` namespaces
- `Workflows.tsx` + `WorkflowProject.tsx` + `RecurringWorkflows.tsx` → `workflows` namespace

### Batch 4 — Settings & extras
Add namespaces to `translations.ts` (EN/PT/ES) + apply in JSX:
- `WebsiteSettings.tsx` → `websiteSettings` namespace
- `AccessControl.tsx` → `accessControl` namespace
- `ContractEditor.tsx` → `contractEditor` namespace
- `HelpCenter.tsx` + `CustomDomainDocs.tsx` + `LightroomPluginHelp.tsx` → `helpCenter` / `docs` namespaces

---

## Summary Table

| Batch | Pages | Status |
|---|---|---|
| 1 — Photographers (JSX pending) | GalleryDetail, SessionForm, Personalize | Namespace ready → apply in JSX |
| 2 — Marketing | Blog, SEO, Social, Push, Email editors | New namespace + JSX |
| 3 — AI + Workflows | AIAgents, Chat, Workflows, WorkflowProject, Recurring | New namespace + JSX |
| 4 — Settings & extras | WebsiteSettings, AccessControl, ContractEditor, HelpCenter, Docs | New namespace + JSX |

Recommend starting with **Batch 1** since the translation keys already exist and it's the highest-impact set (core Photographers menu pages used daily).
