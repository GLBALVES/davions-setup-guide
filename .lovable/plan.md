

## Personalizar Notificações Push com Payload Criptografado

### Problema atual
Os chamadores (confirm-booking, session-booking-webhook, CreateBookingDialog, Settings) já enviam `title`, `body` e `url` para a função `send-push`, mas ela **ignora esses dados** e faz um POST sem corpo (payloadless). O Service Worker então mostra sempre a mensagem genérica "You have a new notification".

### Solução
Implementar criptografia de payload Web Push (RFC 8291 / aes128gcm) na Edge Function, usando as chaves `p256dh` e `auth` já armazenadas em `push_subscriptions`.

### Arquivos alterados

**1. `supabase/functions/send-push/index.ts`**
- Buscar `p256dh` e `auth` além de `id, endpoint` na query
- Implementar função `encryptPayload(sub, payload)` usando:
  - ECDH key agreement (P-256) com a chave pública do cliente
  - HKDF para derivação de chave e nonce
  - AES-128-GCM para criptografia do conteúdo
- Enviar o payload criptografado no body do POST com headers `Content-Type: application/octet-stream` e `Content-Encoding: aes128gcm`
- O payload JSON contém: `{ title, body, url }`
- Fallback: se a criptografia falhar para uma subscription, enviar payloadless como antes

**2. `public/sw.js`**
- Já preparado para receber payload (`event.data.json()`) — nenhuma mudança necessária, apenas confirmar que o fallback continua funcionando

### Detalhes técnicos da criptografia

```text
Cliente (browser)          Servidor (send-push)
  p256dh ───────────────►  ECDH shared secret
  auth   ───────────────►  HKDF(IKM=shared, salt=auth) → content encryption key + nonce
                            AES-128-GCM(payload) → encrypted body
                            POST endpoint com Content-Encoding: aes128gcm
```

A implementação usará as APIs nativas do Deno (`crypto.subtle`) para ECDH, HKDF e AES-GCM, sem dependências externas.

### Resultado esperado
As notificações push mostrarão o título real (ex: "New Booking — João Silva") e o corpo personalizado (ex: "Mini Session confirmed. R$500.") em vez da mensagem genérica.

