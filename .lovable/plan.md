

## Add Agent Management Controls to Chat Page

Currently the Chat page only shows a dropdown to select an agent and the AI mode per ticket. The user wants the same agent configuration controls from the AI Agents page (enable/disable, auto_reply, review_mode, model, temperature, knowledge base viewing) accessible directly from the Chat page.

### Changes to `src/pages/dashboard/Chat.tsx`

**1. Expand the Agent type** to include `auto_reply`, `review_mode`, `model`, `temperature`, `description`, `system_prompt`, `knowledge_base`.

**2. Load all agents** (not just enabled ones) so the user can toggle enable/disable from Chat.

**3. Add an "Agent Settings" panel** in the right sidebar (below the existing Client Info section, or as a collapsible section). When a ticket is selected and AI mode is not manual, show:

- **Agent selector** (already exists in header — keep it)
- **Enable/Disable toggle** — Switch to activate/deactivate the selected agent (updates `ai_agents.enabled`)
- **Auto Reply toggle** — Switch to turn on/off auto-reply (`auto_reply` field)
- **Review Mode toggle** — When auto_reply is on, show supervised mode toggle (`review_mode` field)  
- **Model selector** — Dropdown with the same MODELS list from AIAgents page
- **Temperature slider** — 0-1 with 0.1 steps
- **Knowledge Base count** — Badge showing number of entries, with expandable/collapsible list showing topic names

All changes save immediately to the `ai_agents` table on toggle/change (same pattern as AIAgents page).

**4. UI placement**: Add a collapsible "Agent Monitor" section in the right panel (below Internal Notes), with an accordion or collapsible component. This keeps the layout clean while giving full control.

### Files to edit

| File | Change |
|---|---|
| `src/pages/dashboard/Chat.tsx` | Expand Agent type, load full agent data, add agent monitor panel in right sidebar |

No database changes needed — all fields already exist on `ai_agents`.

