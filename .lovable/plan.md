
Objetivo: corrigir o push nativo do navegador/Windows para que ele apareça fora do app, sem perder o sininho e mantendo o pedido de permissão no login e no Settings.

O que eu confirmei
- O sininho está funcionando: há registros novos na tabela `notifications`.
- As subscriptions também estão sendo salvas: existem endpoints recentes do Firefox (`updates.push.services.mozilla.com`) e do Chrome/Edge (`fcm.googleapis.com`).
- O problema real está no envio do push nativo:
  - os logs da função `send-push` mostram vários `401 Unauthorized - VAPID public key mismatch` para endpoints do Firefox;
  - a função atual usa uma implementação manual antiga de Web Push (`Content-Encoding: aesgcm`, cabeçalhos montados na mão), o que é frágil/incompatível com navegadores atuais;
  - além disso, há muitas subscriptions antigas no banco, então mesmo quando uma subscription nova existe, o envio continua tentando várias inválidas.

Do I know what the issue is?
Sim. O problema não é mais permissão, nem login, nem o sininho. O problema está na entrega do push nativo: a função `supabase/functions/send-push/index.ts` usa um formato antigo/manual de Web Push e o banco acumula subscriptions antigas com chaves VAPID diferentes, causando falhas de entrega no Firefox e comportamento inconsistente em Chrome/Edge.

Plano de implementação

1. Reescrever o envio nativo de push
- Substituir a lógica criptográfica manual em `supabase/functions/send-push/index.ts` por uma implementação moderna e compatível com os navegadores atuais.
- Usar o fluxo padrão de Web Push com suporte correto a VAPID e payloads para Firefox/Chrome/Edge.
- Preservar o mesmo contrato da função (`photographer_id`, `title`, `body`, `url`) para não quebrar o frontend.

2. Limpar subscriptions antigas/inválidas automaticamente
- No envio, remover subscriptions expiradas, inválidas ou com erro de autenticação/VAPID mismatch.
- No re-registro do cliente, evitar acúmulo desnecessário de endpoints antigos para o mesmo fotógrafo.
- Priorizar sempre a subscription mais recente criada após login/Settings.

3. Fortalecer o fluxo de inscrição no cliente
- Ajustar `src/lib/notifications-api.ts` para:
  - aguardar o service worker estar pronto;
  - re-inscrever de forma confiável;
  - retornar resultado mais explícito de sucesso/falha;
  - opcionalmente remover endpoints antigos do mesmo dispositivo quando uma nova subscription for criada.
- Manter a solicitação no login (`src/pages/Login.tsx`) e também a ativação no Settings.

4. Melhorar o teste de push no Settings
- Em `src/pages/dashboard/Settings.tsx`, mostrar o resultado real retornado por `send-push`:
  - quantas subscriptions receberam;
  - quantas falharam;
  - se houve limpeza de subscriptions antigas.
- Assim o teste deixa de dizer apenas “enviado” e passa a informar se o push nativo foi realmente entregue.

5. Revisar os pontos que pedem permissão
- Validar os três gatilhos já existentes:
  - login;
  - card de push no Settings;
  - prompts automáticos/banner no dashboard.
- Garantir que nenhum deles “mascare” falha de subscription silenciosamente.

Arquivos principais
- `supabase/functions/send-push/index.ts`
- `src/lib/notifications-api.ts`
- `src/pages/dashboard/Settings.tsx`
- `src/pages/Login.tsx`
- possivelmente `src/components/dashboard/NotificationBell.tsx` apenas para feedback/estado

Impacto esperado
- O sininho continua funcionando.
- O teste de push volta a acionar o toast nativo do Windows.
- Firefox deixa de falhar com `VAPID public key mismatch`.
- Chrome/Edge passam a usar a subscription atual correta, sem depender de endpoints velhos no banco.

Detalhes técnicos
- Hoje a evidência mais forte é o log:
  - `401 Unauthorized`
  - `message: "VAPID public key mismatch"`
- Isso indica incompatibilidade entre a subscription armazenada e a autenticação usada no envio, agravada pela implementação manual antiga.
- Como o app é multi-idiomas, qualquer novo feedback textual no Settings será adicionado em PT/EN/ES.
- Não devo mexer no sininho como mecanismo principal da correção; ele já prova que a camada in-app está saudável.
