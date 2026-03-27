

## Próximos passos para Push Notifications no PC

### Situação atual
O código usa `new Notification(title, body)` diretamente — isso funciona apenas enquanto a aba do dashboard está aberta e ativa. Não há Service Worker nem Web Push API implementados.

### O que falta para push real no PC

**1. Gerar VAPID Keys (servidor)**
- Web Push exige um par de chaves VAPID (Voluntary Application Server Identification)
- Gerar com `web-push generate-vapid-keys` e salvar a chave privada como secret no backend e a pública no frontend

**2. Criar um Service Worker (`public/sw.js`)**
- Arquivo que roda em background no navegador, mesmo sem aba aberta
- Escuta eventos `push` e exibe a notificação nativa do sistema operacional
- Escuta `notificationclick` para abrir/focar o dashboard

**3. Registrar o Service Worker no app**
- Em `main.tsx` ou `App.tsx`, chamar `navigator.serviceWorker.register('/sw.js')`
- Após registro, usar `registration.pushManager.subscribe()` com a VAPID public key para obter um `PushSubscription`

**4. Salvar a subscription no banco**
- Nova tabela `push_subscriptions` com: `photographer_id`, `endpoint`, `p256dh`, `auth`, `created_at`
- Salvar a subscription do navegador para cada dispositivo/browser do fotógrafo

**5. Criar Edge Function `send-push`**
- Recebe `photographer_id` + `title` + `body`
- Busca todas as subscriptions ativas daquele fotógrafo
- Usa a lib `web-push` para enviar a notificação via protocolo Web Push
- Chamada pelo webhook de booking, chat, etc.

**6. Integrar nos eventos existentes**
- No `session-booking-webhook` e futuros triggers, após inserir na tabela `notifications`, chamar a Edge Function `send-push` para entregar no PC mesmo offline

### Mudanças técnicas

| Item | Arquivo/Recurso |
|------|-----------------|
| Service Worker | `public/sw.js` (novo) |
| Registro do SW | `src/main.tsx` ou `src/App.tsx` |
| Subscription no banco | Migration: tabela `push_subscriptions` |
| Salvar subscription | `src/lib/notifications-api.ts` |
| Edge Function envio | `supabase/functions/send-push/index.ts` (novo) |
| Secret VAPID | `VAPID_PUBLIC_KEY` (frontend) + `VAPID_PRIVATE_KEY` (secret) |
| Integração eventos | `session-booking-webhook` e outros triggers |

### Pré-requisito do usuário
- Fornecer/gerar as **VAPID keys** (posso gerar automaticamente via script)
- O site precisa estar publicado em **HTTPS** (já é o caso no Lovable)

