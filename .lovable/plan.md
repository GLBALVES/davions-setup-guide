

## Plano: Banner de ativação de Push Notifications no Dashboard

### O que será feito
Um banner discreto aparecerá no Dashboard (entre o onboarding checklist e os KPIs) incentivando o usuário a ativar notificações push. O banner só aparece quando `Notification.permission === "default"` (nunca perguntado). Ao clicar, dispara `Notification.requestPermission()` e inscreve o dispositivo. O banner pode ser dispensado e fica oculto via `localStorage`.

### Arquivos modificados

**1. `src/components/dashboard/PushBanner.tsx`** (novo)
- Componente auto-contido que verifica `Notification.permission`
- Verifica `localStorage("push-banner-dismissed")` para não mostrar novamente
- Botão "Enable" chama `requestPermission()` → `subscribeToPush()`
- Botão "×" fecha e salva dismissal no localStorage
- Estilo: borda sutil, ícone Bell, texto curto, alinhado ao design system (luxury minimal)
- Textos em 3 idiomas via `useLanguage()`

**2. `src/lib/i18n/translations.ts`**
- Adicionar chaves `pushBanner.title`, `pushBanner.description`, `pushBanner.enable`, nos 3 idiomas

**3. `src/pages/Dashboard.tsx`**
- Importar e renderizar `<PushBanner />` logo após `<OnboardingChecklist />`

### Comportamento
- Visível apenas quando permissão = "default" e não dispensado
- Desaparece automaticamente após ativar ou dispensar
- Não aparece em navegadores sem suporte a Notification API

