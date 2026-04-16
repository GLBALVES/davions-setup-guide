

# Plano: Editor de Website Funcional (Estilo Pixieset)

## Problema Central

O editor tem **três desconexões críticas**:

1. **Preview é um iframe estático** — carrega `/store/:slug` uma vez e nunca atualiza quando blocos são editados na sidebar
2. **Sem edição inline** — não dá para clicar num bloco no preview e editar texto/imagens diretamente
3. **Sem sincronização bidirecional** — sidebar e preview são mundos separados

O resultado: você adiciona blocos, reordena, configura... e nada muda no preview ao lado.

## Solução: Preview Direto (sem iframe)

A mudança fundamental é **eliminar o iframe** e renderizar o preview diretamente dentro do componente `WebsiteEditor`, usando os mesmos dados do estado React da sidebar.

```text
┌─ Sidebar ─────────┐  ┌─ Preview (mesmo React tree) ──────┐
│  Pages / Blocks    │  │                                    │
│  [state: sections] │──│  SectionRenderer(sections)         │
│  add/move/delete   │  │  ← renderiza direto do state       │
│  block settings    │  │  ← mudanças refletem instantâneo   │
└────────────────────┘  └────────────────────────────────────┘
```

## Etapas

### 1. Substituir iframe por preview inline no WebsiteEditor
- Remover o `<iframe src="/store/...">` (linhas 1308-1328)
- No lugar, renderizar `<SectionRenderer sections={activePageSections} />` envolvido por SharedNav + SharedFooter
- Usar um container com `overflow-y-auto` e fundo branco para simular a página
- Os dados de `site`, `photographer`, etc. são carregados uma vez via query ao montar o editor

### 2. Atualização instantânea
- Como o `SectionRenderer` lê diretamente do state `sections` da página ativa, qualquer mudança (add, delete, reorder, edit props) reflete **imediatamente** no preview — zero delay
- Não precisa de `postMessage`, polling, nem reload

### 3. Edição inline de blocos no preview
- Ao clicar num bloco no preview, abrir o painel de configurações desse bloco na sidebar (BlockSettingsPanel)
- Cada bloco renderizado ganha um wrapper com hover outline + click handler que identifica o índice do bloco
- Similar ao `BlockWrapper` que já existe, mas agora no contexto do preview inline

### 4. Edição de propriedades dos blocos na sidebar
- O `BlockSettingsPanel` já existe mas só tem configurações genéricas (bg, padding, animation)
- Expandir para incluir campos específicos por tipo:
  - **Hero**: headline, subtitle, imagem de fundo, CTA text/link
  - **Text**: corpo de texto (textarea)
  - **Image+Text**: upload de imagem, título, corpo
  - **Gallery Grid**: seleção de imagens do storage, número de colunas
  - **Contact Form**: campos do formulário, email de destino
  - **CTA**: título, texto do botão, link
  - **FAQ**: lista de perguntas/respostas (add/remove)
  - **Stats**: lista de estatísticas (número + label)
  - **Testimonials**: lista de depoimentos
  - **Video**: URL do vídeo

### 5. Upload de imagens nos blocos
- Integrar com o storage existente (`site-assets` bucket ou similar)
- Nos campos de imagem do BlockSettingsPanel, adicionar botão de upload que salva no storage e retorna a URL pública
- Atualizar `section.props.image` / `section.props.backgroundImage` etc.

### 6. Responsividade do preview
- Adicionar botões de viewport na toolbar (Desktop / Tablet / Mobile)
- Aplicar `max-width` ao container do preview: `100%` / `768px` / `375px`

## Arquivos modificados

- **Editado**: `src/pages/dashboard/WebsiteEditor.tsx` — substituir iframe por preview inline, conectar estado
- **Editado**: `src/components/website-editor/BlockSettingsPanel.tsx` — expandir com campos específicos por tipo de bloco
- **Novo**: `src/components/website-editor/PreviewRenderer.tsx` — wrapper do preview com click handlers nos blocos
- **Editado**: `src/components/store/SectionRenderer.tsx` — adicionar suporte a `onClick` / wrapper mode para edição

## Resultado esperado

- Editar texto do Hero na sidebar → preview atualiza em tempo real
- Clicar num bloco no preview → abre configurações dele na sidebar
- Adicionar/remover/reordenar blocos → preview reflete instantaneamente
- Upload de imagem num bloco → aparece no preview imediatamente

