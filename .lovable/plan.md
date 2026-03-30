

## Mostrar assinatura completa na lista (com imagem)

### Problema
A preview da assinatura na lista usa `line-clamp-2`, `text-[11px]` e `max-h-8` nas imagens — isso trunca o texto e esconde a imagem.

### Correção
**Arquivo:** `src/components/admin/AdminEmailManager.tsx` — linha 1657

Trocar as classes CSS para exibir o conteúdo completo:

```tsx
// De:
<div className="text-[11px] text-muted-foreground line-clamp-2 [&_img]:inline [&_img]:max-h-8 [&_img]:align-middle" dangerouslySetInnerHTML={{ __html: a.conteudo }} />

// Para:
<div className="text-xs text-muted-foreground mt-1 [&_img]:max-w-[200px] [&_img]:h-auto [&_img]:block [&_img]:mt-1" dangerouslySetInnerHTML={{ __html: a.conteudo }} />
```

**Mudanças:**
- Remove `line-clamp-2` → texto completo visível
- Remove `max-h-8` das imagens → imagem aparece em tamanho proporcional (max 200px largura)
- `[&_img]:block` → imagem em linha própria, não inline cortada
- Texto de `11px` para `text-xs` (12px) para legibilidade

