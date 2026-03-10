

## Adicionar Barra "Commander" no Chat (padrão Anglo Medicine)

### Padrão Anglo Medicine
No projeto Anglo Medicine, o controle do agente de IA fica em uma **barra horizontal "Commander"** posicionada acima do layout principal do chat (não dentro do header do ticket). Essa barra contém:
- Ícone Bot + label "Commander"
- **Switch "IA Ativa"** — liga/desliga `auto_reply` do agente
- **Switch "Supervisão"** — liga/desliga `review_mode` (desabilitado se IA não está ativa)
- **Badge de modo** — "Manual", "IA Ativa" ou "IA c/ Supervisão" com cores distintas
- **Contador de rascunhos** — mostra quantos drafts pendentes existem

### Mudanças em `src/pages/dashboard/Chat.tsx`

**1. Expandir tipo Agent** para incluir `auto_reply`, `review_mode` e carregar esses campos do banco.

**2. Adicionar estado e funções do agente:**
- `AgentConfig` com `id`, `auto_reply`, `review_mode`, `enabled`
- `updateAgent(updates)` — salva alterações no `ai_agents` via Supabase
- `getMode()` — retorna label + cor baseado no estado atual

**3. Adicionar barra Commander** acima do layout de 3 painéis:
- Switches para "IA Ativa" e "Supervisão"
- Badge colorido com o modo atual
- Contagem de rascunhos pendentes

**4. Remover controles redundantes do header do ticket:**
- Remover o `Select` de AI Mode (manual/active/supervised) por ticket
- Remover o botão Settings2 (link para /dashboard/agents)
- O modo agora é global pelo Commander, não por ticket

**5. Sincronizar ai_mode dos tickets** com o estado do Commander:
- Quando o Commander muda para "Manual", novos envios usam modo manual
- Quando é "IA c/ Supervisão", usa supervised
- Quando é "IA Ativa", usa active

### Arquivo a editar

| Arquivo | Mudança |
|---|---|
| `src/pages/dashboard/Chat.tsx` | Adicionar Commander Bar, remover controles per-ticket de AI mode, adicionar lógica de toggle do agente |

