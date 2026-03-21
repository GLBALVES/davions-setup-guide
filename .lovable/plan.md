
## Análise comparativa: Editor atual vs. Pixieset

### O que o Pixieset tem que nosso editor não tem

Olhando o screenshot do Pixieset e comparando com a implementação atual, identifiquei 6 diferenças críticas de UX:

**1. Hierarquia de navegação clara no painel esquerdo**
- Pixieset: painel tem abas fixas no topo (Pages icon, Styles icon, Settings icon, Analytics icon) — cada aba tem um propósito distinto
- Nosso editor: painel é uma lista plana de seções sem hierarquia. Não há separação entre "conteúdo das seções" e "estilos globais" (cores, fontes, logo)

**2. Preview clicável com hover highlights**
- Pixieset: passar o mouse sobre uma seção no canvas mostra um outline colorido + botão de ação flutuante (ex: "LAYOUT A" + engrenagem + ícones de copiar/apagar)
- Nosso editor: o canvas tem `pointer-events-none` — totalmente não interativo. O usuário só pode clicar no painel esquerdo

**3. Botão "+" entre seções para adicionar novos blocos**
- Pixieset: entre cada seção do site aparece um botão "+" centralizado com linha horizontal — permite inserir uma nova seção em qualquer posição
- Nosso editor: não existe esta funcionalidade

**4. Estrutura de páginas (site menu)**
- Pixieset: painel esquerdo mostra "SITE MENU" com árvore de páginas hierárquica (Home, The Experience > subpages, Investment > subpages, Blog, etc.)
- Nosso editor: sem conceito de páginas múltiplas (não vamos implementar isso agora — fora do escopo)

**5. Controles contextuais no canvas (LAYOUT A, Settings, Delete, Resize)**
- Pixieset: ao selecionar um bloco no canvas, aparece toolbar inline com opções de layout, duplicar, deletar e redimensionar
- Nosso editor: nenhum controle visual no canvas

**6. Topbar com identidade da marca do site**
- Pixieset: topbar esquerda mostra "Website ˅" como nome/domínio do site atual, com link para o site ao vivo
- Nosso editor: só tem "Exit Editor" — sem nome do site nem link direto para o site ao vivo

---

### Melhorias que vamos implementar (escopo realista)

**Prioridade Alta:**

A. **Preview clicável com hover outlines**
   - Remover `pointer-events-none` do canvas
   - Adicionar overlay invisível por seção com `data-block-key` attributes no `PublicSiteRenderer`
   - Ao hover: mostrar outline colorido (ring azul) e tooltip "Click to edit"
   - Ao click: ativa o bloco correspondente no painel esquerdo

B. **Botão "+" entre seções no canvas**
   - Não precisamos adicionar seções novas — mas o botão pode servir para ativar rapidamente a edição da seção abaixo dele
   - Alternativa mais simples: botão "+" no painel esquerdo abre um menu para mostrar seções ocultas

C. **Abas no painel esquerdo**
   - Aba 1: "Sections" (lista de blocos atual)
   - Aba 2: "Styles" (cores, fonte, logo — campos que hoje estão fragmentados no BlockPanel do Hero)
   - Aba 3: "Pages" placeholder (futuro)
   - Topbar mostra nome do site com link para o site ao vivo

**Prioridade Média:**

D. **Nome do site na topbar**
   - Substituir "Exit Editor" por "← [Nome do estúdio]" e adicionar ícone de link para abrir o site ao vivo
   - Separar botão "View Site" do botão "Publish"

E. **Painel "Styles" global**
   - Accent color, Logo upload, Tagline, Font family (no futuro) agrupados em uma aba dedicada
   - Limpa o BlockPanel do Hero que atualmente mistura conteúdo com configurações globais

---

### Arquivos a alterar

1. **`src/components/store/PublicSiteRenderer.tsx`**
   - Adicionar `data-block-key` em cada seção principal (hero div, sessions div, etc.)
   - Não há mudança visual — apenas atributos HTML adicionados

2. **`src/components/website-editor/LivePreview.tsx`**
   - Remover `pointer-events-none`
   - Adicionar event listener de click que lê `data-block-key` do elemento clicado e chama `onSelectBlock`
   - Adicionar hover highlight: ao mouseover em elementos com `data-block-key`, aplicar outline via CSS

3. **`src/components/website-editor/EditorSidebar.tsx`**
   - Adicionar abas: "Sections" | "Styles"
   - Nova aba "Styles" com campos de Accent Color, Logo, Tagline

4. **`src/pages/dashboard/WebsiteEditor.tsx`**
   - Topbar: substituir "Exit Editor" por nome do estúdio com link para ver o site
   - Adicionar botão "View Site" separado do "Publish"
   - Passar handlers de style para EditorSidebar

### O que NÃO vamos implementar (fora do escopo atual)
- Múltiplas páginas (The Experience, Investment, etc.) — requer schema novo
- Toolbar inline com LAYOUT A (requer refatoração grande do PublicSiteRenderer)
- Duplicar/deletar blocos inline no canvas
