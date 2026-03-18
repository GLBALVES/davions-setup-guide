
## Plan: Guided Custom Domain Setup Flow

**Goal:** Replace the static documentation page at `/dashboard/custom-domain-docs` with an interactive, step-by-step wizard that guides the photographer through the full custom domain setup using the Davions brand exclusively.

---

### What will be built

A new **CustomDomainSetup** component (replacing `CustomDomainDocs.tsx`) with a multi-step wizard UI:

```text
┌─────────────────────────────────────────────────────────┐
│  CUSTOM DOMAIN SETUP                        Step 2 of 4 │
│  ─────────────────────────────────────────────────────  │
│  ● ── ● ── ○ ── ○   (progress dots)                     │
│                                                         │
│  STEP 2 — Add DNS Records                               │
│                                                         │
│  Log in to your registrar and add:                      │
│  ┌──────┬──────┬───────────────────┐                    │
│  │ Type │ Name │ Value             │                    │
│  ├──────┼──────┼───────────────────┤                    │
│  │  A   │  @   │ 185.158.133.1 📋  │                    │
│  │  A   │ www  │ 185.158.133.1 📋  │                    │
│  │ TXT  │_dav… │ davions_verify=…  │                    │
│  └──────┴──────┴───────────────────┘                    │
│                                                         │
│        [ ← Back ]            [ Next → ]                 │
└─────────────────────────────────────────────────────────┘
```

---

### 4 Steps of the wizard

| Step | Title | Content |
|------|-------|---------|
| 1 | Enter your domain | Input field to type/save the domain (`booking.yourstudio.com`). Validates format. Saves to DB. |
| 2 | Add DNS records | Table with A records + TXT (named `_davions`, value `davions_verify=<provided>`), each row with a copy button. Warning about conflicting records. |
| 3 | Wait for propagation | Animated status card. Explains 48h window. Links to DNSChecker.org. Explains SSL auto-provisioning. |
| 4 | Done | Confirms the domain is saved. Shows final domain URL with copy/open buttons. Links to troubleshooting tips inline. |

---

### Files to change

1. **`src/pages/dashboard/CustomDomainDocs.tsx`** — Full rewrite as a multi-step wizard. Keeps the same route and page shell (DashboardSidebar + DashboardHeader). Removes ALL mentions of "Lovable". The TXT record name is `_davions`, value is `davions_verify=<provided>`.

2. **`src/pages/dashboard/WebsiteSettings.tsx`** — The "Setup Guide" link in the Custom Domain section already points to `/dashboard/custom-domain-docs`. Update the link label to read "**Setup Wizard**" (instead of "Setup Guide") to reflect the new interactive experience.

---

### Design approach
- Follows the project's minimalist aesthetic: `font-light`, `tracking-wide`, monospace for DNS values, border-heavy card rows.
- Step progress shown as numbered dots at the top.
- Copy-to-clipboard buttons on all DNS record values (with check feedback).
- No external platform references anywhere in the UI.
- Fully contained in one file — no new routes, no new DB tables needed.
