

## Sessão Avulsa (One Session) no Diálogo de Agendamento

### O que será feito

Adicionar uma opção "One Session" no Step 1 do `CreateBookingDialog`, ao lado dos cards de sessões existentes. Ao escolher essa opção, o fotógrafo preenche um mini-formulário inline para criar uma sessão avulsa, e depois segue para o Step 2 normalmente (data/hora/cliente).

### Fluxo do usuário

```text
Step 1: Select Session
  ┌────────────┐ ┌────────────┐ ┌──────────────┐
  │ Session A   │ │ Session B  │ │ + One Session │  ← novo card
  └────────────┘ └────────────┘ └──────────────┘

  Ao clicar em "+ One Session":
  → Substitui a grid por um formulário com:
    - Nome da sessão (texto)
    - Duração (minutos)
    - Local (endereço)
    - Quantidade de fotos
    - Contrato (select dos contratos existentes)
    - Briefing (select dos briefings existentes)
    - Itens inclusos (lista de textos, adicionar/remover)

  Botão "Continue" → cria a sessão na tabela `sessions`
  com session_model='one_session', status='active',
  hide_from_store=true → vai pro Step 2

Step 2: Booking Details (já existe, sem mudanças)
  - Data / Hora / Conflitos
  - Cliente: SOMENTE email
    - Campo de email com busca: ao digitar, sugere clientes
      existentes (tabela bookings, client_email/client_name)
    - Se encontrar, preenche o nome automaticamente
    - Se não, preenche apenas o email (nome fica vazio ou
      extraído do email)
```

### Alterações

#### 1. `CreateBookingDialog.tsx` — Adicionar modo One Session no Step 1

- Novo estado `mode`: `'select' | 'one_session'` (default: `'select'`)
- Quando `mode === 'select'`: grid atual de sessões + card "One Session" (ícone diferenciado)
- Quando `mode === 'one_session'`: formulário com os 7 campos
- Campos do formulário:
  - `osName` (text, obrigatório)
  - `osDuration` (number, obrigatório)
  - `osLocation` (text, opcional)
  - `osNumPhotos` (number, opcional)
  - `osContractId` (select, opcional) — carrega da tabela `contracts`
  - `osBriefingId` (select, opcional) — carrega da tabela `briefings`
  - `osIncludes` (array de strings) — input + botão adicionar, chips removíveis
- Botão "Continue": insere na tabela `sessions` (session_model='one_session', hide_from_store=true) e os itens inclusos na tabela `session_bonuses`, depois avança para Step 2

#### 2. `CreateBookingDialog.tsx` — Step 2: Cliente apenas email com busca

- Remover campo "Client Name" obrigatório
- Campo email com autocomplete:
  - Ao digitar 3+ caracteres, busca `bookings` por `client_email` ou `client_name` (ILIKE)
  - Dropdown de sugestões mostrando nome + email
  - Ao selecionar, preenche email e nome
  - Se não selecionar nenhum, usa apenas o email digitado
- `clientName` se torna opcional (preenchido automaticamente pela busca ou vazio)
- Ajustar validação: `isValid` exige apenas `clientEmail`, não `clientName`

#### 3. Traduções (i18n)

Adicionar chaves nos 3 idiomas (en/pt/es) para:
- "One Session", "Session Name", "Duration", "Location", "Number of Photos", "Contract", "Briefing", "Items Included", "Add item", "Search client...", "No briefing", "No contract", "Continue"

### Detalhes técnicos

- A sessão criada via One Session usa `session_model='one_session'` (coluna já existe na tabela `sessions`) e `hide_from_store=true` para não aparecer na loja pública
- Os itens inclusos são salvos na tabela `session_bonuses` (já existe, com FK para `session_id`)
- A busca de clientes usa query ILIKE em `bookings` filtrado por `photographer_id`, com `DISTINCT ON (client_email)` para evitar duplicatas
- Contratos e briefings são carregados com queries simples filtradas por `photographer_id`

