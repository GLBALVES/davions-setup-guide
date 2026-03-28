

## Plano: Solicitar push após primeiro login/signup

### Abordagem
Criar um hook `useFirstLoginPushPrompt` que detecta a **primeira vez** que o usuário autentica neste dispositivo e solicita permissão de push automaticamente. Usa `localStorage` para não repetir.

### Arquivos

**1. `src/hooks/useFirstLoginPushPrompt.ts`** (novo)
- Observa `photographerId` do AuthContext (transição de `null` → valor = login concluído)
- Verifica `localStorage("push-first-login-prompted")` para executar apenas uma vez por dispositivo
- Verifica `Notification.permission === "default"` (só pede se nunca perguntou)
- Aguarda ~2s após login (não interromper o carregamento inicial)
- Chama `Notification.requestPermission()` → se granted, chama `subscribeToPush(photographerId)`
- Salva flag no localStorage independente do resultado

**2. `src/pages/Dashboard.tsx`**
- Importar e chamar `useFirstLoginPushPrompt()` no componente Dashboard (executa silenciosamente)

### Lógica resumida
```typescript
useEffect(() => {
  if (!photographerId) return;
  if (localStorage.getItem("push-first-login-prompted")) return;
  if (Notification.permission !== "default") return;

  const timer = setTimeout(async () => {
    localStorage.setItem("push-first-login-prompted", "1");
    const perm = await Notification.requestPermission();
    if (perm === "granted") await subscribeToPush(photographerId);
  }, 2000);

  return () => clearTimeout(timer);
}, [photographerId]);
```

### Comportamento
- Executa apenas 1 vez por dispositivo (localStorage flag separada do banner)
- Delay de 2s para não competir com o carregamento da página
- Se o usuário negar, o banner do dashboard NÃO aparece (permission já não é "default")
- Se o usuário aceitar, a subscription é registrada automaticamente

