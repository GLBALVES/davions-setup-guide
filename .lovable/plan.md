
## Análise: O que mover de STORE → WEBSITE

### Diagnóstico do problema

A aba **STORE** está sobrecarregada: mistura **configuração de acesso/URL** (slug, domínio) com **design editorial do site** (hero, branding, SEO, analytics, templates). São responsabilidades muito distintas numa única aba, tornando-a extremamente longa e confusa.

O nome "Store" também é enganoso para o que está lá — a maioria do conteúdo se refere ao **site público do fotógrafo**, não à loja de sessões.

---

### Proposta: Separar em duas abas distintas

```text
ANTES (4 abas):        DEPOIS (5 abas):
┌─────────────┐        ┌─────────────┐
│   STUDIO    │        │   STUDIO    │   (sem mudança)
│   BUSINESS  │        │   BUSINESS  │   (sem mudança)
│   STORE     │ ──┬──► │   WEBSITE   │   (novo — conteúdo visual)
│   GALLERIES │   └──► │   STORE     │   (enxuto — só URL/domínio)
└─────────────┘        │   GALLERIES │   (sem mudança)
                       └─────────────┘
```

---

### Aba WEBSITE (nova) — conteúdo transferido do STORE

Tudo que diz respeito à aparência e ao conteúdo editorial do site público:

| Seção | Justificativa |
|---|---|
| Branding (Logo, Tagline, Brand Color) | Identidade visual — não é configuração de "loja" |
| Hero Section (Cover image, Headline, Subheadline, CTA) | Conteúdo editorial da homepage |
| About Section (Nome, Bio, Foto) | Apresentação pessoal — pertence ao "website" |
| Social Media (7 redes) | Links exibidos no site — não são config de loja |
| Navigation (toggles de seções visíveis) | Controla o menu do site, não da loja |
| Site Template (Editorial/Grid/Magazine/Clean) | Layout visual do site |
| SEO (Title, Meta Description, OG Image) | Otimização do site para buscadores |
| Analytics (GA, FB Pixel) | Rastreamento do site |
| Footer | Rodapé do site |

---

### Aba STORE (fica, reduzida) — apenas o que é de fato "loja"

| Seção | Justificativa |
|---|---|
| Store URL (slug) | Endereço da loja pública de sessões |
| Custom Domain | Domínio personalizado da loja |

Apenas isso. A aba STORE passa de ~10 seções para 2 seções, tornando-se objetiva e rápida de usar.

---

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/pages/dashboard/Personalize.tsx` | Adicionar tab `website`, mover JSX e state relevante, manter `store` enxuto |

Nenhuma mudança de banco de dados é necessária — os dados já estão nas tabelas `photographers` e `photographer_site` corretamente. É uma reorganização puramente de UI.

---

### Ordem de implementação

1. Adicionar `{ value: "website", label: "Website" }` na lista de tabs, entre BUSINESS e STORE
2. Criar `<TabsContent value="website">` com as 9 seções movidas
3. Reduzir `<TabsContent value="store">` para conter apenas Store URL + Custom Domain
4. O botão "Save site settings" fica na aba WEBSITE; o "Save URL & domain" fica na aba STORE (já separados por `handleSaveSite` e `handleSaveStore`, então nenhuma lógica muda)
