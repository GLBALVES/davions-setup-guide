
## Custom Domain — Suporte a /gallery/:slug

### Contexto atual

No bloco `onCustomDomain` do `App.tsx`, só existem 3 rotas:
- `/` → `CustomDomainStore`
- `/book/:sessionSlug` → `CustomDomainSessionGateway`
- `*` → `CustomDomainStore` (catch-all)

A rota `/gallery/:slug` não existe no bloco custom domain, então qualquer URL como `meudominio.com/gallery/slug` cai no catch-all e renderiza a store raiz.

### O que precisa ser feito

**1. Criar `CustomDomainGalleryGateway`** (`src/pages/store/CustomDomainGalleryGateway.tsx`)

Segue o mesmo padrão do `CustomDomainSessionGateway`: resolve o `photographer_id` pelo hostname, verifica se a galeria com o `slug` pertence a esse fotógrafo, e delega para o `GalleryView` existente sem duplicar lógica.

```text
Fluxo:
  hostname → photographers.custom_domain → photographer_id
  params.slug + photographer_id → galleries (published) → encontrou?
    Sim → renderiza <GalleryView /> normalmente (usa useParams internamente)
    Não → página de erro branded (galeria não encontrada / não autorizada)
```

> `GalleryView` usa `useParams` para pegar o `:slug` — como a rota no custom domain mantém `/gallery/:slug`, funciona sem alteração.

**2. Adicionar rota no `App.tsx`**

```tsx
// Dentro do bloco onCustomDomain
<Route path="/gallery/:slug" element={<CustomDomainGalleryGateway />} />
```

A ordem importa: precisa vir **antes** do catch-all `<Route path="*" ...>`.

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/store/CustomDomainGalleryGateway.tsx` | Criar |
| `src/App.tsx` | Adicionar 1 rota + import |

### Por que não reusar GalleryView diretamente?

O `GalleryView` não valida se a galeria pertence ao fotógrafo do domínio — ele apenas busca pelo slug. O gateway adiciona essa checagem de segurança: o visitante não pode digitar `/gallery/slug-de-outro-fotografo` no domínio customizado e acessar dados de terceiros.

### Comportamento de erro

Se a galeria não existir ou pertencer a outro fotógrafo, exibe a mesma página de erro branded (fundo escuro, logo Davions, ícone, "Powered by Davions") — consistente com o erro de domínio não configurado.
