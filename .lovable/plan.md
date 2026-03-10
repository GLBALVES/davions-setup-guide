

## Move Agent Monitor Out of Chat Client Panel

The user correctly identifies that the Agent Monitor (enable/disable, auto-reply, review mode, model, temperature, knowledge base) is a **system-level configuration**, not tied to a specific client/ticket. It should not live inside the client info sidebar of the Chat page.

### Approach

**Remove** the "Agent Monitor" collapsible section from the right sidebar in `Chat.tsx` (lines ~750-851) and all related state/functions (`agentMonitorOpen`, `updateAgentField`, `MODELS` constant, expanded Agent type fields).

**Add** a quick-access link/button in the Chat page header (near the agent selector dropdown) that navigates to `/dashboard/agents` — the existing AI Agents page which already has full CRUD for all agent settings.

Alternatively, add a small "Settings" icon button next to the agent selector in the chat header bar that opens the AI Agents page in a new context or shows a lightweight Sheet/Dialog pulling the agent config from the existing `AIAgents` page pattern.

### Changes

| File | Change |
|---|---|
| `src/pages/dashboard/Chat.tsx` | Remove Agent Monitor collapsible from right sidebar. Remove `updateAgentField`, `agentMonitorOpen` state, `MODELS` array. Simplify Agent type back to basics. Add a Settings icon button next to the agent dropdown that links to `/dashboard/agents`. |

### What stays in Chat.tsx
- Agent selector dropdown (to pick which agent handles this ticket)
- AI mode toggle per ticket (manual/active/supervised)
- Client info + internal notes in the right sidebar (these ARE ticket-specific)

### What moves out
- Enable/Disable toggle → already on AI Agents page
- Auto Reply / Review Mode toggles → already on AI Agents page
- Model selector → already on AI Agents page
- Temperature slider → already on AI Agents page
- Knowledge Base viewer → already on AI Agents page

All these controls already exist on `/dashboard/agents`. No duplication needed.

