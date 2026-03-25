
## Fix: scroll causado por foco nativo do browser no `<button>`

### Causa raiz
O browser, ao clicar num `<button>`, coloca foco nele. Quando o conteúdo expandido é inserido no DOM, o browser tenta manter o botão visível e faz scroll para ele — que agora está "acima" do novo conteúdo, mas o cálculo do viewport o empurra para cima, fazendo parecer que scrollou até o final.

Chamadas anteriores de `.blur()` não funcionaram porque eram feitas *depois* do `setExpanded`, ou seja, depois do re-render com o conteúdo já expandido.

### Fix correto
Chamar `e.currentTarget.blur()` **antes** do `setExpanded`. Assim o foco é liberado antes do React inserir o conteúdo no DOM, e o browser não tem motivo para reposicionar o scroll.

```tsx
onClick={(e) => {
  e.currentTarget.blur(); // libera foco ANTES do re-render
  setExpanded(isOpen ? null : report.id);
}}
```

### Arquivo
- `src/pages/admin/AdminBugReports.tsx` — linha 165–167
