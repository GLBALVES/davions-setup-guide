
## Dois problemas identificados — correções cirúrgicas

### Problema 1 — Build falha com `@swc/core` native binding
O `vite.config.ts` importa `@vitejs/plugin-react-swc`, que requer um binding nativo compilado para a arquitetura do servidor. No ambiente de build da plataforma esse binding não está disponível, causando o erro `Failed to load native binding`.

**Correção**: trocar `@vitejs/plugin-react-swc` por `@vitejs/plugin-react` (versão Babel, sem bindings nativos) no `vite.config.ts` e no `package.json`.

---

### Problema 2 — davions.com mostra "Store not found"
`davions.com` não está na lista `APP_HOSTNAMES` de `src/lib/custom-domain.ts`. Então `isCustomDomain()` retorna `true` para ele, e o app carrega `CustomDomainStore` tentando encontrar um fotógrafo com `custom_domain = 'davions.com'` — que não existe.

**Correção**: adicionar `"davions.com"` e `"www.davions.com"` à lista `APP_HOSTNAMES`, para que o app reconheça o domínio principal e carregue o roteamento normal (Index/Login/etc.).

---

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `vite.config.ts` | Trocar import `plugin-react-swc` → `plugin-react` |
| `package.json` | Trocar dep `@vitejs/plugin-react-swc` → `@vitejs/plugin-react` |
| `src/lib/custom-domain.ts` | Adicionar `"davions.com"` e `"www.davions.com"` ao array `APP_HOSTNAMES` |
