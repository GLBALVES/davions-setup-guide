
Objetivo: corrigir o preview de templates para não herdar configurações antigas e, se necessário, oferecer uma limpeza real do site.

Diagnóstico do problema
- O preview de template em `WebsiteSettings` está sendo renderizado com `siteData` atual do site (`logo_url`, `accent_color`, `site_headline`, `site_subheadline`, `about_title`, `quote_text`, `experience_title`, links sociais etc.).
- Em `TemplatePreviewModal`, esse `siteData` é passado para `PublicSiteRenderer`, então o template novo só troca `site_template`, mas continua usando branding/conteúdo antigo.
- Além disso, o site público em `/store/:slug?preview=...` também carrega `site_pages` reais e `photographer_site` real, então o preview “Open Full” também pode refletir páginas/seções antigas.

O que vou implementar
1. Corrigir o preview do template para ser isolado
- Em `TemplatePreviewModal`, montar um `siteData` sanitizado para preview:
  - manter apenas o mínimo necessário para renderizar o layout
  - sobrescrever campos antigos com `null`, `""` ou defaults visuais
  - não reutilizar headline, subheadline, quote, experience, about content, logo e links antigos no preview de template
- Resultado: o preview mostrará o template “limpo”, sem herdar configuração anterior.

2. Isolar também o “Open Full”
- Ajustar o fluxo de preview full para usar um modo de preview isolado, não os dados persistidos do site atual.
- Opções técnicas:
  - preferencial: passar um estado de preview explícito via query params simples / flag e sanitizar na página pública
  - alternativa: abrir o modal sempre inline e remover/limitar o “Open Full” até o preview público respeitar esse modo
- Resultado: modal e preview full ficam consistentes.

3. Impedir herança de páginas/seções antigas no preview
- Hoje `StorePage` sempre lê `site_pages` reais.
- Vou adicionar um modo “template preview” em que:
  - o template visual é exibido sem `site_pages` reais
  - nav/footer usam apenas placeholders/defaults
  - nenhuma página antiga aparece no menu durante a prévia
- Resultado: o template preview deixa de misturar estrutura antiga com template novo.

4. Adicionar ação de limpeza explícita no editor/site settings
- Como “corrigir preview” e “apagar dados” são coisas diferentes, vou separar:
  - “Preview limpo” = só bugfix visual, sem apagar nada
  - “Resetar site” = ação explícita e destrutiva
- A ação de reset poderá:
  - limpar `photographer_site` para defaults seguros
  - remover todas as `site_pages`
  - opcionalmente recriar apenas a Home com o template atual
- Isso exige mudança real no banco via migration/implementação controlada.

5. UX de segurança para limpeza
- Adicionar modal de confirmação forte:
  - explicar exatamente o que será apagado
  - opção “resetar apenas conteúdo e páginas”
  - opção de manter branding global, se desejado
- Evita apagar trabalho por engano.

Arquivos que devo ajustar
- `src/components/website-editor/TemplatePreviewModal.tsx`
- `src/pages/dashboard/WebsiteSettings.tsx`
- `src/pages/store/StorePage.tsx`
- possivelmente `src/pages/store/SiteSubPage.tsx`
- possivelmente `src/components/store/PublicSiteRenderer.tsx`
- se aprovar reset real: migration + ação no dashboard/editor para limpar `photographer_site` e `site_pages`

Resultado esperado
- Ao abrir preview de template, ele aparece limpo, sem headline/logo/cores/páginas antigas contaminando a visualização.
- Ao clicar em “Open Full”, o comportamento bate com o modal.
- Se você quiser, também deixamos um botão real de “Resetar site” para remover o legado definitivamente, em vez de só esconder no preview.

Detalhe técnico
- A causa raiz não é cache: é acoplamento do preview aos dados persistidos atuais (`photographer_site` + `site_pages`).
- O fix correto é separar “template preview state” de “live site state”.
