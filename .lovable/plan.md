# Vincular contrato assinado ao projeto após confirmação

## Objetivo

Sempre que a sessão tiver contrato, garantir que após o pagamento confirmado o contrato fique:
- congelado (imutável) em `bookings`
- replicado em `client_projects` (acesso direto sem join)
- com metadados legais de assinatura (timestamp, IP, user-agent)

## 1. Banco de dados (migration)

**Tabela `bookings`** — adicionar:
- `contract_signed_at TIMESTAMPTZ`
- `contract_signed_ip TEXT`
- `contract_signed_user_agent TEXT`
- `contract_locked BOOLEAN NOT NULL DEFAULT false`

**Tabela `client_projects`** — adicionar:
- `signed_contract_html TEXT`
- `contract_signed_at TIMESTAMPTZ`
- `contract_signed_ip TEXT`
- `contract_signed_user_agent TEXT`

Sem alteração de RLS (herdam regras existentes filtradas por `photographer_id`).

## 2. Captura do aceite (BookingConfirm.tsx)

No `handleAcceptContract`, além de gravar `contract_html_snapshot`, capturar **IP e user-agent via edge function** (não confiáveis no client). Criar nova edge function `register-contract-acceptance`:

- Recebe `{ booking_id, contract_html, accepted: true }`
- Lê IP do header `x-forwarded-for` e UA de `user-agent`
- Faz UPDATE em `bookings`:
  - `contract_html_snapshot = contract_html` (apenas se `contract_locked = false`)
  - `contract_signed_ip`, `contract_signed_user_agent` (somente registra; `contract_signed_at` fica vazio até o pagamento confirmar)
- Retorna OK

A UI continua chamando essa função em vez do UPDATE direto. O snapshot pode ser sobrescrito enquanto `contract_locked = false` (caso o cliente recarregue e refaça).

## 3. Trava + cópia para projeto (após pagamento)

Em **`confirm-booking/index.ts`** e **`session-booking-webhook/index.ts`**, após marcar `status='confirmed'`:

```text
1. Buscar booking (contract_html_snapshot, contract_signed_ip, contract_signed_user_agent, session_id)
2. Buscar session.contract_text/contract_id — só prossegue se a sessão TEM contrato
3. UPDATE bookings SET contract_signed_at = now(), contract_locked = true WHERE id = booking_id
4. Buscar client_projects WHERE booking_id = booking_id
   - Se existir: UPDATE com signed_contract_html + signed_at + ip + ua
   - Se não existir ainda: ignorar (projeto é criado depois pelo fotógrafo; ver passo 4)
```

Idempotente: se `contract_locked` já for true, pular.

## 4. Criação tardia de projeto (Projects.tsx)

Quando o fotógrafo cria um `client_projects` a partir de um booking (linha 1549 de `Projects.tsx`), copiar também os campos de contrato do booking, se já estiverem assinados. Garante que projetos criados após o pagamento já nasçam com o contrato vinculado.

## 5. Leitura no ProjectDetailSheet

Atualizar a query `project-contract-snapshot`:
- Preferir `client_projects.signed_contract_html` se existir
- Fallback para `bookings.contract_html_snapshot` (compatibilidade com bookings antigos)
- Mostrar badge "Assinado em DD/MM/AAAA HH:mm" usando `contract_signed_at`
- Manter modo somente-leitura no Dialog

## 6. Edge functions afetadas

- **NEW** `supabase/functions/register-contract-acceptance/index.ts` — captura IP/UA e grava snapshot pré-pagamento
- **EDIT** `supabase/functions/confirm-booking/index.ts` — trava + copia para projeto
- **EDIT** `supabase/functions/session-booking-webhook/index.ts` — mesmo trecho de trava/cópia (caminho do webhook Stripe)

`config.toml`: adicionar bloco `verify_jwt = false` para `register-contract-acceptance` (chamada anônima do wizard público).

## 7. i18n

Adicionar em `LanguageContext` (PT/EN/ES):
- "Assinado em" / "Signed on" / "Firmado el"
- "Contrato assinado e travado" / "Signed & locked"

## 8. Memória

Atualizar `mem://features/contracts-management`:
- snapshot grava em bookings no aceite (sem signed_at)
- pagamento confirmado: trava (`contract_locked=true`), grava `signed_at` e replica HTML+metadados em `client_projects`
- ProjectDetailSheet lê de `client_projects` com fallback para `bookings`

## Detalhes técnicos

- Não criar trigger: a confirmação já passa por edge function; manter lógica explícita.
- Apenas sessões com `contract_text` (após resolver `contract_id`) entram no fluxo de cópia.
- `contract_locked=true` impede sobrescrita do snapshot; tentativas posteriores de re-aceite são ignoradas server-side.
- `client_projects` pode existir antes (criado manualmente) ou depois (criado quando fotógrafo abre o booking) — cobrir os dois caminhos (passos 3 e 4).
- Sem realtime; sem alteração no fluxo de Stripe.

## Arquivos afetados

- migration nova (4 colunas em bookings + 4 em client_projects)
- `supabase/functions/register-contract-acceptance/index.ts` (novo)
- `supabase/functions/confirm-booking/index.ts`
- `supabase/functions/session-booking-webhook/index.ts`
- `supabase/config.toml` (bloco da nova função)
- `src/pages/BookingConfirm.tsx` (chama edge function em vez de UPDATE direto)
- `src/pages/dashboard/Projects.tsx` (copia campos ao criar projeto a partir de booking)
- `src/components/dashboard/ProjectDetailSheet.tsx` (lê do projeto + badge de data)
- `src/contexts/LanguageContext.tsx` (i18n)
