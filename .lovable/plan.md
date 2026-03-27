

## Plano: Implementação Completa Web Push

Nada do Web Push existe ainda — vou criar tudo do zero.

### 1. Secrets VAPID (primeiro passo obrigatório)
- Adicionar `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` como secrets do projeto
- Vou gerar os valores e pedir para você colá-los

### 2. Migration: tabela `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (photographer_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Políticas: fotógrafo CRUD nas próprias subscriptions
```

### 3. Service Worker (`public/sw.js`)
- Escuta `push` → exibe notificação nativa do SO
- Escuta `notificationclick` → abre/foca dashboard
- Funciona em background (aba fechada, browser aberto)

### 4. Registro no cliente
- `src/main.tsx`: registrar Service Worker
- `src/lib/notifications-api.ts`: nova função `subscribeToPush()` que faz `pushManager.subscribe()` e salva no banco
- `NotificationBell.tsx`: chamar `subscribeToPush()` ao conceder permissão

### 5. Edge Function `send-push`
- Recebe `photographer_id`, `title`, `body`, `url`
- Busca subscriptions do fotógrafo no banco
- Envia via Web Push protocol (RFC 8291) com VAPID auth
- Remove subscriptions expiradas (HTTP 410)

### 6. Integração nos eventos
- `session-booking-webhook`: após inserir notificação, chamar `send-push`
- Mesmo padrão para futuros triggers

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `public/sw.js` |
| Criar | `supabase/functions/send-push/index.ts` |
| Migration | tabela `push_subscriptions` |
| Editar | `src/main.tsx` |
| Editar | `src/lib/notifications-api.ts` |
| Editar | `src/components/dashboard/NotificationBell.tsx` |
| Editar | `supabase/functions/session-booking-webhook/index.ts` |
| Secrets | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

