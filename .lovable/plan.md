
## Loading Screen Brandada por Fotógrafo — Custom Domain

### Problema atual

Os 3 gateways de domínio customizado mostram um spinner simples (`Loader2`) sobre fundo branco ou preto sem nenhuma identidade. O visitante não sabe se está no site certo enquanto os dados carregam.

### Estratégia

A tela de loading precisa aparecer imediatamente com a identidade do fotógrafo. O desafio: o `photographer` ainda não foi resolvido quando o loading começa. A solução é um **loading em dois estágios**:

```
Estágio 1 (imediato, sem dados):
  Fundo escuro + logo Davions pequeno + spinner
  → Visível enquanto o fetch está em andamento

Estágio 2 (assim que photographer resolver):
  Fundo escuro + hero_image_url do fotógrafo como background
  + nome/business_name em destaque + "Carregando sessões..."
  → Animação de fade suave entre os dois estágios
```

Como `CustomDomainStore` já busca `full_name`, `business_name` e `hero_image_url` na primeira query (antes de buscar as sessões), o estado 2 aparece assim que o fotógrafo é encontrado, ainda antes das sessões carregarem.

### Mudanças

**`src/pages/store/CustomDomainStore.tsx`**

- Dividir o loading em dois estados via uma flag interna: `photographerLoaded` (boolean)
- Quando `loading === true && !photographerLoaded`: mostrar Estágio 1 (logo Davions + spinner)
- Quando `loading === true && photographerLoaded`: mostrar Estágio 2 (hero do fotógrafo + nome + "...")
- Usar `opacity` + `transition` para o fade entre estágios

**`src/pages/store/CustomDomainGalleryGateway.tsx`** e **`src/pages/store/CustomDomainSessionGateway.tsx`**

- Buscar também `full_name`, `business_name`, `hero_image_url` junto com o `id`/`store_slug`
- Exibir o mesmo Estágio 2 assim que o fotógrafo resolve, enquanto valida galeria/sessão

### Visual da tela de loading completa (Estágio 2)

```
┌────────────────────────────────────────────┐
│  [hero_image_url como bg com overlay dark] │
│                                            │
│                                            │
│       Photography by                       │
│   NOME DO FOTÓGRAFO                        │
│       ────────                             │
│       · · ·  (dots animados)              │
│                                            │
│                                            │
│         Powered by Davions                 │
└────────────────────────────────────────────┘
```

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/store/CustomDomainStore.tsx` | Substituir loading state simples por loading em 2 estágios |
| `src/pages/store/CustomDomainGalleryGateway.tsx` | Adicionar fetch de photographer + loading brandado |
| `src/pages/store/CustomDomainSessionGateway.tsx` | Adicionar fetch de photographer + loading brandado |

### Sem novos componentes

O loading é implementado inline em cada gateway para manter a independência dos arquivos. O código é pequeno e repetido intencionalmente — esses 3 arquivos têm ciclos de vida diferentes.
