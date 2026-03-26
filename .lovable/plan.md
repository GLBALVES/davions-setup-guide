
## Análise

O vídeo referenciado (book.usesession.com) mostra 3 funcionalidades que não existem no sistema:

**1. Localização por data de campanha** — cada data da campanha pode ter um local diferente (ex: "HOUSTON" em 27/mar, "BRENHAM, TX" em 28/mar). Atualmente só existe um campo `location` global na sessão.

**2. Vagas por horário (spots per slot)** — cada horário exibe quantas vagas restam ("Choose from 2 available spots", "SOLD OUT"). Atualmente um horário é tratado como único por booking.

**3. Layout de listagem por datas para campanha** — na página pública, a referência exibe as datas em formato lista/accordion vertical com o local e horários embaixo de cada data, em vez do calendário padrão. Isso é muito mais direto para campanhas com poucas datas fixas.

---

## O que é viável implementar

**Totalmente viável:**
- Layout de datas listadas para campanhas na página pública
- Localização por data de campanha

**Viável com migração de banco:**
- Vagas por horário (spots) — requer nova coluna `spots` na tabela `session_availability`

---

## Plano de Implementação

### 1. Migração de banco de dados
- Adicionar coluna `spots INTEGER DEFAULT 1` na tabela `session_availability` — controla quantas reservas simultâneas o horário aceita.
- Adicionar coluna `location_override TEXT` na tabela `session_availability` — permite sobrescrever a localização por slot/data de campanha. Na prática, para campanhas, todos os slots de uma mesma data compartilham o mesmo `location_override`.

### 2. Cadastro da sessão (SessionForm.tsx) — Step 1 e Step 2

**Step 1 — Campanha:**
- Ao selecionar datas da campanha, exibir para cada data um campo de localização opcional ("Local específico desta data"). Guardado no estado como `Record<string, string>` (dateKey → location).

**Step 2 — Disponibilidade:**
- No bloco de slots da campanha, adicionar campo "Vagas por horário" (padrão: 1). Único valor aplicado a todos os slots da campanha.
- Na lógica `handleSaveAvailability`, ao inserir os registros de campanha, salvar o `spots` e o `location_override` de cada data.

### 3. Página pública de sessão (SessionDetailPage.tsx)

**Detecção do tipo de sessão:**
- Ao carregar, detectar se é campanha (registros `session_availability` com `date != null`).
- Agrupar os slots por data.

**Layout condicional na seleção de horários:**
- Se for **campanha**: substituir o calendário por uma listagem vertical de datas. Cada data mostra:
  - Nome do dia e data formatada
  - Local da data (se `location_override` estiver definido)
  - Badges dos horários disponíveis com contagem de vagas ("2 vagas disponíveis" / "Esgotado")
- Se for **sessão padrão**: manter o calendário atual.

**Contagem de vagas:**
- Na query de bookings, contar por `availability_id + booked_date` e comparar com `spots`. Se `count >= spots`, o slot está desabilitado como "Esgotado" em vez de "booked".

### 4. Arquivos afetados
```text
supabase/migrations/     → nova migração SQL
src/pages/dashboard/SessionForm.tsx  → campos de location por data + spots
src/pages/store/SessionDetailPage.tsx → layout de lista para campanhas + vagas
```

### Detalhes técnicos

**Migração SQL:**
```sql
ALTER TABLE session_availability ADD COLUMN IF NOT EXISTS spots INTEGER DEFAULT 1;
ALTER TABLE session_availability ADD COLUMN IF NOT EXISTS location_override TEXT;
```

**Estado adicionado em SessionForm:**
- `campaignDateLocations: Record<string, string>` — mapa dateKey → localização específica
- `campaignSpots: string` — número de vagas por horário (aplicado a todos)

**Lógica de vagas na página pública:**
- Query de bookings: `SELECT availability_id, booked_date, COUNT(*) as cnt GROUP BY availability_id, booked_date`
- Um slot é marcado como esgotado quando `cnt >= spots`

**UI na página pública (campanha):**
- Lista vertical substituindo o calendário no step "slots"
- Cada data em card expandível com horários como botões
- Badge de vagas: "X vagas" (verde/cinza) ou "Esgotado" (tachado)
