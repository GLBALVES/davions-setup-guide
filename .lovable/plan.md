

## Create Default AI Support Agent & Fix Agent-Chat Integration

### Current State
- **AI Agents page** exists — can create/edit agents with system prompts, knowledge bases, models, temperature
- **Chat page** exists — loads enabled agents, has agent selector per ticket, triggers `ai-chat` edge function
- **`ai-chat` edge function** exists — reads agent config by slug, fetches conversation history, calls Lovable AI Gateway

### Problems Found
1. **No default agent exists** — the chat system requires manually creating an agent first
2. **Test chat in AI Agents is broken** — it sends `{ agent_slug, messages }` but the edge function expects `{ ticket_id, message, agent_slug, mode }`. The test doesn't use tickets, so it fails.
3. **Knowledge base field mismatch** — the edge function reads `item.title` but the Agent interface uses `topic` as the field name

### Plan

**1. Update `ai-chat` edge function** to support two modes:
- **Ticket mode** (existing): `{ ticket_id, agent_slug, mode }` — fetches history from DB
- **Direct mode** (for testing): `{ agent_slug, messages }` — uses provided messages array directly, no DB save
- Fix knowledge base field: read `item.topic` alongside `item.title`

**2. Auto-create default support agent** — Add logic in the Chat page that checks if any agents exist on first load; if none, auto-creates a "Customer Support" agent with:
- slug: `customer-support`
- system_prompt: comprehensive support prompt for photographers
- category: `support`
- knowledge_base: starter entries about bookings, galleries, sessions
- model: `google/gemini-3-flash-preview`

**3. Fix AIAgents test chat** — Update the `handleTest` function to send the correct payload format matching the updated edge function's direct mode

### Files to edit

| File | Change |
|---|---|
| `supabase/functions/ai-chat/index.ts` | Add direct mode support; fix KB field name |
| `src/pages/dashboard/Chat.tsx` | Auto-create default agent if none exist |
| `src/pages/dashboard/AIAgents.tsx` | Fix test chat payload format |

