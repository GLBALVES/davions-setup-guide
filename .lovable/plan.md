
## Bug: Scroll indesejado ao expandir item

### Causa raiz

O elemento que aciona a expansão é um `<button>`. Quando um `<button>` recebe foco via clique, o browser nativo executa `scrollIntoView` automaticamente para garantir que o elemento focado fique visível — isso causa o scroll para o próximo item que estava parcialmente fora da tela ou alinhado na borda.

### Solução

Adicionar `onFocus={(e) => e.preventDefault()}` **não** resolve. A abordagem correta é chamar `e.currentTarget.blur()` no handler de clique, logo após o toggle de expansão. Isso remove o foco do botão imediatamente, impedindo o browser de fazer scroll automático.

Alternativa mais limpa: usar `scroll-mt-0` ou `preventScroll` via `{ preventScroll: true }` no foco — mas o mais direto é chamar `blur()` no `onClick`.

### Arquivo a editar

**`src/pages/admin/AdminBugReports.tsx`** — linha 165:

```tsx
// Antes
onClick={() => setExpanded(isOpen ? null : report.id)}

// Depois
onClick={(e) => {
  setExpanded(isOpen ? null : report.id);
  (e.currentTarget as HTMLButtonElement).blur();
}}
```

Isso remove o foco do botão após o clique, evitando o comportamento nativo de scroll-into-focus do browser.
