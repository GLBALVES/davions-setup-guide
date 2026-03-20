
## Análise: O que o Pixieset faz que nosso site não faz

**palomaschell.com tem:**
- Hero com slideshow de múltiplas fotos
- Seção de frase/citação inspiracional entre hero e sessões
- Cada sessão tem uma **página de produto completa** com texto de vendas, galeria de exemplos e CTA "Learn More" antes do booking
- Sessões na home aparecem como **blocos full-width** (imagem + texto sobreposto), não como cards pequenos
- Seção "About the experience" com mais profundidade
- Testemunhos de clientes

**O que vamos implementar:**

---

## Plano

### 1. Adicionar campos de conteúdo à tabela `photographer_site`

Novos campos:
- `hero_images` (text[] / JSONB) — múltiplas imagens para slideshow
- `quote_text` / `quote_author` — citação/frase que aparece entre hero e sessões
- `about_long_text` — texto rico da seção sobre (além da bio)
- `experience_title` / `experience_text` — seção "A experiência" após sessões

### 2. Adicionar campo `tagline` nas sessions

Coluna `tagline` (text, nullable) na tabela `sessions` — frase curta de venda que aparece no card da home.

### 3. Novo visual das sessões na home (template Editorial)

Mudar de grid de cards para **blocos empilhados full-width** com apelo de venda:

```text
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Imagem full-width 50vh]    Newborn Session         │
│                              ────────────────────    │
│                              Tagline/frase de venda  │
│                              200min · 30 fotos       │
│                              A partir de R$1.200     │
│                                                      │
│                              [ Ver detalhes → ]      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Layout alternado (imagem esquerda/direita) para pares de sessões.

### 4. Nova rota: Página de produto da sessão (antes do booking)

Rota: `/store/:slug/sessions/:sessionSlug` (ou `/book/:id` em domínio custom)

A `SessionDetailPage` hoje vai direto para o booking. Vamos criar uma **página de produto** separada `SessionProductPage` que exibe:
- Hero full-bleed com imagem da sessão
- Título, tagline, descrição longa
- Detalhes: duração, nº fotos, localização
- Seção "O que está incluído" (description como lista)
- Preço em destaque + botão **"Reservar agora →"** que leva para o booking atual
- Galeria de fotos de exemplo (usando fotos de galeria publicada vinculada)

### 5. Seção de citação/frase

Entre o hero e as sessões — campo `quote_text` configurável no dashboard:

```text
" Preservar os momentos mais preciosos da sua família "
— Nome do fotógrafo
```

### 6. Seção "A Experiência" (opcional)

Após as sessões, antes do About — texto descritivo sobre o processo do fotógrafo.

### 7. Dashboard: adicionar campos de texto

Em `WebsiteSettings.tsx`, adicionar nas seções existentes:
- Campo **Quote/Frase** (na seção Hero ou nova seção)
- Campo **Tagline da sessão** (no editor de sessão `SessionForm.tsx`)
- Campo **Experiência** (nova seção na página de configurações)

---

## Arquivos a alterar

1. **Migration SQL** — adicionar `quote_text`, `quote_author`, `experience_title`, `experience_text` à tabela `photographer_site`; adicionar `tagline` à tabela `sessions`
2. **`src/components/store/PublicSiteRenderer.tsx`** — refatorar template Editorial com:
   - Seção quote
   - Sessões em layout de blocos alternados full-width com tagline
   - Seção experiência
3. **`src/pages/store/SessionDetailPage.tsx`** — dividir em dois:
   - Manter booking no mesmo arquivo mas adicionar uma etapa inicial "product" mostrando página de produto antes do step de slots
4. **`src/pages/dashboard/WebsiteSettings.tsx`** — adicionar campos quote + experiência
5. **`src/pages/dashboard/SessionForm.tsx`** — adicionar campo tagline na sessão
6. **`src/pages/store/StorePage.tsx`** — atualizar select para buscar novos campos
7. **`src/pages/store/CustomDomainStore.tsx`** — idem

### Nota sobre SessionDetailPage

Em vez de criar uma rota nova, adicionamos um `step === "product"` no início do fluxo. O cliente vê a página de produto primeiro, e um botão "Reservar agora" avança para `step === "slots"`. Isso é não-invasivo e reusa a rota atual.
