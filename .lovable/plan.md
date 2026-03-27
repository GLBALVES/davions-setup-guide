

## Plano: Web Push Notifications Completo

### O que existe hoje
- Sino de notificações in-app com Realtime (funciona)
- `new Notification()` direta — só funciona com aba aberta
- **Não existe**: Service Worker, VAPID keys, tabela `push_subscriptions`, Edge Function `send-push`

### O que será implementado

**1. Gerar VAPID Keys automaticamente no backend**
- Nova Edge Function `generate-vapid-keys` que gera o par de chaves usando a Web Crypto API (curva P-256)
- Salva a chave privada na tabela `app_settings` (nova) e retorna a pública
- Alternativa mais simples: gerar as chaves via script e armazenar como secrets (`VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`)

**2. Service Worker (`public/sw.js`)**
- Escuta evento `push` → exibe notificação nativa do SO
- Escuta `notificationclick` → abre/foca o dashboard
- Funciona mesmo com aba fechada (desde que o browser esteja aberto)

**3. Tabela `push_subscriptions`**
- Colunas: `id`, `photographer_id`, `endpoint`, `p256dh`, `auth`, `created_at`
- RLS: fotógrafo pode CRUD nas próprias subscriptions
- Unique constraint em `(photographer_id, endpoint)` para evitar duplicatas

**4. Registro no cliente**
- Em `src/main.tsx`: registrar o Service Worker
- Em `NotificationBell.tsx`: ao conceder permissão, chamar `pushManager.subscribe()` com a VAPID public key e salvar a subscription no banco
- Nova função `savePushSubscription()` em `notifications-api.ts`

**5. Edge Function `send-push`**
- Recebe `photographer_id`, `title`, `body`, `url`
- Busca todas as subscriptions do fotógrafo
- Envia via protocolo Web Push (RFC 8291) usando `web-push` para Deno
- Remove subscriptions expiradas (status 410)

**6. Integração nos eventos**
- No `session-booking-webhook`, após inserir na tabela `notifications`, invocar `send-push` via fetch interno
- Mesma lógica para futuros triggers (chat, bug reports)

### Sobre as VAPID Keys
As VAPID keys são credenciais que identificam o servidor que envia push notifications. Vou gerá-las automaticamente via script e armazená-las como secrets no backend — **você não precisa configurar nada manualmente**.

### Arquivos criados/editados

| Ação | Arquivo |
|------|---------|
| Criar | `public/sw.js` |
| Criar | `supabase/functions/send-push/index.ts` |
| Criar | Migration: tabela `push_subscriptions` |
| Editar | `src/main.tsx` (registrar SW) |
| Editar | `src/lib/notifications-api.ts` (savePushSubscription) |
| Editar | `src/components/dashboard/NotificationBell.tsx` (subscribe ao push) |
| Editar | `supabase/functions/session-booking-webhook/index.ts` (chamar send-push) |
| Secrets | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (gerados automaticamente) |

