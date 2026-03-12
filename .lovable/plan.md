
## Problema raiz

O fluxo atual usa **Stripe Connect Standard via OAuth** — ele redireciona o fotógrafo para `connect.stripe.com`, onde aparece o logo e a marca Stripe de forma explícita. Não há como remover isso no fluxo OAuth padrão.

---

## Solução: Stripe Connect Custom + Embedded Onboarding

A única forma de manter tudo dentro da sua plataforma é mudar para **Stripe Connect Custom accounts** com os **Stripe Connect Embedded Components**. O onboarding acontece dentro de um iframe embutido na sua própria página — o fotógrafo nunca sai do domínio da plataforma.

**Fluxo novo:**
```
1. Fotógrafo clica "Activate payment"
   ↓
2. Backend cria uma conta Custom no Stripe (invisível)
   ↓
3. Backend cria um Account Session token
   ↓
4. Frontend renderiza o formulário de onboarding EMBUTIDO
   (dentro da sua página, no seu domínio)
   ↓
5. Fotógrafo preenche dados bancários/identidade inline
   ↓
6. Conta ativada — tudo dentro da plataforma
```

> **Nota importante**: Os componentes embutidos do Stripe exibem um pequeno badge "Powered by Stripe" no rodapé do formulário. Isso é obrigatório pelos termos do Stripe e não pode ser removido. Mas o fotógrafo nunca sai da sua página nem vê a URL `stripe.com`.

---

## O que muda

**2 novas Edge Functions:**

| Função | O que faz |
|---|---|
| `create-stripe-connect-account` | Cria uma conta Custom no Stripe para o fotógrafo + retorna o `account_id` |
| `create-stripe-account-session` | Gera um `client_secret` temporário para o componente embutido renderizar |

**Pacotes frontend a instalar:**
- `@stripe/connect-js` — SDK do Stripe para componentes embutidos
- `@stripe/react-connect-js` — Wrapper React para os componentes

**`src/pages/dashboard/Settings.tsx`:**
- Remover o redirect OAuth (`handleConnectStripe` → `window.location.href`)
- Substituir o botão "Activate payment" por um componente `<ConnectAccountOnboarding />` embutido
- Adicionar handler `onExit` para capturar quando o fotógrafo conclui o onboarding

**Edge functions existentes (`stripe-connect-url`, `stripe-connect-callback`):**
- Não removidas (ficam obsoletas mas não causam problema)
- O `stripe-connect-disconnect` continua sendo usado para desativar

---

## Arquivos a criar/editar

```
CREATE  supabase/functions/create-stripe-connect-account/index.ts
CREATE  supabase/functions/create-stripe-account-session/index.ts
EDIT    src/pages/dashboard/Settings.tsx   (substituir fluxo OAuth por embedded)
```

**Package.json:** instalar `@stripe/connect-js` e `@stripe/react-connect-js`
