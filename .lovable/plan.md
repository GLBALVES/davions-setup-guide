

## Chat Support System for Davions

Replicate the Anglo Medicine Chat/Support system, adapted to Davions' dashboard layout, translated to English, with AI agent integration.

### What it includes

**Dashboard Chat Page** (`/dashboard/chat`)
- Three-panel layout: Ticket list (left) + Conversation (center) + Client info (right)
- Commander bar with AI mode toggles (Manual / AI Active / Supervised)
- Ticket filtering (Open/All/Closed) and search
- Admin message sending with file attachments
- Draft review system: approve, edit, or discard AI-generated drafts
- Close ticket with warning message + Reopen functionality
- Rating display for closed tickets
- Client info sidebar showing photographer profile data, internal notes, and ticket history

**Database tables** (migration)
1. `support_tickets` — `id, photographer_id, user_id, subject, status (open/closed), rating, rating_comment, created_at, closed_at`
   - RLS: photographers CRUD own tickets (scoped by `photographer_id`)
2. `support_messages` — `id, ticket_id, role (user/assistant/admin/assistant_draft), content, attachment_url, created_at`
   - RLS: photographers CRUD messages in own tickets
3. Storage bucket `chat-attachments` (public)
4. Enable realtime on `support_messages` for live updates

**Edge Function: `ai-chat`**
- Already exists in current project's `supabase/functions/ai-blog-seo` pattern but needs a dedicated `ai-chat` function
- Fetches agent config by `slug` from `ai_agents` table
- Handles 3 modes: manual (skip), supervised (draft), active (reply)
- Uses Lovable AI Gateway with agent's model/temperature/knowledge base
- Update `supabase/config.toml` to register the function with `verify_jwt = false`

**Sidebar update**
- Replace the placeholder "WhatsApp" item in Marketing group with "Chat" linking to `/dashboard/chat`

**Routing**
- Add `/dashboard/chat` route in `App.tsx`

### Key adaptations from Anglo Medicine
- Replace `AdminLayout` with Davions `SidebarProvider + DashboardSidebar + DashboardHeader`
- Remove Anglo-specific client profile fields (status_anglo, teleplan, planos) — replace with photographer-relevant client data from existing tables (bookings, galleries)
- Scope all queries by `photographer_id = auth.uid()`
- All labels translated to English
- "Aberto/Fechado" → "Open/Closed", "Rascunho" → "Draft", "Aprovar" → "Approve", etc.

### Files to create/edit

| File | Action |
|---|---|
| Migration SQL | Create `support_tickets`, `support_messages` tables + RLS + storage bucket |
| `supabase/functions/ai-chat/index.ts` | New edge function for AI agent chat |
| `supabase/config.toml` | Add `[functions.ai-chat]` entry |
| `src/pages/dashboard/Chat.tsx` | Full chat management page |
| `src/App.tsx` | Add `/dashboard/chat` route |
| `src/components/dashboard/DashboardSidebar.tsx` | Change "WhatsApp" to "Chat" with link |

