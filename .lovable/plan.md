Vou corrigir isso diretamente no editor, sem depender de cache ou de componentes antigos.

Plano:

1. Garantir que o editor principal use os controles de layout atuais
   - Adicionar o botão de layout dentro do toolbar que realmente está sendo usado em `PreviewRenderer.tsx`.
   - Hoje existe um `BlockToolbar.tsx` com layout, mas o canvas principal usa um `FloatingBlockToolbar` próprio, que não recebeu esse controle.

2. Adicionar seletor de layout na sidebar do bloco
   - Importar `BLOCK_VARIANTS` no `BlockSettingsPanel.tsx`.
   - Mostrar a seção “Layout” no topo das configurações quando o bloco selecionado tiver variantes.
   - Para FAQ, aparecerão as opções:
     - Chevron / angle down-up
     - Plus
     - Two Columns

3. Corrigir a troca de layout
   - Ao clicar numa opção, salvar `props.variant` no bloco selecionado.
   - Usar o valor atual ou o layout padrão quando `variant` ainda não existir, para blocos antigos também exibirem o estado correto.

4. Melhorar compatibilidade com cache/estado antigo
   - Garantir que o FAQ antigo sem `variant` continue funcionando como layout Chevron.
   - Opcionalmente, ajustar o criador de novos blocos FAQ para já criar `variant: "chevron"`, evitando inconsistência visual.

Arquivos envolvidos:
- `src/components/website-editor/PreviewRenderer.tsx`
- `src/components/website-editor/BlockSettingsPanel.tsx`
- `src/components/website-editor/page-templates.ts`