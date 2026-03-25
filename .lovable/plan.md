
## Análise: CleanFlow vs Davions — Templates de Site

### O que o CleanFlow tem (referência)
- **Página de Templates**: Grid de cards (2 colunas) com imagem de preview, nome, descrição, badge "Current", botões "Preview" e "Apply/Edit Site"
- **Preview via iframe**: Modal fullscreen que abre `/site/:slug?preview=:templateId` em iframe
- **Seleção limpa**: Sem editor split-screen — o usuário escolhe o template e clica "Edit Site" → abre o site público em nova aba com inline editing
- **Dados vêm de tabela**: `site_templates` no banco com campos `id, name, description, is_active`
- **Templates são renders completos**: Cada template é uma pasta de componentes completos (`CrystalHero`, `LuxeHero`, etc.) com CSS próprio

### O que Davions tem hoje
- Editor split-screen complexo com sidebar de blocos/seções/páginas
- Templates simples: `editorial`, `grid`, `magazine`, `clean` — apenas variações de layout do mesmo `PublicSiteRenderer`
- Seleção de template via dropdown no cabeçalho do editor
- Sem cards visuais, sem preview modal, sem imagens de thumbnail

### O que precisamos mudar

#### 1. Página `/dashboard/website` — nova aba "Templates"
Transformar a página atual `WebsiteEditor.tsx` para ter duas abas:
- **Site Template**: Grid de cards igual ao CleanFlow (imagem de thumbnail, nome, descrição, badge "Current", botões "Preview" e "Apply")
- **Editor**: O editor split-screen atual (que permanece intacto)

#### 2. `TemplatePreviewModal`
Criar componente `src/components/website-editor/TemplatePreviewModal.tsx` igual ao CleanFlow:
- Dialog 95vw × 90vh
- Barra superior com botão "Edit Site" (abre `/store/:slug?preview=:templateId` em nova aba) e botão fechar
- iframe ocupando o restante

#### 3. Thumbnails dos templates
Mapear thumbnails para os 4 templates existentes com imagens Unsplash de fotografia:
- `editorial`: foto editorial/portrait
- `grid`: grade/galeria foto
- `magazine`: revista/fashion
- `clean`: minimal/clean

#### 4. Suporte a `?preview=:template` no StorePage/PublicSiteRenderer
O parâmetro `preview` na URL deve sobrepor temporariamente o `site_template` para renderizar o template escolhido sem salvar.

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/pages/dashboard/WebsiteEditor.tsx` | Adicionar aba "Site Template" com grid de cards antes do editor |
| `src/components/website-editor/TemplatePreviewModal.tsx` | Criar — dialog com iframe |
| `src/pages/store/StorePage.tsx` | Ler `?preview=` da URL e passar ao renderer |
| `src/components/store/PublicSiteRenderer.tsx` | Aceitar `previewTemplate` prop para override temporário |

### Estrutura do novo WebsiteEditor

```text
/dashboard/website
├── Header: "Editor do Website" + botões "Visualizar Site" / "Site Publicado"
├── Tabs: [Site Template] [Editor]
│
├── Tab "Site Template"
│   └── Grid 2 colunas
│       ├── Card: Editorial — imagem + badge "Current" + Preview + Edit Site
│       ├── Card: Grid — imagem + Preview + Apply
│       ├── Card: Magazine — imagem + Preview + Apply
│       └── Card: Clean — imagem + Preview + Apply
│
└── Tab "Editor"
    └── Editor split-screen existente (sem alterações)
```

### Fluxo de Preview
1. Usuário clica "Preview" no card do template
2. Abre `TemplatePreviewModal` com iframe apontando para `/store/:slug?preview=editorial`
3. StorePage lê o param `preview`, passa como `site_template` override ao PublicSiteRenderer
4. Botão "Edit Site" no modal abre `/store/:slug?edit=true` em nova aba e fecha o modal

### Mudanças técnicas mínimas
- `StorePage.tsx`: extrair `const previewTemplate = searchParams.get('preview')` e passar para o renderer
- `PublicSiteRenderer.tsx`: aceitar prop opcional `previewTemplate?: string` que tem precedência sobre `siteConfig.site_template`
- Nenhuma mudança de banco de dados necessária
