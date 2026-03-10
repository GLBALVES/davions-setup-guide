
## Dois problemas a corrigir

---

### Problema 1 — Ambos os itens de gallery ficam "ativos" no menu

**Causa:** Duplo sistema de active state conflitando:
1. `SidebarMenuButton` recebe `isActive={isActive(item.url)}` — prop booleana
2. O `NavLink` interno também aplica `activeClassName` via React Router

Quando a rota é `/dashboard/galleries/:id` (detalhe de uma galeria), `currentPath.startsWith("/dashboard/galleries")` é `true` para **os dois** itens. A checagem de query param falha porque `location.search` está vazia na rota de detalhe — `params.get("type")` retorna `null` para ambos, então `null !== "proof"` retorna `true`, quebrando a lógica (`return false` nunca é alcançado).

**Fix:** Corrigir `isActive` para retornar `false` quando há parâmetros esperados mas nenhum está presente na URL atual:

```ts
const isActive = (path: string) => {
  if (path === "/dashboard") return currentPath === "/dashboard";
  const [pathname, search] = path.split("?");
  // path exige query params mas a URL atual não tem nenhum → inativo
  if (search && !location.search) return false;
  if (!currentPath.startsWith(pathname)) return false;
  if (!search) return true;
  const params = new URLSearchParams(location.search);
  const expected = new URLSearchParams(search);
  for (const [key, val] of expected.entries()) {
    if (params.get(key) !== val) return false;
  }
  return true;
};
```

Também remover o `activeClassName` do `NavLink` interno para evitar conflito com o `isActive` do `SidebarMenuButton`.

---

### Problema 2 — Slug editável na URL pública da galeria

A URL pública já usa `slug` quando disponível, mas o fotógrafo não consegue definir/editar o slug pela interface — sempre cai no UUID como fallback.

**Fix:** Adicionar campo de slug editável na seção **Client Access** do `GalleryDetail.tsx`, logo acima do Share Link:

```
┌─────────────────────────────────────────────┐
│  CLIENT ACCESS                               │
│                                              │
│  Gallery URL (Slug)                          │
│  ┌──────────────────────────────┐ [Save]     │
│  │ meu-casamento-2025           │            │
│  └──────────────────────────────┘            │
│  gallery.davions.io/gallery/meu-casamento-2025│
│                                              │
│  Share Link                                  │
│  [https://…/gallery/meu-casamento-2025] [Copy]│
└─────────────────────────────────────────────┘
```

- Campo com o slug atual pré-preenchido
- Auto-geração de slug a partir do título (lowercase, sem acentos, hífens)
- Salva no Supabase ao clicar em Save
- Validação: apenas letras minúsculas, números e hífens
- Feedback visual de sucesso/erro (slug já em uso)

---

### Arquivos a editar

1. `src/components/dashboard/DashboardSidebar.tsx` — corrigir `isActive`
2. `src/pages/dashboard/GalleryDetail.tsx` — adicionar campo de slug editável no Client Access
