

## Correção: Imagem não aparece ao editar assinatura

### Problema identificado
O `useEffect` que sincroniza o conteúdo HTML no editor (linha 980-985) depende de `modalAssinaturaAberto`, mas o `sigEditorRef.current` ainda não existe no DOM nesse momento porque o Dialog ainda está montando. Resultado: o editor abre vazio mesmo tendo conteúdo salvo.

A assinatura **é salva corretamente** no banco (confirmado pelo network response com o HTML + imagem). O problema é apenas na **exibição ao reabrir para edição**.

### Correção

**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

1. **Substituir o `useEffect`** de sincronização (linhas 979-985) por um `useEffect` que usa `requestAnimationFrame` ou um pequeno `setTimeout` para garantir que o DOM do Dialog já montou antes de setar o `innerHTML`:

```typescript
useEffect(() => {
  if (modalAssinaturaAberto && formAssinatura.conteudo) {
    const timer = requestAnimationFrame(() => {
      if (sigEditorRef.current) {
        sigEditorRef.current.innerHTML = formAssinatura.conteudo;
      }
    });
    return () => cancelAnimationFrame(timer);
  }
}, [modalAssinaturaAberto, formAssinatura.conteudo]);
```

2. **Adicionar callback ref** no `div contentEditable` como fallback — quando o ref é atribuído, se o modal está aberto e há conteúdo, injeta o HTML:

```typescript
// No div contentEditable, trocar ref={sigEditorRef} por:
ref={(el) => {
  sigEditorRef.current = el;
  if (el && modalAssinaturaAberto && formAssinatura.conteudo && !el.innerHTML.trim()) {
    el.innerHTML = formAssinatura.conteudo;
  }
}}
```

Isso garante que mesmo se o `useEffect` rodar antes do DOM, o callback ref preencherá o editor assim que ele montar.

### Resultado
Ao clicar em editar uma assinatura, o editor exibirá o conteúdo completo incluindo imagens formatadas.

