

## Auditoria Ponta-a-Ponta do Editor de Site

Vou rodar uma varredura sistemática do `/dashboard/website/editor` no preview real (logado), testando cada superfície e produzindo um **relatório consolidado** com bugs, severidade e arquivo responsável. Sem editar código nesta rodada — só diagnóstico.

### Escopo da auditoria

**1. Persistência (`updateSite`)**
- Testar se cada toggle/campo novo (show_blog, fontes, cores, header/footer bg) persiste após reload
- Confirmar suspeita do merge restrito em `WebsiteEditor.tsx`

**2. Blocos (Sections)**
- Selecionar, mover ↑↓, duplicar, excluir, inserir entre blocos
- Verificar se ordem persiste após reload
- Editar props no `BlockSettingsPanel` direito e confirmar render

**3. Edição inline**
- `EditableText` em cada tipo de bloco (Hero, Sobre, CTA, Footer)
- `EditableImage` (upload + URL externa)
- Validar que `onPropChange` grava no path correto

**4. Páginas & Navegação**
- Criar página, renomear, excluir, marcar como home
- Criar pasta (dropdown), link externo (com/sem nova aba)
- Reordenar páginas
- Aplicar template de página (`PageTemplatePickerModal`)

**5. Header por página (`PreviewHeader` + `headerConfig`)**
- Editar slides, logo, navegação
- Verificar se salva por página, não global

**6. Templates de site inteiro**
- Aplicar `SiteTemplatePickerModal` e checar se sobrescreve corretamente
- Testar reset

**7. Sub-painéis de Settings**
- SEO Manager (save + SERP preview)
- Blog (toggle já corrigido — revalidar)
- Social (links salvam)
- Tracking (GA, Pixel, head HTML)
- Advanced (CSS, body HTML, favicon, redirects)
- Form Submissions (lista carrega)
- Drafts (lista + restore)
- Trash (lista + restore + purge)

**8. Tipografia & Cores**
- Trocar heading/body font e accent color → confirmar aplicação live em todos os blocos

**9. Viewports (Desktop/Tablet/Mobile)**
- Confirmar que largura muda; documentar limitação se não simula media queries reais

**10. Console & Network**
- Capturar warnings (`forwardRef` do AdvancedModal/SettingsPanel já conhecido)
- Erros 4xx/5xx em saves
- Requisições duplicadas/N+1

### Entregável

Relatório em **tabela markdown** com colunas:
- **Área** • **O que testei** • **Resultado** • **Severidade** (🔴 quebrado / 🟡 parcial / 🟢 ok) • **Arquivo + linha suspeita** • **Correção sugerida**

Mais um **resumo executivo** no topo agrupando bugs por prioridade e estimando ordem de ataque.

### Ferramentas usadas
- `browser--navigate_to_sandbox`, `observe`, `act`, `screenshot`, `read_console_logs`, `list_network_requests` (preview real, logado)
- `code--view` para confirmar suspeitas no código
- `supabase--read_query` para validar persistência no DB quando necessário

### Pré-requisitos
- Você precisa estar **logado no preview** (https://id-preview--da311b7e-...lovable.app). Se eu cair em tela de login, paro e te aviso.
- Vou tocar apenas no **seu próprio site** (sem ações destrutivas em outras contas).
- Testes destrutivos (excluir página, esvaziar lixeira) eu **pulo** e marco como "não validado — destrutivo" a menos que você autorize.

### Fora de escopo
- Implementar correções nesta rodada (próximo passo, após você priorizar o relatório)
- Reescrever blocos ou adicionar novos tipos
- Mexer no site público (`/store/`)

### Próximo passo após aprovação
Você aprova → eu rodo a auditoria → entrego relatório → você marca prioridades → abro plano de correção por área.

