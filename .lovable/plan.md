
## Problema

O `DashboardHeader.tsx` importa o `HelpAssistantPanel` mas:
1. Não há estado `assistantOpen` declarado
2. Não há botão Sparkles no JSX para abrir o painel
3. O componente `<HelpAssistantPanel>` não está renderizado

## Correção

Arquivo: `src/components/dashboard/DashboardHeader.tsx`

**3 mudanças cirúrgicas:**

1. Adicionar `const [assistantOpen, setAssistantOpen] = useState(false);` junto com os outros estados (linha 28)

2. Adicionar o botão Sparkles no bloco `<div className="flex items-center gap-1">` antes do HelpCircle (entre linha 104–105):
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={() => setAssistantOpen(true)}
      className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
    >
      <Sparkles size={15} />
    </button>
  </TooltipTrigger>
  <TooltipContent side="bottom">Davions Assistant</TooltipContent>
</Tooltip>
```

3. Renderizar o painel junto com o `BugReportDialog` no final (linha 130):
```tsx
<HelpAssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
```

Apenas 1 arquivo, 3 linhas adicionadas.
