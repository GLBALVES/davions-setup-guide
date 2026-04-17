

The user already approved the preview-isolation fix and it's implemented. They re-confirmed the questions answers, including **"Resetar o site inteiro deste fotógrafo (todas as páginas + config)"** as the desired scope. So the remaining work is the **destructive Reset Site action** that was deferred.

## Plano: Adicionar ação "Resetar Site" em /dashboard/website

### O que falta (preview já está isolado)

O fix de preview foi feito na resposta anterior — `TemplatePreviewModal` e `StorePage?clean=1` já ignoram dados antigos. Falta o **reset real e explícito** que o usuário pediu, separado do preview.

### Implementação

**1. Edge function `reset-site`** (destrutiva, exige auth)
- Deleta todas as `site_pages` do fotógrafo
- Reseta `photographer_site` para defaults (mantém `photographer_id`, limpa headlines/cores/fontes/logo/quote/about/social/SEO)
- Recria 1 página Home vazia com o template escolhido
- Retorna sucesso/erro

**2. Botão "Reset Site" em `WebsiteSettings.tsx`**
- Localizado numa zona de perigo no fim da página (separada do "Change Template")
- Texto: "Reset entire website" + descrição
- Estilo: `variant="outline"` com texto vermelho/destructive

**3. Modal de confirmação forte (AlertDialog)**
- Título: "Reset entire website?"
- Lista exata do que será apagado:
  - Todas as páginas (Home, About, Contact, etc.)
  - Headlines, subtítulos, sobre, citação, experiência
  - Logo, cores, fontes, links sociais
  - SEO e favicon
- **NÃO apaga**: sessões, galerias, clientes, agendamentos, blog
- Campo de confirmação: digitar `RESET` para habilitar o botão
- Botão final: "Reset website" (destructive)

**4. UX pós-reset**
- Toast de sucesso
- Reload da página de settings para refletir defaults
- Template atual mantido (só zera o conteúdo, não o template escolhido)

### Arquivos

- **Novo**: `supabase/functions/reset-site/index.ts`
- **Editar**: `src/pages/dashboard/WebsiteSettings.tsx` (botão + AlertDialog + handler)
- **i18n**: adicionar strings EN/PT/ES em `src/lib/i18n/translations.ts`

### Comportamento esperado

1. Usuário vai em `/dashboard/website`
2. Rola até "Danger zone" → clica "Reset entire website"
3. Modal aparece listando o que será apagado
4. Digita `RESET` → botão libera
5. Confirma → edge function apaga tudo → toast → página recarrega limpa
6. Próximo preview de template aparece naturalmente limpo (porque os dados realmente sumiram, não só foram ocultados)

