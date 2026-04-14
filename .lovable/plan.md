

## Trocar Session no modal de edição de projeto (ProjectDetailSheet)

### Resumo
Substituir o seletor de "Session Type" por um seletor de "Session" (a sessão real do booking). Ao trocar a session, verificar se existem addons (booking_invoice_items) no agendamento. Se houver, exibir um modal de revisão de addons (AddonReviewModal) onde o fotógrafo pode manter, editar ou remover cada item. A troca de session recalcula toda a parte financeira: preço base, tax, deposit, extras_total e balance.

### Arquivos e mudanças

**1. `src/components/dashboard/ProjectDetailSheet.tsx`**

- **Substituir SessionTypeManager** (linhas 1373-1387) por um `Select` que lista as sessions (`sessions` table) do fotógrafo, mostrando título + preço
- Buscar sessions via query: `supabase.from("sessions").select("id, title, price, tax_rate, deposit_enabled, deposit_amount, deposit_type, duration_minutes").eq("photographer_id", photographerId)`
- Ao selecionar nova session:
  1. Buscar `booking_invoice_items` do booking atual
  2. Se houver items → abrir `AddonReviewModal` com a lista
  3. Se não houver → aplicar troca diretamente
- Após confirmação do modal:
  - Atualizar `bookings.session_id` para a nova session
  - Atualizar `bookings.extras_total` com soma dos invoice items restantes
  - Recalcular e persistir os invoice items editados/removidos
  - Atualizar `session_availability.session_id`
  - Atualizar `client_projects.session_type` com o nome do session_type da nova session
- Manter label "Session" (não "Session Type") no painel direito (linha 1500-1508)
- No painel direito, mostrar o título da session atual (do booking) em vez do session_type

**2. Criar `src/components/dashboard/AddonReviewModal.tsx`** (novo)

- Dialog modal com lista dos addons (booking_invoice_items) existentes
- Cada item mostra: description, quantity, unit_price (formatado em currency)
- Ações por item: editar (quantity/price inline), remover (botão trash)
- Resumo financeiro na parte inferior:
  - Session price (nova) em centavos / 100
  - Extras total (soma dos items restantes)
  - Tax (session.tax_rate aplicado sobre session price + extras)
  - Deposit (se session.deposit_enabled: valor ou percentual)
  - Balance = total - deposit (se deposit já pago)
- Botões: Cancel (volta sem mudar) / Confirm (aplica a troca)

**3. `src/lib/i18n/translations.ts`**

Adicionar chaves nos 3 idiomas:
- `sessionLabel` / `changeSession` / `addonReviewTitle` / `addonReviewDesc` / `addonKeep` / `addonRemove` / `newSessionPrice` / `extrasTotal` / `taxAmount` / `depositAmount` / `balanceDue` / `confirmSessionChange` / `noAddonsToReview`

### Fluxo detalhado

```text
User selects new session
       │
       ▼
Fetch booking_invoice_items for booking_id
       │
  Has items? ──No──► Update session directly
       │                (bookings.session_id, session_availability.session_id,
       Yes               client_projects.session_type, recalc financials)
       │
       ▼
Open AddonReviewModal
  - Show each item with edit/remove
  - Show financial summary live
       │
       ▼
User confirms ──► Apply changes:
  1. Delete removed items from booking_invoice_items
  2. Update edited items (qty/price)
  3. Update bookings.session_id + extras_total
  4. Update session_availability.session_id
  5. Update client_projects.session_type
  6. Invalidate react-query caches
```

### Regras financeiras
- **Session price**: `newSession.price` (stored in cents)
- **Extras total**: soma de `quantity * unit_price` dos items restantes
- **Tax**: `(sessionPrice + extrasTotal) * newSession.tax_rate / 100`
- **Deposit**: se `newSession.deposit_enabled`, calcular conforme `deposit_type` ("fixed" → `deposit_amount`, "percentage" → `total * deposit_amount / 100`)
- **Balance**: `total + tax - depositPaid` (deposit já pago permanece inalterado)
- Items que permanecem são apenas do booking, sem vínculo com a nova session

