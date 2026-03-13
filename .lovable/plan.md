
## Área de Download do Plugin Lightroom

### Contexto
A sidebar tem um grupo **Settings** com `My Profile`, `Billing` e `Access Control`. A página `CustomDomainDocs` serve como referência de padrão visual para páginas de documentação — usa layout com seções, cards bordados, tabelas e FAQ. O plugin já é mencionado no site público (`Index.tsx`) como feature principal.

### Abordagem
Criar uma **nova página** `/dashboard/lightroom-plugin` com o mesmo padrão visual de `CustomDomainDocs` — docs + instruções de instalação + botão de download do `.lrplugin`. Adicionar entrada na sidebar no grupo **Settings**.

### O que construir

**1. Nova página: `src/pages/dashboard/LightroomPlugin.tsx`**
Página de documentação estilo `CustomDomainDocs` com:
- Header: breadcrumb `Settings > Lightroom Plugin`
- **Seção Download**: card em destaque com botão "Download Plugin (.zip)" apontando para um arquivo hospedado (pode ser um link público ou gerado via Edge Function futuramente — por ora um link placeholder/GitHub release)
- **Seção Instalação (passos)**:
  1. Faça o download e descompacte o `.zip`
  2. No Lightroom Classic, vá em `File → Plug-in Manager`
  3. Clique em `Add` e selecione a pasta `davions.lrplugin`
  4. Na aba Publish Services, configure com seu API token
- **Seção API Token**: instrução para copiar o token do painel (token = `user.id` por ora, já que é o `photographer_id` usado no plugin)
- **Seção Como funciona**: explicação do fluxo Publish Service
- **FAQ**: perguntas comuns

**2. Sidebar: `src/components/dashboard/DashboardSidebar.tsx`**
Adicionar item `Lightroom Plugin` com ícone `SlidersHorizontal` no grupo **Settings**:
```ts
{ title: "Lightroom Plugin", icon: SlidersHorizontal, to: "/dashboard/lightroom-plugin" }
```

**3. Route: `src/App.tsx`**
```tsx
<Route path="/dashboard/lightroom-plugin" element={<ProtectedRoute><LightroomPlugin /></ProtectedRoute>} />
```

### Detalhes técnicos
- O botão de download vai apontar para o arquivo `.zip` do plugin. Como o arquivo real não está no repositório, o link será um placeholder comentado para fácil substituição quando o arquivo for hospedado (ex.: GitHub Releases, Supabase Storage).
- O API token mostrado será o `user.id` do Supabase Auth — é o mesmo `photographer_id` que o plugin usa para autenticar. Será exibido com botão de copiar igual ao padrão já usado em Settings.
- Padrão visual 100% consistente com `CustomDomainDocs`.
